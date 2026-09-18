import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

logger = logging.getLogger("AITriageAdapter")


class BaseAITriageService(ABC):
    """
    Abstract contract for AquaTrace AI SAR Anomaly Triage.
    Defines standard schema consumed by screening policy and incident store.
    """

    @abstractmethod
    def triage(self, acquisition: Dict[str, Any]) -> Dict[str, Any]:
        """
        Evaluates a quality-passed SAR acquisition for potential oil slick anomalies.
        Must return structured triage contract without fabricating uncalibrated scores.
        """
        pass


BaseAITriageAdapter = BaseAITriageService


class DevelopmentAITriageAdapter(BaseAITriageService):
    """
    Deterministic development adapter used when the external deep-learning
    inference service (e.g. ConvNeXt-Tiny) is offline or decoupled.

    CRITICAL COMPLIANCE RULES:
    - Explicitly labeled as 'DEVELOPMENT ADAPTER'.
    - Does NOT fabricate scientific confidence percentages (probabilities remain None).
    - Produces deterministic, explainable screening signals for end-to-end integration and demonstration.
    """

    def __init__(self, demo_mode: str = "DETERMINISTIC"):
        self.demo_mode = demo_mode
        self.model_version = "development-adapter-v1"
        self.source_id = "development_adapter"

    def triage(self, acquisition: Dict[str, Any]) -> Dict[str, Any]:
        product_id = str(acquisition.get("product_id") or acquisition.get("id") or "")
        bbox = acquisition.get("bbox") or []
        zone_id = str(acquisition.get("zone_id") or "UNASSIGNED").upper()

        # Calculate bounding box centroid if valid bbox exists
        centroid = None
        approx_area_km2 = None
        if len(bbox) == 4:
            min_lon, min_lat, max_lon, max_lat = float(bbox[0]), float(bbox[1]), float(bbox[2]), float(bbox[3])
            center_lon = round((min_lon + max_lon) / 2.0, 5)
            center_lat = round((min_lat + max_lat) / 2.0, 5)
            centroid = {"lat": center_lat, "lon": center_lon}

            # Approximate scene extent in km2
            lat_km = (max_lat - min_lat) * 111.0
            lon_km = (max_lon - min_lon) * 111.0 * 0.95
            approx_area_km2 = round(lat_km * lon_km, 2)

        # Deterministic demo trigger rule:
        # 1. Explicit demo flag in acquisition
        # 2. Or if explicitly flagged in test/verification
        # 3. Or targeted demonstration product in Malacca/Mumbai
        is_candidate = (
            acquisition.get("is_demo_candidate") is True
            or "CANDIDATE" in product_id.upper()
            or "DEMO" in product_id.upper()
            or acquisition.get("status") == "CANDIDATE"
        )

        if is_candidate:
            status = "REVIEW"
            rationale = (
                "DEVELOPMENT ADAPTER: Flagged for analyst verification. "
                "Simulated anomalous dark patch signature within monitored high-density shipping lane."
            )
            # Candidate anomaly geometry localized within scene
            candidate_geom = None
            if centroid:
                # Localized anomaly bounding box ~4km x 2km around center for demonstration
                d_lat = 0.02
                d_lon = 0.02
                candidate_geom = {
                    "type": "Polygon",
                    "coordinates": [[
                        [round(centroid["lon"] - d_lon, 5), round(centroid["lat"] - d_lat, 5)],
                        [round(centroid["lon"] + d_lon, 5), round(centroid["lat"] - d_lat, 5)],
                        [round(centroid["lon"] + d_lon, 5), round(centroid["lat"] + d_lat, 5)],
                        [round(centroid["lon"] - d_lon, 5), round(centroid["lat"] + d_lat, 5)],
                        [round(centroid["lon"] - d_lon, 5), round(centroid["lat"] - d_lat, 5)],
                    ]],
                }
            candidate_area = 3.85  # Realistic 3-4 km2 plume size
        else:
            status = "NO_OIL"
            rationale = (
                "DEVELOPMENT ADAPTER: Standard uniform SAR sea clutter. "
                "No capillary damping anomaly detected above baseline variance."
            )
            candidate_geom = None
            candidate_area = None

        logger.info("[TRIAGE] product=%s status=%s (source=%s)", product_id, status, self.source_id)

        return {
            "status": status,
            "oil_probability": None,       # Explicitly None (no fabricated numbers)
            "lookalike_probability": None, # Explicitly None
            "no_oil_probability": None,    # Explicitly None
            "candidate_geometry": candidate_geom,
            "candidate_area_km2": candidate_area,
            "candidate_centroid": centroid,
            "model_version": self.model_version,
            "source": self.source_id,
            "triage_mode": "DEVELOPMENT ADAPTER",
            "rationale": rationale,
        }


class ExternalModelServiceAdapter(BaseAITriageService):
    """
    Future integration socket for external deep learning inference service.
    Can be configured with an inference endpoint URL without altering the rest of AquaTrace.
    """

    def __init__(self, service_url: Optional[str] = None):
        self.service_url = service_url
        self.model_version = "convnext-tiny-v1"
        self.source_id = "external_ml_service"

    def triage(self, acquisition: Dict[str, Any]) -> Dict[str, Any]:
        if not self.service_url:
            raise RuntimeError("External inference endpoint URL is not configured.")
        # Future implementation will POST SAR patch tensor to service_url
        raise NotImplementedError("External ML model service is offline.")
