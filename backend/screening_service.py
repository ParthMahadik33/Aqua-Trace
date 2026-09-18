import os
import json
import logging
import threading
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

from config import (
    SCREENING_ZONES,
    SCREENING_INTERVAL_SEC,
    SCREENING_OVERLAP_HOURS,
    SCREENING_INITIAL_LOOKBACK_DAYS,
    SCREENING_MAX_PAGES,
    SCREENING_PAGE_LIMIT,
    CHECKPOINTS_FILE_PATH,
)
from sentinel_service import Sentinel1CatalogueService
from acquisition_registry import AcquisitionRegistry
from quality_gate import QualityGate
from ai_triage_adapter import DevelopmentAITriageAdapter, BaseAITriageAdapter
from screening_policy import ScreeningPolicy, ScreeningDecision
from incident_store import IncidentStore

logger = logging.getLogger("ScreeningWatcher")


class ScreeningService:
    """
    Autonomous Sentinel-1 Acquisition Watcher and Quality Screening Engine.
    Periodically reconciles Copernicus STAC catalogue against configured monitoring zones,
    enforces checkpoint progression, upserts acquisitions idempotently, evaluates QualityGate,
    runs AI triage adapter, applies screening policy, and automatically persists incidents.
    """

    def __init__(
        self,
        catalogue_service: Optional[Sentinel1CatalogueService] = None,
        acquisition_registry: Optional[AcquisitionRegistry] = None,
        quality_gate: Optional[QualityGate] = None,
        triage_adapter: Optional[BaseAITriageAdapter] = None,
        screening_policy: Optional[ScreeningPolicy] = None,
        incident_store: Optional[IncidentStore] = None,
        zones: Optional[Dict[str, Dict[str, Any]]] = None,
        checkpoints_path: Optional[str] = None,
        interval_sec: float = SCREENING_INTERVAL_SEC,
        overlap_hours: float = SCREENING_OVERLAP_HOURS,
        initial_lookback_days: int = SCREENING_INITIAL_LOOKBACK_DAYS,
        max_pages: int = SCREENING_MAX_PAGES,
        page_limit: int = SCREENING_PAGE_LIMIT,
    ):
        self.catalogue_service = catalogue_service or Sentinel1CatalogueService()
        self.acquisition_registry = acquisition_registry or AcquisitionRegistry()
        self.quality_gate = quality_gate or QualityGate()
        self.triage_adapter = triage_adapter or DevelopmentAITriageAdapter()
        self.screening_policy = screening_policy or ScreeningPolicy()
        self.incident_store = incident_store or IncidentStore()
        self.zones = zones if zones is not None else dict(SCREENING_ZONES)
        self.checkpoints_path = Path(checkpoints_path or CHECKPOINTS_FILE_PATH).resolve()

        self.interval_sec = max(10.0, float(interval_sec))
        self.overlap_hours = max(0.0, float(overlap_hours))
        self.initial_lookback_days = max(1, int(initial_lookback_days))
        self.max_pages = max(1, int(max_pages))
        self.page_limit = max(1, int(page_limit))

        # Checkpoints state
        self._checkpoints_lock = threading.RLock()
        self._cycle_lock = threading.Lock()
        self.checkpoints: Dict[str, str] = {}  # zone_id -> ISO 8601 timestamp
        self._load_checkpoints()

        # Telemetry & Status State
        self.last_run_started: Optional[str] = None
        self.last_run_completed: Optional[str] = None
        self.last_successful_reconciliation: Optional[str] = None
        self.last_error: Optional[str] = None
        self.last_run_zones_checked: List[str] = []
        self.last_run_discovered: int = 0
        self.last_run_new: int = 0
        self.last_run_duplicates: int = 0
        self.last_run_passed_quality: int = 0
        self.last_run_rejected_quality: int = 0
        self.last_run_triage_candidates: int = 0
        self.last_run_incidents_created: int = 0
        self.last_incident_created: Optional[str] = None

        # Background Worker State
        self._stop_event = threading.Event()
        self._worker_thread: Optional[threading.Thread] = None
        self.is_running: bool = False

    def _get_utc_now_iso(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    def _load_checkpoints(self) -> None:
        """Loads persistent checkpoints from disk or initializes safely."""
        with self._checkpoints_lock:
            self.checkpoints.clear()
            if not self.checkpoints_path.exists():
                return

            try:
                with open(self.checkpoints_path, "r", encoding="utf-8") as f:
                    content = f.read().strip()
                if content:
                    data = json.loads(content)
                    if isinstance(data, dict):
                        self.checkpoints = data.get("checkpoints", {})
                        logger.info("Loaded checkpoints for %d zone(s) from %s", len(self.checkpoints), self.checkpoints_path)
            except Exception as e:
                logger.warning("Could not read checkpoints file at %s (%s). Starting with fresh checkpoints.", self.checkpoints_path, e)
                self.checkpoints = {}

    def _save_checkpoints(self) -> None:
        """Safely and atomically writes checkpoints to disk."""
        with self._checkpoints_lock:
            try:
                parent = self.checkpoints_path.parent
                if not parent.exists():
                    parent.mkdir(parents=True, exist_ok=True)

                payload = {
                    "version": 1,
                    "updated_at": self._get_utc_now_iso(),
                    "checkpoints": self.checkpoints,
                }
                temp_path = self.checkpoints_path.with_name(f"{self.checkpoints_path.name}.tmp")
                with open(temp_path, "w", encoding="utf-8") as f:
                    json.dump(payload, f, indent=2)
                    f.flush()
                    os.fsync(f.fileno())

                os.replace(temp_path, self.checkpoints_path)
            except Exception as e:
                logger.error("Failed to persist checkpoints to %s: %s", self.checkpoints_path, e)

    def get_zone_checkpoint(self, zone_id: str) -> Optional[str]:
        with self._checkpoints_lock:
            return self.checkpoints.get(zone_id)

    def set_zone_checkpoint(self, zone_id: str, timestamp_str: str) -> None:
        with self._checkpoints_lock:
            self.checkpoints[zone_id] = timestamp_str
            self._save_checkpoints()

    def reset_checkpoints(self, zone_id: Optional[str] = None) -> None:
        with self._checkpoints_lock:
            if zone_id:
                self.checkpoints.pop(zone_id, None)
            else:
                self.checkpoints.clear()
            self._save_checkpoints()
            logger.info("Checkpoints reset for zone=%s", zone_id or "ALL")

    def _parse_iso_utc(self, ts_str: str) -> datetime:
        clean = ts_str.replace("Z", "+00:00")
        return datetime.fromisoformat(clean)

    def reconcile_zone(
        self,
        zone_id: str,
        force_lookback_days: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Executes an autonomous reconciliation cycle for a specific monitoring zone.
        Only advances the zone checkpoint upon successful catalogue query and pagination.
        """
        zone = self.zones.get(zone_id)
        if not zone or not zone.get("enabled", True):
            return {
                "success": False,
                "zone_id": zone_id,
                "error": f"Zone '{zone_id}' not found or disabled in configuration.",
            }

        now_utc = datetime.now(timezone.utc)
        checkpoint_iso = self.get_zone_checkpoint(zone_id)

        # Determine start time window
        if force_lookback_days is not None and force_lookback_days > 0:
            start_time = now_utc - timedelta(days=force_lookback_days)
        elif checkpoint_iso:
            try:
                cp_dt = self._parse_iso_utc(checkpoint_iso)
                # Apply configurable overlap window to prevent edge dropouts
                start_time = cp_dt - timedelta(hours=self.overlap_hours)
            except Exception as parse_err:
                logger.warning("Malformed checkpoint timestamp '%s' for zone %s: %s. Using initial lookback.", checkpoint_iso, zone_id, parse_err)
                start_time = now_utc - timedelta(days=self.initial_lookback_days)
        else:
            start_time = now_utc - timedelta(days=self.initial_lookback_days)

        # Sanity bound: start_time cannot be in the future
        if start_time >= now_utc:
            start_time = now_utc - timedelta(hours=1)

        datetime_range = f"{start_time.strftime('%Y-%m-%dT%H:%M:%SZ')}/{now_utc.strftime('%Y-%m-%dT%H:%M:%SZ')}"

        logger.info("[SCREENING] reconciliation started zone=%s range=%s", zone_id, datetime_range)

        # Execute STAC query with pagination
        search_res = self.catalogue_service.search_sentinel1_grd(
            bbox=zone["bbox"],
            datetime_range=datetime_range,
            limit=self.page_limit,
            max_pages=self.max_pages,
        )

        if not search_res.get("success"):
            err_msg = search_res.get("error") or "Catalogue search failed without explicit error message"
            self.last_error = f"Zone {zone_id}: {err_msg}"
            logger.error("[SCREENING] zone=%s search failed: %s. Checkpoint preserved.", zone_id, err_msg)
            # CRITICAL: Do NOT advance checkpoint on query failure
            return {
                "success": False,
                "zone_id": zone_id,
                "error": err_msg,
                "checkpoint_advanced": False,
            }

        features = search_res.get("features", [])
        discovered_count = len(features)
        logger.info("[SCREENING] zone=%s products_found=%d", zone_id, discovered_count)

        zone_new = 0
        zone_duplicates = 0
        zone_passed = 0
        zone_rejected = 0
        zone_triage_candidates = 0
        zone_incidents_created = 0
        zone_failed_items = 0

        for feat in features:
            try:
                prod_id = feat.get("id")
                if not prod_id:
                    continue

                props = feat.get("properties", {})
                acq_time = props.get("datetime") or now_utc.isoformat()
                bbox = feat.get("bbox") or []
                geometry = feat.get("geometry")
                platform = (
                    props.get("platform")
                    or props.get("sat:platform_international_designator")
                    or props.get("constellation")
                    or "Sentinel-1"
                )
                instrument_mode = props.get("sar:instrument_mode") or "IW"
                orbit_direction = props.get("sat:orbit_state") or props.get("orbitState") or "ascending"
                polarization = props.get("sar:polarizations") or props.get("polarization") or ["VV", "VH"]
                resolution = props.get("s1:resolution") or "10m"

                # 1. Register under initial DISCOVERED state
                raw_record = {
                    "product_id": prod_id,
                    "zone_id": zone_id,
                    "acquisition_time_utc": acq_time,
                    "bbox": bbox,
                    "footprint_geojson": geometry,
                    "platform": platform,
                    "instrument_mode": instrument_mode,
                    "orbit_direction": orbit_direction,
                    "polarization": polarization,
                    "resolution": resolution,
                    "status": "DISCOVERED",
                }

                registered_rec, is_new = self.acquisition_registry.register(raw_record)
                if is_new:
                    zone_new += 1
                    logger.info("[SCREENING] product=%s discovered", prod_id)
                else:
                    zone_duplicates += 1

                # 2. Advance to SCREENING and evaluate QualityGate
                quality_res = self.quality_gate.evaluate(
                    registered_rec,
                    zone_bbox=zone["bbox"],
                    wind_data=None,  # No fabricated wind; remains UNAVAILABLE without rejection
                )

                if not quality_res.get("passed"):
                    final_status = "REJECTED_QUALITY"
                    zone_rejected += 1
                    logger.info("[SCREENING] product=%s quality=REJECT reasons=%s", prod_id, quality_res.get("reasons"))
                    self.acquisition_registry.register({
                        "product_id": prod_id,
                        "status": final_status,
                        "quality_result": quality_res,
                        "quality_reasons": quality_res.get("reasons", []),
                    })
                else:
                    zone_passed += 1
                    logger.info("[SCREENING] product=%s quality=PASS", prod_id)

                    # 3. AI Triage (only reached by quality-passed acquisitions)
                    logger.info("[TRIAGE] product=%s", prod_id)
                    triage_res = self.triage_adapter.triage(registered_rec)
                    triage_status = triage_res.get("status")
                    logger.info("[TRIAGE] status=%s product=%s", triage_status, prod_id)

                    # 4. Screening Policy
                    policy_eval = self.screening_policy.evaluate(
                        triage_result=triage_res,
                        quality_result=quality_res,
                    )
                    decision = policy_eval.get("decision", ScreeningDecision.MONITOR.value)
                    decision_reason = policy_eval.get("reason")

                    # 5. Automatic Incident Creation if REVIEW or PRIORITY
                    incident_id = None
                    if decision in (ScreeningDecision.REVIEW.value, ScreeningDecision.PRIORITY.value):
                        zone_triage_candidates += 1
                        incident_rec, inc_created = self.incident_store.create_incident(
                            acquisition_record=registered_rec,
                            triage_result=triage_res,
                            quality_result=quality_res,
                        )
                        incident_id = incident_rec.get("incident_id")
                        if inc_created:
                            zone_incidents_created += 1
                            self.last_incident_created = incident_id
                            logger.info("[INCIDENT] created=%s acquisition=%s product=%s", incident_id, registered_rec.get("id"), prod_id)
                        else:
                            logger.info("[INCIDENT] duplicate=%s acquisition=%s product=%s", incident_id, registered_rec.get("id"), prod_id)

                        final_status = "CANDIDATE"
                    else:
                        final_status = "CLEAN"

                    # 6. Update registry with triage and incident metadata
                    update_payload = {
                        "product_id": prod_id,
                        "status": final_status,
                        "quality_result": quality_res,
                        "quality_reasons": quality_res.get("reasons", []),
                        "triage_result": triage_res,
                        "screening_decision": decision,
                        "screening_reason": decision_reason,
                    }
                    if incident_id:
                        update_payload["incident_id"] = incident_id
                    self.acquisition_registry.register(update_payload)

            except Exception as item_err:
                zone_failed_items += 1
                logger.error("[SCREENING] Error processing acquisition %s: %s", feat.get("id"), item_err)
                # Ensure failure on one product does not crash processing for the remaining products

        # 7. Checkpoint advancement only after successful execution
        new_checkpoint_iso = now_utc.strftime("%Y-%m-%dT%H:%M:%SZ")
        self.set_zone_checkpoint(zone_id, new_checkpoint_iso)
        logger.info("[SCREENING] zone=%s checkpoint updated to %s", zone_id, new_checkpoint_iso)

        return {
            "success": True,
            "zone_id": zone_id,
            "datetime_range": datetime_range,
            "discovered": discovered_count,
            "new": zone_new,
            "duplicates": zone_duplicates,
            "passed_quality": zone_passed,
            "rejected_quality": zone_rejected,
            "triage_candidates": zone_triage_candidates,
            "incidents_created": zone_incidents_created,
            "failed_items": zone_failed_items,
            "checkpoint": new_checkpoint_iso,
            "checkpoint_advanced": True,
        }

    def run_reconciliation_cycle(
        self,
        zone_id: Optional[str] = None,
        force_lookback_days: Optional[int] = None,
        reset_checkpoints: bool = False,
    ) -> Dict[str, Any]:
        """
        Executes a complete reconciliation cycle across target or all enabled zones.
        Thread-safe against concurrent manual and automated trigger collisions.
        """
        with self._cycle_lock:
            start_iso = self._get_utc_now_iso()
            self.last_run_started = start_iso
            logger.info("[SCREENING] reconciliation cycle initiated (target_zone=%s, force_lookback=%s)", zone_id or "ALL", force_lookback_days)

            if reset_checkpoints:
                self.reset_checkpoints(zone_id)

            if zone_id:
                if zone_id not in self.zones:
                    err_msg = f"Unknown zone_id '{zone_id}'. Must be one of: {list(self.zones.keys())}"
                    self.last_error = err_msg
                    return {"success": False, "error": err_msg}
                target_zones = [self.zones[zone_id]]
            else:
                # Process enabled zones sorted by priority ascending (1 highest)
                target_zones = [
                    z for z in self.zones.values()
                    if z.get("enabled", True)
                ]
                target_zones.sort(key=lambda z: z.get("priority", 99))

            total_discovered = 0
            total_new = 0
            total_duplicates = 0
            total_passed = 0
            total_rejected = 0
            total_triage_candidates = 0
            total_incidents_created = 0
            total_failed_items = 0
            zones_checked = []
            zone_errors = {}

            for z in target_zones:
                zid = z["zone_id"]
                zones_checked.append(zid)
                try:
                    res = self.reconcile_zone(zid, force_lookback_days=force_lookback_days)
                    if res.get("success"):
                        total_discovered += res.get("discovered", 0)
                        total_new += res.get("new", 0)
                        total_duplicates += res.get("duplicates", 0)
                        total_passed += res.get("passed_quality", 0)
                        total_rejected += res.get("rejected_quality", 0)
                        total_triage_candidates += res.get("triage_candidates", 0)
                        total_incidents_created += res.get("incidents_created", 0)
                        total_failed_items += res.get("failed_items", 0)
                    else:
                        zone_errors[zid] = res.get("error", "Unknown zone reconciliation error")
                except Exception as zone_exc:
                    err = str(zone_exc)
                    logger.error("[SCREENING] Unexpected exception in zone %s: %s", zid, err)
                    zone_errors[zid] = err

            end_iso = self._get_utc_now_iso()
            self.last_run_completed = end_iso
            self.last_run_zones_checked = zones_checked
            self.last_run_discovered = total_discovered
            self.last_run_new = total_new
            self.last_run_duplicates = total_duplicates
            self.last_run_passed_quality = total_passed
            self.last_run_rejected_quality = total_rejected
            self.last_run_triage_candidates = total_triage_candidates
            self.last_run_incidents_created = total_incidents_created

            if not zone_errors:
                self.last_successful_reconciliation = end_iso
                self.last_error = None
            else:
                self.last_error = "; ".join(f"{k}: {v}" for k, v in zone_errors.items())

            logger.info(
                "[SCREENING] reconciliation completed discovered=%d new=%d duplicates=%d passed=%d rejected=%d triage_candidates=%d incidents_created=%d failed_items=%d",
                total_discovered,
                total_new,
                total_duplicates,
                total_passed,
                total_rejected,
                total_triage_candidates,
                total_incidents_created,
                total_failed_items,
            )

            return {
                "success": len(zone_errors) == 0,
                "started_at": start_iso,
                "completed_at": end_iso,
                "zones_checked": zones_checked,
                "discovered": total_discovered,
                "new": total_new,
                "duplicates": total_duplicates,
                "passed_quality": total_passed,
                "rejected_quality": total_rejected,
                "triage_candidates": total_triage_candidates,
                "incidents_created": total_incidents_created,
                "last_incident_created": self.last_incident_created,
                "failed": total_failed_items,
                "zone_errors": zone_errors if zone_errors else None,
            }

    def get_status(self) -> Dict[str, Any]:
        """Returns structured observability telemetry for the screening service."""
        with self._checkpoints_lock:
            checkpoints_snapshot = dict(self.checkpoints)

        return {
            "running": self.is_running,
            "last_run_started": self.last_run_started,
            "last_run_completed": self.last_run_completed,
            "last_successful_reconciliation": self.last_successful_reconciliation,
            "zones_checked": self.last_run_zones_checked,
            "products_discovered_last_run": self.last_run_discovered,
            "products_new_last_run": self.last_run_new,
            "products_rejected_last_run": self.last_run_rejected_quality,
            "products_passed_last_run": self.last_run_passed_quality,
            "triage_candidates_last_run": self.last_run_triage_candidates,
            "incidents_created_last_run": self.last_run_incidents_created,
            "last_incident_created": self.last_incident_created,
            "current_checkpoint": checkpoints_snapshot,
            "last_error": self.last_error,
            "interval_sec": self.interval_sec,
            "enabled_zones": [z for z, v in self.zones.items() if v.get("enabled", True)],
        }

    def _worker_loop(self) -> None:
        """Background thread worker loop executing periodic reconciliation safely."""
        logger.info("[SCREENING] Background screening worker loop started (interval=%.1fs)", self.interval_sec)
        while not self._stop_event.is_set():
            try:
                self.run_reconciliation_cycle()
            except Exception as e:
                self.last_error = f"Unhandled worker exception: {e}"
                logger.error("[SCREENING] Unhandled exception in background worker loop: %s", e)

            # Wait for interval or until stopped
            if self._stop_event.wait(self.interval_sec):
                break

        logger.info("[SCREENING] Background screening worker loop terminated cleanly.")

    def start(self) -> bool:
        """Starts the background screening worker thread safely."""
        if self.is_running:
            return False

        self._stop_event.clear()
        self._worker_thread = threading.Thread(
            target=self._worker_loop,
            name="AquaTraceScreeningWorker",
            daemon=True,
        )
        self._worker_thread.start()
        self.is_running = True
        logger.info("ScreeningService background worker started.")
        return True

    def stop(self, timeout: float = 5.0) -> bool:
        """Stops the background screening worker thread gracefully."""
        if not self.is_running:
            return False

        self._stop_event.set()
        if self._worker_thread and self._worker_thread.is_alive():
            self._worker_thread.join(timeout=timeout)
        self.is_running = False
        logger.info("ScreeningService background worker stopped.")
        return True
