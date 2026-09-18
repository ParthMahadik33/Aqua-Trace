import os
import json
import time
import logging
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

from config import INCIDENTS_STORE_PATH

logger = logging.getLogger("IncidentStore")


class IncidentStore:
    """
    Thread-safe, JSON-backed persistent store for investigation incidents created
    from autonomous Sentinel-1 screening detections.
    """

    def __init__(self, storage_path: Optional[str] = None):
        self.storage_path = Path(storage_path or INCIDENTS_STORE_PATH).resolve()
        self._lock = threading.RLock()
        self._incidents: Dict[str, Dict[str, Any]] = {}  # incident_id -> incident record
        self._product_to_incident: Dict[str, str] = {}   # product_id -> incident_id
        self._acq_to_incident: Dict[str, str] = {}       # acquisition_id -> incident_id
        self._sequence_counter: int = 0
        self._load()

    def _get_utc_now_iso(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    def _ensure_dir_exists(self) -> None:
        parent = self.storage_path.parent
        if not parent.exists():
            parent.mkdir(parents=True, exist_ok=True)

    def _generate_incident_id(self) -> str:
        """Generates deterministic human-readable incident identifier, e.g. INC-2026-IND-001."""
        self._sequence_counter += 1
        year = datetime.now(timezone.utc).year
        return f"INC-{year}-IND-{self._sequence_counter:03d}"

    def _load(self) -> None:
        """Loads incidents from disk safely handling missing or malformed files."""
        with self._lock:
            self._incidents.clear()
            self._product_to_incident.clear()
            self._acq_to_incident.clear()
            self._sequence_counter = 0

            if not self.storage_path.exists():
                self._ensure_dir_exists()
                self._save()
                return

            try:
                with open(self.storage_path, "r", encoding="utf-8") as f:
                    content = f.read().strip()

                if not content:
                    self._save()
                    return

                data = json.loads(content)
                if not isinstance(data, dict) or "incidents" not in data:
                    raise ValueError("Incident store root must contain an 'incidents' list.")

                max_seq = 0
                for item in data.get("incidents", []):
                    if not isinstance(item, dict):
                        continue
                    inc_id = item.get("incident_id")
                    if inc_id:
                        self._incidents[inc_id] = item
                        prod_id = item.get("product_id")
                        acq_id = item.get("acquisition_id")
                        if prod_id:
                            self._product_to_incident[prod_id] = inc_id
                        if acq_id:
                            self._acq_to_incident[acq_id] = inc_id

                        # Extract sequence number if formatted as INC-YYYY-IND-XXX
                        try:
                            parts = inc_id.split("-")
                            if len(parts) >= 4 and parts[3].isdigit():
                                seq = int(parts[3])
                                if seq > max_seq:
                                    max_seq = seq
                        except Exception:
                            pass

                self._sequence_counter = max_seq
                logger.info("Loaded %d incident(s) from %s (sequence=%d)", len(self._incidents), self.storage_path, self._sequence_counter)

            except Exception as e:
                logger.error("Failed to load incidents from %s: %s. Re-initializing empty store.", self.storage_path, e)
                try:
                    corrupt_backup = self.storage_path.with_name(f"{self.storage_path.name}.corrupt.{int(time.time())}")
                    if self.storage_path.exists():
                        self.storage_path.rename(corrupt_backup)
                        logger.warning("Backing up corrupted incidents file to: %s", corrupt_backup)
                except Exception as backup_err:
                    logger.error("Failed to backup corrupted incidents file: %s", backup_err)

                self._incidents.clear()
                self._product_to_incident.clear()
                self._acq_to_incident.clear()
                self._sequence_counter = 0
                self._save()

    def _save(self) -> None:
        """Atomic write to disk using temporary file replacement."""
        with self._lock:
            self._ensure_dir_exists()
            payload = {
                "version": 1,
                "updated_at": self._get_utc_now_iso(),
                "count": len(self._incidents),
                "sequence_counter": self._sequence_counter,
                "incidents": list(self._incidents.values()),
            }
            temp_path = self.storage_path.with_name(f"{self.storage_path.name}.tmp")
            try:
                with open(temp_path, "w", encoding="utf-8") as f:
                    json.dump(payload, f, indent=2, ensure_ascii=False)
                    f.flush()
                    os.fsync(f.fileno())
                os.replace(temp_path, self.storage_path)
            except Exception as e:
                logger.error("Failed to safely write incidents to %s: %s", self.storage_path, e)
                if temp_path.exists():
                    try:
                        temp_path.unlink()
                    except OSError:
                        pass
                raise

    def create_incident(
        self,
        acquisition_record: Dict[str, Any],
        triage_result: Dict[str, Any],
        quality_result: Optional[Dict[str, Any]] = None,
        policy_decision: str = "REVIEW",
        **kwargs,
    ) -> Tuple[Dict[str, Any], bool]:
        """
        Creates a new incident record for an acquisition.
        If an incident already exists for this acquisition or product_id, returns it without duplicating.

        :return: (incident_dict, is_new: bool)
        """
        with self._lock:
            prod_id = acquisition_record.get("product_id")
            acq_id = acquisition_record.get("id")

            # Check if incident already exists for this product
            existing_id = self._product_to_incident.get(prod_id) or self._acq_to_incident.get(acq_id)
            if existing_id and existing_id in self._incidents:
                logger.info("[INCIDENT] duplicate=True existing=%s for product=%s", existing_id, prod_id)
                return dict(self._incidents[existing_id]), False

            inc_id = self._generate_incident_id()
            now = self._get_utc_now_iso()

            incident: Dict[str, Any] = {
                "incident_id": inc_id,
                "acquisition_id": acq_id,
                "product_id": prod_id,
                "zone_id": acquisition_record.get("zone_id") or "UNASSIGNED",
                "acquisition_time_utc": acquisition_record.get("acquisition_time_utc"),
                "platform": acquisition_record.get("platform"),
                "instrument_mode": acquisition_record.get("instrument_mode"),
                "footprint": acquisition_record.get("bbox") or [],
                "bbox": acquisition_record.get("bbox") or [],
                "footprint_geojson": acquisition_record.get("footprint_geojson"),
                "candidate_geometry": triage_result.get("candidate_geometry"),
                "candidate_area_km2": triage_result.get("candidate_area_km2"),
                "candidate_centroid": triage_result.get("candidate_centroid"),
                "triage_status": triage_result.get("status"),
                "triage_source": triage_result.get("source"),
                "triage_mode": triage_result.get("triage_mode", "DEVELOPMENT ADAPTER"),
                "triage_rationale": triage_result.get("rationale"),
                "quality_result": quality_result or acquisition_record.get("quality_result"),
                "policy_decision": policy_decision,
                "model_version": triage_result.get("model_version") or "adapter-v1",
                "created_at": now,
                "updated_at": now,
                "investigation_state": "NEW",
                "acknowledged_at": None,
                "notes": None,
            }

            self._incidents[inc_id] = incident
            if prod_id:
                self._product_to_incident[prod_id] = inc_id
            if acq_id:
                self._acq_to_incident[acq_id] = inc_id

            self._save()
            logger.info("[INCIDENT] created=%s acquisition=%s product=%s", inc_id, acq_id, prod_id)
            return dict(incident), True

    def get_by_id(self, incident_id: str) -> Optional[Dict[str, Any]]:
        """Lookup an incident by its incident_id."""
        with self._lock:
            inc = self._incidents.get(incident_id)
            return dict(inc) if inc else None

    def get_by_incident_id(self, incident_id: str) -> Optional[Dict[str, Any]]:
        """Alias for get_by_id."""
        return self.get_by_id(incident_id)

    def get_by_product_id(self, product_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            inc_id = self._product_to_incident.get(product_id)
            return dict(self._incidents[inc_id]) if inc_id and inc_id in self._incidents else None

    def get_by_acquisition_id(self, acq_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            inc_id = self._acq_to_incident.get(acq_id)
            return dict(self._incidents[inc_id]) if inc_id and inc_id in self._incidents else None

    def acknowledge(self, incident_id: str, notes: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Updates the incident investigation state to ACKNOWLEDGED."""
        return self.update_investigation_state(incident_id, "ACKNOWLEDGED", notes)

    def update_investigation_state(
        self,
        incident_id: str,
        new_state: str,
        notes: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Updates the incident investigation state atomically."""
        with self._lock:
            inc = self._incidents.get(incident_id)
            if not inc:
                return None
            inc["investigation_state"] = new_state.upper()
            inc["updated_at"] = self._get_utc_now_iso()
            if new_state.upper() == "ACKNOWLEDGED":
                inc["acknowledged_at"] = self._get_utc_now_iso()
            if notes:
                inc["notes"] = notes
            self._save()
            logger.info("[INCIDENT] updated_state=%s for incident=%s notes=%s", new_state, incident_id, notes)
            return dict(inc)

    def list_all(
        self,
        zone_id: Optional[str] = None,
        investigation_state: Optional[str] = None,
        limit: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        return self.list_incidents(zone_id=zone_id, investigation_state=investigation_state, limit=limit)

    def list_incidents(
        self,
        zone_id: Optional[str] = None,
        investigation_state: Optional[str] = None,
        triage_status: Optional[str] = None,
        limit: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """
        Returns all registered incidents, optionally filtered by zone_id, investigation_state, or triage_status.
        Sorted descending by created_at (newest first).
        """
        with self._lock:
            results = list(self._incidents.values())

            if zone_id:
                clean_zone = zone_id.strip().upper()
                results = [r for r in results if str(r.get("zone_id", "")).upper() == clean_zone]

            if investigation_state:
                clean_state = investigation_state.strip().upper()
                results = [r for r in results if str(r.get("investigation_state", "")).upper() == clean_state]

            if triage_status:
                clean_status = triage_status.strip().upper()
                results = [r for r in results if str(r.get("triage_status", "")).upper() == clean_status]

            results.sort(key=lambda r: r.get("created_at") or "", reverse=True)

            if limit and limit > 0:
                results = results[:limit]

            return [dict(r) for r in results]

    def count(self) -> int:
        with self._lock:
            return len(self._incidents)

    def clear(self) -> None:
        """Clears all records in memory and on disk. Primarily used for tests."""
        with self._lock:
            self._incidents.clear()
            self._product_to_incident.clear()
            self._acq_to_incident.clear()
            self._sequence_counter = 0
            self._save()
