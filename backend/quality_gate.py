import logging
from datetime import datetime
from typing import Dict, Any, List, Optional

from config import (
    SUPPORTED_SAR_COLLECTIONS,
    REQUIRED_SAR_POLARIZATIONS,
    ALLOWED_SAR_INSTRUMENT_MODES,
    SCREENING_MIN_WIND_MS,
    SCREENING_MAX_WIND_MS,
    MAX_NODATA_PERCENT,
    MIN_SPATIAL_SPAN_DEG,
)

logger = logging.getLogger("QualityGate")

STATUS_PASS = "PASS"
STATUS_REJECT = "REJECT"
STATUS_UNAVAILABLE = "UNAVAILABLE"


class QualityGate:
    """
    Pure, testable quality evaluation layer for Sentinel-1 acquisitions.
    Applies configurable operational screening rules to ensure acquisition data
    meets minimum geometric, radiometric, and contextual standards for oil spill screening.
    """

    def __init__(
        self,
        supported_collections: Optional[List[str]] = None,
        required_polarizations: Optional[List[str]] = None,
        allowed_modes: Optional[List[str]] = None,
        min_wind_ms: float = SCREENING_MIN_WIND_MS,
        max_wind_ms: float = SCREENING_MAX_WIND_MS,
        max_nodata_percent: float = MAX_NODATA_PERCENT,
        min_spatial_span_deg: float = MIN_SPATIAL_SPAN_DEG,
    ):
        self.supported_collections = (
            supported_collections if supported_collections is not None else SUPPORTED_SAR_COLLECTIONS
        )
        self.required_polarizations = (
            [p.upper() for p in required_polarizations]
            if required_polarizations is not None
            else REQUIRED_SAR_POLARIZATIONS
        )
        self.allowed_modes = (
            [m.upper() for m in allowed_modes]
            if allowed_modes is not None
            else ALLOWED_SAR_INSTRUMENT_MODES
        )
        self.min_wind_ms = float(min_wind_ms)
        self.max_wind_ms = float(max_wind_ms)
        self.max_nodata_percent = float(max_nodata_percent)
        self.min_spatial_span_deg = float(min_spatial_span_deg)

    def evaluate(
        self,
        acquisition_data: Dict[str, Any],
        zone_bbox: Optional[List[float]] = None,
        wind_data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Evaluates acquisition quality against operational screening gates.

        :param acquisition_data: STAC feature or normalized dictionary of acquisition metadata.
        :param zone_bbox: Optional target monitoring zone [min_lon, min_lat, max_lon, max_lat].
        :param wind_data: Optional dictionary containing observed or reanalysis wind, e.g. {"speed_ms": 6.5}.
                          If missing or None, wind is marked UNAVAILABLE and not rejected.
        :return: Structured evaluation dictionary with check details, pass/reject flags, and reasons.
        """
        checks: Dict[str, Dict[str, Any]] = {}
        reasons: List[str] = []

        # 1. Metadata Validation
        meta_ok, meta_detail, meta_err = self._check_metadata(acquisition_data)
        checks["metadata"] = {
            "status": STATUS_PASS if meta_ok else STATUS_REJECT,
            "detail": meta_detail,
        }
        if not meta_ok and meta_err:
            reasons.append(meta_err)

        # Extract normalized fields
        bbox = self._extract_bbox(acquisition_data)
        collection = str(acquisition_data.get("collection") or "sentinel-1-grd").strip().lower()
        instrument_mode = str(acquisition_data.get("instrument_mode") or "IW").strip().upper()
        polarization = self._extract_polarization_list(acquisition_data)

        # 2. Collection & Instrument Mode Check
        coll_ok, coll_detail, coll_err = self._check_collection(collection, instrument_mode)
        checks["collection"] = {
            "status": STATUS_PASS if coll_ok else STATUS_REJECT,
            "detail": coll_detail,
        }
        if not coll_ok and coll_err:
            reasons.append(coll_err)

        # 3. Polarization Check
        pol_ok, pol_detail, pol_err = self._check_polarization(polarization)
        checks["polarization"] = {
            "status": STATUS_PASS if pol_ok else STATUS_REJECT,
            "detail": pol_detail,
        }
        if not pol_ok and pol_err:
            reasons.append(pol_err)

        # 4. Spatial Coverage Span Check
        cov_ok, cov_detail, cov_err = self._check_spatial_coverage(bbox)
        checks["coverage"] = {
            "status": STATUS_PASS if cov_ok else STATUS_REJECT,
            "detail": cov_detail,
        }
        if not cov_ok and cov_err:
            reasons.append(cov_err)

        # 5. AOI / Monitoring Zone Overlap Check
        aoi_ok, aoi_detail, aoi_err = self._check_aoi_overlap(bbox, zone_bbox)
        checks["aoi_overlap"] = {
            "status": STATUS_PASS if aoi_ok else STATUS_REJECT,
            "detail": aoi_detail,
        }
        if not aoi_ok and aoi_err:
            reasons.append(aoi_err)

        # 6. Missing / Nodata Pixel Check
        nodata_status, nodata_detail, nodata_err = self._check_nodata(acquisition_data)
        checks["nodata"] = {
            "status": nodata_status,
            "detail": nodata_detail,
        }
        if nodata_status == STATUS_REJECT and nodata_err:
            reasons.append(nodata_err)

        # 7. Wind Suitability Check (Operational screening rule only if wind available)
        wind_status, wind_detail, wind_err = self._check_wind(wind_data)
        checks["wind"] = {
            "status": wind_status,
            "detail": wind_detail,
        }
        if wind_status == STATUS_REJECT and wind_err:
            reasons.append(wind_err)

        passed = len(reasons) == 0

        return {
            "passed": passed,
            "checks": checks,
            "reasons": reasons,
            "summary": (
                "Acquisition passed all operational quality checks."
                if passed
                else f"Acquisition rejected by quality gate ({len(reasons)} rule failure(s))."
            ),
        }

    def _extract_bbox(self, data: Dict[str, Any]) -> Optional[List[float]]:
        raw_bbox = data.get("bbox")
        if isinstance(raw_bbox, (list, tuple)) and len(raw_bbox) == 4:
            try:
                return [float(x) for x in raw_bbox]
            except (ValueError, TypeError):
                return None
        return None

    def _extract_polarization_list(self, data: Dict[str, Any]) -> List[str]:
        raw_pol = data.get("polarization") or data.get("polarizations")
        if isinstance(raw_pol, list):
            return [str(p).strip().upper() for p in raw_pol if str(p).strip()]
        if isinstance(raw_pol, str):
            # E.g. "VV", "VV+VH", "VV, VH"
            parts = raw_pol.replace("+", ",").replace("/", ",").split(",")
            return [p.strip().upper() for p in parts if p.strip()]
        return []

    def _check_metadata(self, data: Dict[str, Any]) -> tuple[bool, str, Optional[str]]:
        prod_id = str(data.get("product_id") or data.get("id") or "").strip()
        if not prod_id:
            return False, "Missing required product_id.", "Missing valid product_id in metadata."

        dt = data.get("acquisition_time_utc") or data.get("datetime")
        if not dt or not isinstance(dt, str) or len(dt) < 10:
            return False, "Missing or invalid acquisition timestamp.", "Missing valid acquisition_time_utc."

        bbox = self._extract_bbox(data)
        if not bbox:
            return False, "Missing or invalid bounding box coordinates.", "Invalid bbox: must be 4 numeric coordinates [min_lon, min_lat, max_lon, max_lat]."

        min_lon, min_lat, max_lon, max_lat = bbox
        if not (-180.0 <= min_lon <= 180.0 and -180.0 <= max_lon <= 180.0):
            return False, "Longitude coordinates out of WGS84 range [-180, 180].", f"Longitude coordinates out of range: {min_lon}, {max_lon}"
        if not (-90.0 <= min_lat <= 90.0 and -90.0 <= max_lat <= 90.0):
            return False, "Latitude coordinates out of WGS84 range [-90, 90].", f"Latitude coordinates out of range: {min_lat}, {max_lat}"
        if min_lon >= max_lon or min_lat >= max_lat:
            return False, "Bounding box coordinates inverted (min must be < max).", f"Inverted bbox coordinates: min_lon={min_lon} >= max_lon={max_lon} or min_lat={min_lat} >= max_lat={max_lat}"

        return True, f"Metadata verified for {prod_id} (timestamp: {dt}).", None

    def _check_collection(self, collection: str, mode: str) -> tuple[bool, str, Optional[str]]:
        coll_matched = any(c.lower() in collection for c in self.supported_collections)
        if not coll_matched:
            return (
                False,
                f"Collection '{collection}' is not in supported list: {self.supported_collections}",
                f"Unsupported SAR collection '{collection}'. Expected one of {self.supported_collections}.",
            )

        if mode and self.allowed_modes and mode not in self.allowed_modes:
            return (
                False,
                f"Instrument mode '{mode}' is not in allowed list: {self.allowed_modes}",
                f"Unsupported instrument mode '{mode}'. Expected one of {self.allowed_modes}.",
            )

        return True, f"Collection '{collection}' and mode '{mode}' are supported.", None

    def _check_polarization(self, polarizations: List[str]) -> tuple[bool, str, Optional[str]]:
        if not polarizations:
            return (
                False,
                "No polarization information found in acquisition metadata.",
                "Missing polarization metadata. VV polarization is required for capillary damping analysis.",
            )

        missing_required = [req for req in self.required_polarizations if req not in polarizations]
        if missing_required:
            return (
                False,
                f"Missing required co-polarization channel: {missing_required}. Present: {polarizations}.",
                f"Unsupported polarization: acquisition polarizations {polarizations} lack required {missing_required}.",
            )

        return True, f"Polarization check passed. Contains required co-polarization: {self.required_polarizations}.", None

    def _check_spatial_coverage(self, bbox: Optional[List[float]]) -> tuple[bool, str, Optional[str]]:
        if not bbox:
            return False, "No valid bbox available to evaluate coverage.", "Missing spatial bounding box."

        min_lon, min_lat, max_lon, max_lat = bbox
        span_lon = max_lon - min_lon
        span_lat = max_lat - min_lat

        if span_lon < self.min_spatial_span_deg or span_lat < self.min_spatial_span_deg:
            return (
                False,
                f"Spatial extent too small (lon span={span_lon:.4f}°, lat span={span_lat:.4f}° < {self.min_spatial_span_deg}°).",
                f"Insufficient spatial coverage: bounding box span ({span_lon:.3f}°x{span_lat:.3f}°) is below minimum threshold ({self.min_spatial_span_deg}°).",
            )

        return True, f"Spatial coverage verified: span {span_lon:.3f}° lon x {span_lat:.3f}° lat.", None

    def _check_aoi_overlap(self, bbox: Optional[List[float]], zone_bbox: Optional[List[float]]) -> tuple[bool, str, Optional[str]]:
        if not zone_bbox:
            return True, "No specific monitoring zone specified; global scene bounds accepted.", None

        if not bbox or len(bbox) != 4 or len(zone_bbox) != 4:
            return False, "Invalid bbox provided for AOI overlap evaluation.", "Malformed bounding box coordinates."

        # Compute 2D box intersection
        inter_min_lon = max(bbox[0], zone_bbox[0])
        inter_min_lat = max(bbox[1], zone_bbox[1])
        inter_max_lon = min(bbox[2], zone_bbox[2])
        inter_max_lat = min(bbox[3], zone_bbox[3])

        if inter_min_lon < inter_max_lon and inter_min_lat < inter_max_lat:
            overlap_lon = inter_max_lon - inter_min_lon
            overlap_lat = inter_max_lat - inter_min_lat
            return True, f"Acquisition intersects target zone (overlap span: {overlap_lon:.3f}° lon x {overlap_lat:.3f}° lat).", None

        return (
            False,
            f"Acquisition bbox {bbox} does not intersect monitoring zone {zone_bbox}.",
            "Zero spatial intersection between acquisition footprint and target monitoring zone.",
        )

    def _check_nodata(self, data: Dict[str, Any]) -> tuple[str, str, Optional[str]]:
        # Look for nodata percent or cloud cover if reported
        nodata_val = data.get("nodata_percent") or data.get("missing_pixel_percent")
        if nodata_val is None:
            # Not evaluated because information is not in STAC record
            return (
                STATUS_UNAVAILABLE,
                "Nodata / missing pixel statistics not provided in STAC metadata.",
                None,
            )

        try:
            val = float(nodata_val)
            if val <= self.max_nodata_percent:
                return (
                    STATUS_PASS,
                    f"Nodata fraction ({val:.1f}%) is within operational limit ({self.max_nodata_percent:.1f}%).",
                    None,
                )
            return (
                STATUS_REJECT,
                f"Nodata fraction ({val:.1f}%) exceeds allowable limit ({self.max_nodata_percent:.1f}%).",
                f"Excessive nodata pixels ({val:.1f}% > {self.max_nodata_percent:.1f}% limit).",
            )
        except (ValueError, TypeError):
            return STATUS_UNAVAILABLE, "Unparseable nodata metric.", None

    def _check_wind(self, wind_data: Optional[Dict[str, Any]]) -> tuple[str, str, Optional[str]]:
        """
        Evaluates wind speed suitability ONLY if a trustworthy wind value is provided.
        Labelled strictly as an operational screening guideline.
        """
        if not wind_data or not isinstance(wind_data, dict):
            return (
                STATUS_UNAVAILABLE,
                "Live metocean wind observation not available for this acquisition.",
                None,
            )

        speed_ms = wind_data.get("speed_ms") or wind_data.get("wind_speed_ms")
        if speed_ms is None:
            return (
                STATUS_UNAVAILABLE,
                "Live metocean wind observation not available for this acquisition.",
                None,
            )

        try:
            spd = float(speed_ms)
        except (ValueError, TypeError):
            return (
                STATUS_UNAVAILABLE,
                "Unparseable wind speed metric.",
                None,
            )

        if self.min_wind_ms <= spd <= self.max_wind_ms:
            return (
                STATUS_PASS,
                f"Wind speed ({spd:.1f} m/s) is within operational screening guideline ({self.min_wind_ms:.1f} - {self.max_wind_ms:.1f} m/s).",
                None,
            )

        if spd < self.min_wind_ms:
            return (
                STATUS_REJECT,
                f"Wind speed ({spd:.1f} m/s) is below operational screening guideline ({self.min_wind_ms:.1f} m/s). Risk of low-wind false-alarm lookalikes.",
                f"Wind speed ({spd:.1f} m/s) below operational guideline ({self.min_wind_ms:.1f} m/s): calm sea surface creates natural low-backscatter lookalikes.",
            )

        return (
            STATUS_REJECT,
            f"Wind speed ({spd:.1f} m/s) exceeds operational screening guideline ({self.max_wind_ms:.1f} m/s). High wave action breaks thin surface films.",
            f"Wind speed ({spd:.1f} m/s) exceeds operational guideline ({self.max_wind_ms:.1f} m/s): rough sea state disperses hydrocarbon films.",
        )
