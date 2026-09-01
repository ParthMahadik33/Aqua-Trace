import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
import requests

from config import DEFAULT_SENTINEL1_BBOX, SENTINEL_HUB_CATALOG_URL
from copernicus_service import CopernicusAuthService

logger = logging.getLogger("SentinelCatalogue")


class Sentinel1CatalogueService:
    """
    Service for querying the Copernicus Data Space Sentinel Hub Catalog API
    for Sentinel-1 Synthetic Aperture Radar (SAR) Ground Range Detected (GRD) acquisitions.
    """

    def __init__(
        self,
        auth_service: Optional[CopernicusAuthService] = None,
        catalog_url: Optional[str] = None,
    ):
        self.auth_service = auth_service or CopernicusAuthService()
        self.catalog_url = (catalog_url or SENTINEL_HUB_CATALOG_URL).strip()

    def search_sentinel1_grd(
        self,
        bbox: Optional[List[float]] = None,
        days_back: int = 30,
        limit: int = 25,
    ) -> Dict[str, Any]:
        """
        Queries the Sentinel Hub Catalog STAC API for Sentinel-1 GRD products.
        
        :param bbox: WGS84 bounding box [min_lon, min_lat, max_lon, max_lat]
        :param days_back: Number of days to look back from current UTC time
        :param limit: Maximum number of STAC features to fetch
        :return: Dict containing status and sorted list of STAC features or error details
        """
        search_bbox = bbox if bbox and len(bbox) == 4 else DEFAULT_SENTINEL1_BBOX
        
        # Calculate time window up to current UTC time
        now_utc = datetime.now(timezone.utc)
        start_utc = now_utc - timedelta(days=max(1, days_back))
        datetime_range = f"{start_utc.strftime('%Y-%m-%dT%H:%M:%SZ')}/{now_utc.strftime('%Y-%m-%dT%H:%M:%SZ')}"

        headers = self.auth_service.get_auth_headers()
        if not headers:
            logger.error("Cannot query Sentinel Hub Catalog: Failed to obtain Copernicus authorization headers.")
            return {
                "success": False,
                "error": "Authentication with Copernicus Data Space failed",
                "error_code": "AUTH_FAILED",
                "status_code": 401,
            }

        payload = {
            "bbox": search_bbox,
            "datetime": datetime_range,
            "collections": ["sentinel-1-grd"],
            "limit": limit,
        }

        try:
            logger.info(
                "Searching Sentinel-1 Catalog at %s (bbox=%s, datetime=%s, limit=%d)...",
                self.catalog_url,
                search_bbox,
                datetime_range,
                limit,
            )
            response = requests.post(
                self.catalog_url,
                json=payload,
                headers=headers,
                timeout=20,
            )

            if response.status_code == 200:
                data = response.json()
                features = data.get("features", [])
                
                # Sort features in descending order by acquisition datetime (newest first)
                features.sort(
                    key=lambda f: f.get("properties", {}).get("datetime", ""),
                    reverse=True,
                )
                
                logger.info("Retrieved %d Sentinel-1 GRD features successfully.", len(features))
                return {
                    "success": True,
                    "features": features,
                    "bbox": search_bbox,
                    "datetime_range": datetime_range,
                    "status_code": 200,
                }
            elif response.status_code in (401, 403):
                logger.error("Sentinel Hub Catalog authentication rejected (HTTP %d).", response.status_code)
                return {
                    "success": False,
                    "error": "Copernicus authorization rejected by Catalog API",
                    "error_code": "CATALOG_AUTH_REJECTED",
                    "status_code": response.status_code,
                }
            else:
                logger.error(
                    "Sentinel Hub Catalog query failed with HTTP %d: %s",
                    response.status_code,
                    response.text[:300],
                )
                return {
                    "success": False,
                    "error": f"Catalog API query failed with HTTP {response.status_code}",
                    "error_code": "CATALOG_API_ERROR",
                    "status_code": response.status_code,
                }

        except requests.RequestException as e:
            logger.error("Network error during Sentinel Hub Catalog request: %s", e)
            return {
                "success": False,
                "error": "Network communication error with Copernicus Catalog API",
                "error_code": "NETWORK_ERROR",
                "status_code": 502,
            }
        except Exception as e:
            logger.error("Unexpected error during Sentinel Hub Catalog query: %s", e)
            return {
                "success": False,
                "error": "Unexpected server error during catalogue search",
                "error_code": "INTERNAL_ERROR",
                "status_code": 500,
            }

    def get_latest_acquisition(
        self,
        bbox: Optional[List[float]] = None,
        days_back: int = 30,
    ) -> Dict[str, Any]:
        """
        Retrieves the single latest available Sentinel-1 GRD acquisition
        matching the bounding box and formats safe metadata for frontend consumption.
        """
        search_result = self.search_sentinel1_grd(bbox=bbox, days_back=days_back, limit=25)
        
        if not search_result.get("success"):
            return {
                "success": False,
                "error": search_result.get("error", "Failed to retrieve Sentinel-1 acquisitions"),
                "error_code": search_result.get("error_code"),
                "status_code": search_result.get("status_code", 500),
            }

        features = search_result.get("features", [])
        search_bbox = search_result.get("bbox", DEFAULT_SENTINEL1_BBOX)

        if not features:
            return {
                "success": False,
                "message": "No Sentinel-1 GRD acquisitions found in the specified region and time window",
                "search_criteria": {
                    "bbox": search_bbox,
                    "collection": "sentinel-1-grd",
                    "time_window_days": days_back,
                    "matched_count": 0,
                },
                "status_code": 404,
            }

        # Select the latest feature (list is already sorted descending by datetime)
        latest_feature = features[0]
        props = latest_feature.get("properties", {})

        # Extract and format safe metadata without leaking tokens or internal secrets
        safe_metadata = {
            "id": latest_feature.get("id"),
            "datetime": props.get("datetime"),
            "platform": props.get("platform") or props.get("sat:platform_international_designator") or props.get("constellation"),
            "collection": latest_feature.get("collection", "sentinel-1-grd"),
            "bbox": latest_feature.get("bbox"),
            "geometry": latest_feature.get("geometry"),
            "orbit_direction": props.get("sat:orbit_state") or props.get("orbitState") or props.get("s1:orbit_direction"),
            "polarization": props.get("sar:polarizations") or props.get("s1:polarization") or props.get("polarization"),
            "instrument_mode": props.get("sar:instrument_mode"),
            "product_type": props.get("sar:product_type"),
            "timeliness": props.get("s1:timeliness"),
            "resolution": props.get("s1:resolution"),
        }

        return {
            "success": True,
            "product": safe_metadata,
            "search_criteria": {
                "bbox": search_bbox,
                "collection": "sentinel-1-grd",
                "time_window_days": days_back,
                "matched_count": len(features),
            },
            "status_code": 200,
        }
