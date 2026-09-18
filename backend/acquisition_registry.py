import os
import json
import time
import uuid
import logging
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

from config import ACQUISITIONS_REGISTRY_PATH

logger = logging.getLogger("AcquisitionRegistry")


class AcquisitionRegistry:
    """
    Thread-safe, JSON-backed persistent registry for Sentinel-1 satellite acquisitions.
    Uses product_id as the canonical unique identity.
    """

    def __init__(self, storage_path: Optional[str] = None):
        self.storage_path = Path(storage_path or ACQUISITIONS_REGISTRY_PATH).resolve()
        self._lock = threading.RLock()
        self._records: Dict[str, Dict[str, Any]] = {}  # product_id -> record dict
        self._id_to_product_id: Dict[str, str] = {}    # id -> product_id
        self._load()

    def _get_utc_now_iso(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    def _ensure_dir_exists(self) -> None:
        parent = self.storage_path.parent
        if not parent.exists():
            parent.mkdir(parents=True, exist_ok=True)

    def _load(self) -> None:
        """Loads records from disk, handling missing or corrupt JSON files gracefully."""
        with self._lock:
            self._records.clear()
            self._id_to_product_id.clear()

            if not self.storage_path.exists():
                logger.info(
                    "Registry file does not exist at %s. Initializing empty registry.",
                    self.storage_path,
                )
                self._ensure_dir_exists()
                self._save()
                return

            try:
                with open(self.storage_path, "r", encoding="utf-8") as f:
                    content = f.read().strip()

                if not content:
                    logger.warning(
                        "Registry file at %s is empty. Initializing empty registry.",
                        self.storage_path,
                    )
                    self._save()
                    return

                data = json.loads(content)
                if not isinstance(data, dict) or "acquisitions" not in data:
                    raise ValueError("Registry JSON root must be an object with an 'acquisitions' array.")

                for item in data.get("acquisitions", []):
                    if not isinstance(item, dict):
                        continue
                    prod_id = item.get("product_id")
                    if prod_id:
                        rec = self._normalize_record(item)
                        self._records[prod_id] = rec
                        self._id_to_product_id[rec["id"]] = prod_id

                logger.info(
                    "Loaded %d acquisitions from registry at %s",
                    len(self._records),
                    self.storage_path,
                )

            except Exception as e:
                logger.error(
                    "Failed to load or parse acquisition registry at %s: %s. "
                    "Creating backup and initializing empty registry.",
                    self.storage_path,
                    e,
                )
                try:
                    corrupt_backup = self.storage_path.with_name(
                        f"{self.storage_path.name}.corrupt.{int(time.time())}"
                    )
                    if self.storage_path.exists():
                        self.storage_path.rename(corrupt_backup)
                        logger.warning("Moved corrupted registry to: %s", corrupt_backup)
                except Exception as backup_err:
                    logger.error("Failed to backup corrupted registry: %s", backup_err)

                self._records.clear()
                self._id_to_product_id.clear()
                self._save()

    def _save(self) -> None:
        """
        Safely and atomically writes registry records to disk.
        Writes to a temporary file first and replaces the target file.
        """
        with self._lock:
            self._ensure_dir_exists()
            payload = {
                "version": 1,
                "updated_at": self._get_utc_now_iso(),
                "count": len(self._records),
                "acquisitions": list(self._records.values()),
            }

            temp_path = self.storage_path.with_name(f"{self.storage_path.name}.tmp")
            try:
                with open(temp_path, "w", encoding="utf-8") as f:
                    json.dump(payload, f, indent=2, ensure_ascii=False)
                    f.flush()
                    os.fsync(f.fileno())

                os.replace(temp_path, self.storage_path)
            except Exception as e:
                logger.error("Failed to safely write registry to %s: %s", self.storage_path, e)
                if temp_path.exists():
                    try:
                        temp_path.unlink()
                    except OSError:
                        pass
                raise

    def _normalize_record(self, raw: Dict[str, Any], is_update: bool = False, existing: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Ensures all required fields are present with sensible types and defaults."""
        now = self._get_utc_now_iso()

        if is_update and existing:
            rec = dict(existing)
            # Update fields passed in raw
            for key, val in raw.items():
                if val is not None or key not in rec:
                    rec[key] = val
            rec["updated_at"] = now
            return rec

        rec_id = str(raw.get("id") or f"acq_{uuid.uuid4().hex[:12]}")
        product_id = str(raw.get("product_id") or "").strip()
        if not product_id:
            raise ValueError("Record must contain a non-empty 'product_id'.")

        created_at = raw.get("created_at") or now
        updated_at = raw.get("updated_at") or now

        return {
            "id": rec_id,
            "product_id": product_id,
            "zone_id": raw.get("zone_id") or "UNASSIGNED",
            "acquisition_time_utc": raw.get("acquisition_time_utc") or raw.get("datetime") or now,
            "discovered_time_utc": raw.get("discovered_time_utc") or now,
            "availability_time_utc": raw.get("availability_time_utc"),
            "bbox": raw.get("bbox") or [],
            "footprint_geojson": raw.get("footprint_geojson") or raw.get("geometry"),
            "platform": raw.get("platform") or "Sentinel-1",
            "instrument_mode": raw.get("instrument_mode") or "IW",
            "orbit_direction": raw.get("orbit_direction") or "ascending",
            "polarization": raw.get("polarization") or ["VV", "VH"],
            "resolution": raw.get("resolution") or "10m",
            "status": raw.get("status") or "DISCOVERED",
            "quality_result": raw.get("quality_result"),
            "quality_reasons": raw.get("quality_reasons") or [],
            "screening_score": raw.get("screening_score"),
            "classification": raw.get("classification") or "UNSCREENED",
            "incident_id": raw.get("incident_id"),
            "model_version": raw.get("model_version"),
            "created_at": created_at,
            "updated_at": updated_at,
        }

    def register(self, record_data: Dict[str, Any]) -> Tuple[Dict[str, Any], bool]:
        """
        Registers a new acquisition record or updates an existing one if product_id already exists.
        Thread-safe.

        :return: (record_dict, is_newly_created: bool)
        """
        with self._lock:
            product_id = str(record_data.get("product_id") or "").strip()
            if not product_id:
                raise ValueError("Cannot register acquisition without a valid 'product_id'.")

            existing = self._records.get(product_id)
            if existing:
                # Update existing record in-place
                updated_record = self._normalize_record(record_data, is_update=True, existing=existing)
                self._records[product_id] = updated_record
                self._id_to_product_id[updated_record["id"]] = product_id
                self._save()
                logger.info("Updated existing acquisition record for product_id=%s", product_id)
                return dict(updated_record), False

            # Create new record
            new_record = self._normalize_record(record_data, is_update=False)
            self._records[product_id] = new_record
            self._id_to_product_id[new_record["id"]] = product_id
            self._save()
            logger.info("Registered new acquisition id=%s, product_id=%s", new_record["id"], product_id)
            return dict(new_record), True

    def get_by_id(self, acq_id: str) -> Optional[Dict[str, Any]]:
        """Lookup an acquisition by its internal id, falling back to product_id."""
        with self._lock:
            # Check id directly
            prod_id = self._id_to_product_id.get(acq_id)
            if prod_id and prod_id in self._records:
                return dict(self._records[prod_id])

            # Check if acq_id is itself a product_id
            if acq_id in self._records:
                return dict(self._records[acq_id])

            return None

    def get_by_product_id(self, product_id: str) -> Optional[Dict[str, Any]]:
        """Lookup an acquisition strictly by product_id."""
        with self._lock:
            rec = self._records.get(product_id)
            return dict(rec) if rec else None

    def list_all(
        self,
        zone_id: Optional[str] = None,
        status: Optional[str] = None,
        limit: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """
        Returns all registered acquisitions, with optional zone and status filtering.
        Sorted descending by acquisition_time_utc (newest first).
        """
        with self._lock:
            results = list(self._records.values())

            if zone_id:
                zone_id_clean = zone_id.strip().upper()
                results = [
                    r for r in results
                    if str(r.get("zone_id", "")).upper() == zone_id_clean
                ]

            if status:
                status_clean = status.strip().upper()
                results = [
                    r for r in results
                    if str(r.get("status", "")).upper() == status_clean
                ]

            # Sort descending by acquisition_time_utc (fallback created_at)
            results.sort(
                key=lambda r: (r.get("acquisition_time_utc") or r.get("created_at") or ""),
                reverse=True,
            )

            if limit and limit > 0:
                results = results[:limit]

            return [dict(r) for r in results]

    def count(self) -> int:
        with self._lock:
            return len(self._records)

    def clear(self) -> None:
        """Clears all records in memory and on disk. Primarily used for testing."""
        with self._lock:
            self._records.clear()
            self._id_to_product_id.clear()
            self._save()
