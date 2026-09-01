import logging
from typing import Optional, List, Dict, Any, Tuple
import requests

from config import DEFAULT_SENTINEL1_BBOX, SENTINEL_HUB_PROCESS_URL
from copernicus_service import CopernicusAuthService
from sentinel_service import Sentinel1CatalogueService

logger = logging.getLogger("SentinelProcess")

SAR_OCEAN_EVALSCRIPT = """//VERSION=3
function setup() {
  return {
    input: ["VV", "dataMask"],
    output: { id: "default", bands: 1, sampleType: "AUTO" }
  };
}

function evaluatePixel(samples) {
  if (samples.dataMask === 0) {
    return [0];
  }
  // Convert linear backscatter intensity to decibel (dB) scale
  // dB = 10 * log10(max(val, 1e-4))
  let val = Math.max(samples.VV, 0.0001);
  let db = 10.0 * (Math.log(val) / Math.LN10);
  
  // Normalization for ocean SAR visualization:
  // Calm water / low backscatter: ~ -25.0 dB -> 0.0
  // Rough sea / high backscatter / ship targets: ~ 0.0 dB -> 1.0
  let minDb = -25.0;
  let maxDb = 0.0;
  let normalized = (db - minDb) / (maxDb - minDb);
  
  return [Math.max(0.0, Math.min(1.0, normalized))];
}
"""


def compute_bbox_intersection(
    bbox1: Optional[List[float]],
    bbox2: Optional[List[float]],
) -> Optional[List[float]]:
    """
    Computes the 2D spatial intersection of two WGS84 bounding boxes.
    Format: [min_lon, min_lat, max_lon, max_lat]

    Returns intersecting [min_lon, min_lat, max_lon, max_lat] rounded to 6 decimals,
    or None if the bounding boxes do not overlap.
    """
    if not bbox1 or not bbox2 or len(bbox1) != 4 or len(bbox2) != 4:
        return None

    try:
        min_lon = max(float(bbox1[0]), float(bbox2[0]))
        min_lat = max(float(bbox1[1]), float(bbox2[1]))
        max_lon = min(float(bbox1[2]), float(bbox2[2]))
        max_lat = min(float(bbox1[3]), float(bbox2[3]))

        # Must define a valid non-empty rectangle
        if min_lon < max_lon and min_lat < max_lat:
            return [round(min_lon, 6), round(min_lat, 6), round(max_lon, 6), round(max_lat, 6)]
    except (ValueError, TypeError):
        return None

    return None


class Sentinel1ProcessService:
    """
    Service responsible for fetching and rendering Sentinel-1 SAR (IW GRD) imagery
    using Copernicus Data Space Sentinel Hub Process API with automatic AOI footprint intersection.
    """

    def __init__(
        self,
        auth_service: Optional[CopernicusAuthService] = None,
        catalogue_service: Optional[Sentinel1CatalogueService] = None,
        process_url: Optional[str] = None,
        evalscript: str = SAR_OCEAN_EVALSCRIPT,
    ):
        self.auth_service = auth_service or CopernicusAuthService()
        self.catalogue_service = catalogue_service or Sentinel1CatalogueService(auth_service=self.auth_service)
        self.process_url = (process_url or SENTINEL_HUB_PROCESS_URL).strip()
        self.evalscript = evalscript

    def _parse_time_range(self, datetime_str: str) -> Tuple[str, str]:
        """
        Parses an ISO date, timestamp, or range into (from_time, to_time).
        """
        if "/" in datetime_str:
            parts = datetime_str.split("/", 1)
            return parts[0].strip(), parts[1].strip()

        # If a single ISO datetime or date is given, create a 24-hour day window
        clean_date = datetime_str.split("T")[0].strip()
        return f"{clean_date}T00:00:00Z", f"{clean_date}T23:59:59Z"

    def fetch_sentinel1_image(
        self,
        bbox: Optional[List[float]] = None,
        datetime_val: Optional[str] = None,
        width: int = 512,
        height: int = 512,
        polarization: str = "DV",
    ) -> Tuple[Optional[bytes], Optional[Dict[str, Any]], int]:
        """
        Fetches a rendered Sentinel-1 SAR grayscale PNG image from the Process API.
        Automatically crops the requested bbox to the intersection with the SAR acquisition footprint.

        :param bbox: WGS84 bounding box [min_lon, min_lat, max_lon, max_lat]
        :param datetime_val: Specific acquisition date, ISO timestamp, or range (optional)
        :param width: Image width in pixels (clamped 64 to 2048)
        :param height: Image height in pixels (clamped 64 to 2048)
        :param polarization: Polarization filter ('DV' for VV+VH, 'SV' for VV)
        :return: Tuple of (image_bytes_or_none, metadata_or_error_dict, http_status_code)
        """
        is_custom_bbox = bool(bbox and len(bbox) == 4)
        requested_bbox = [float(x) for x in bbox] if is_custom_bbox else list(DEFAULT_SENTINEL1_BBOX)
        img_width = max(64, min(int(width), 2048))
        img_height = max(64, min(int(height), 2048))

        acquisition_meta: Dict[str, Any] = {}
        product_footprint: Optional[List[float]] = None

        # 1. Retrieve acquisition metadata and product footprint
        if not datetime_val:
            logger.info("No datetime provided; querying catalogue for latest Sentinel-1 acquisition...")
            cat_result = self.catalogue_service.get_latest_acquisition(bbox=requested_bbox, days_back=30)
            if not cat_result.get("success"):
                logger.warning("Catalogue lookup failed to find recent acquisition: %s", cat_result)
                status = cat_result.get("status_code", 404)
                return None, {
                    "success": False,
                    "error": cat_result.get("error") or cat_result.get("message", "No recent acquisitions found to render"),
                    "error_code": cat_result.get("error_code", "NO_ACQUISITION_FOUND"),
                }, status

            product = cat_result.get("product", {})
            acq_dt = product.get("datetime")
            if not acq_dt:
                return None, {
                    "success": False,
                    "error": "Catalogue returned product without datetime property",
                    "error_code": "INVALID_CATALOGUE_DATA",
                }, 500

            acquisition_meta = product
            product_footprint = product.get("bbox")
            time_from, time_to = self._parse_time_range(acq_dt)
        else:
            time_from, time_to = self._parse_time_range(datetime_val)
            # Query STAC catalogue to identify the product footprint for the specified time range
            search_res = self.catalogue_service.search_sentinel1_grd(bbox=requested_bbox, days_back=60, limit=10)
            if isinstance(search_res, dict) and search_res.get("success") is True:
                features = search_res.get("features", [])
                if isinstance(features, list):
                    clean_date = datetime_val.split("T")[0]
                    for f in features:
                        if isinstance(f, dict):
                            f_dt = f.get("properties", {}).get("datetime", "")
                            if f_dt.startswith(clean_date):
                                product_footprint = f.get("bbox")
                                acquisition_meta = {
                                    "id": f.get("id"),
                                    "platform": f.get("properties", {}).get("platform"),
                                    "orbit_direction": f.get("properties", {}).get("sat:orbit_state"),
                                    "datetime": f_dt,
                                }
                                break
                    if not product_footprint and features and isinstance(features[0], dict):
                        product_footprint = features[0].get("bbox")
                        acquisition_meta = {
                            "id": features[0].get("id"),
                            "platform": features[0].get("properties", {}).get("platform"),
                            "orbit_direction": features[0].get("properties", {}).get("sat:orbit_state"),
                            "datetime": features[0].get("properties", {}).get("datetime"),
                        }

        # 2. Compute intersection between requested AOI and product footprint
        if product_footprint and isinstance(product_footprint, (list, tuple)) and len(product_footprint) == 4:
            intersection_bbox = compute_bbox_intersection(requested_bbox, list(product_footprint))
            if not intersection_bbox:
                logger.warning(
                    "Requested bbox %s does not intersect with product footprint %s.",
                    requested_bbox,
                    product_footprint,
                )
                return None, {
                    "success": False,
                    "error": "Requested area of interest does not intersect with the available Sentinel-1 SAR acquisition footprint",
                    "error_code": "NO_SAR_COVERAGE_INTERSECTION",
                    "requested_bbox": requested_bbox,
                    "product_bbox": product_footprint,
                    "product_footprint": product_footprint,
                }, 404
            target_bbox = intersection_bbox
            logger.info("Cropped AOI to footprint intersection: %s (from requested %s)", target_bbox, requested_bbox)
        else:
            target_bbox = requested_bbox


        # 3. Obtain OAuth Authorization headers
        headers = self.auth_service.get_auth_headers()
        if not headers:
            logger.error("Failed to obtain Copernicus authorization headers for Process API.")
            return None, {
                "success": False,
                "error": "Authentication with Copernicus Data Space failed",
                "error_code": "AUTH_FAILED",
            }, 401

        # 4. Construct Process API Request Payload using the cropped intersection bbox
        payload = {
            "input": {
                "bounds": {
                    "bbox": target_bbox,
                    "properties": {
                        "crs": "http://www.opengis.net/def/crs/OGC/1.3/CRS84"
                    }
                },
                "data": [
                    {
                        "type": "sentinel-1-grd",
                        "dataFilter": {
                            "timeRange": {
                                "from": time_from,
                                "to": time_to
                            },
                            "acquisitionMode": "IW",
                            "polarization": polarization
                        },
                        "processing": {
                            "orthorectify": True,
                            "backscatterCoeff": "GAMMA0_ELLIPSOID"
                        }
                    }
                ]
            },
            "output": {
                "width": img_width,
                "height": img_height,
                "responses": [
                    {
                        "identifier": "default",
                        "format": {
                            "type": "image/png"
                        }
                    }
                ]
            },
            "evalscript": self.evalscript
        }

        # 5. Execute Process API POST Request
        try:
            logger.info(
                "Requesting Sentinel-1 SAR image from Process API (bbox=%s, time=%s/%s, size=%dx%d)...",
                target_bbox,
                time_from,
                time_to,
                img_width,
                img_height,
            )
            response = requests.post(
                self.process_url,
                json=payload,
                headers=headers,
                timeout=35,
            )

            if response.status_code == 200:
                content = response.content
                # Verify PNG magic bytes: \x89PNG\r\n\x1a\n
                if content.startswith(b"\x89PNG\r\n\x1a\n"):
                    logger.info("Successfully fetched Sentinel-1 SAR PNG (%d bytes).", len(content))
                    metadata = {
                        "processed_bbox": target_bbox,
                        "requested_bbox": requested_bbox,
                        "product_bbox": product_footprint,
                        "bbox": target_bbox,
                        "time_range": f"{time_from}/{time_to}",
                        "width": img_width,
                        "height": img_height,
                        "content_type": "image/png",
                        "product_id": acquisition_meta.get("id"),
                        "platform": acquisition_meta.get("platform"),
                        "orbit_direction": acquisition_meta.get("orbit_direction"),
                    }
                    return content, metadata, 200
                else:
                    logger.error("Process API returned 200 but content is not valid PNG format.")
                    return None, {
                        "success": False,
                        "error": "Process API returned unexpected image format",
                        "error_code": "INVALID_IMAGE_FORMAT",
                    }, 502
            elif response.status_code in (401, 403):
                logger.error("Process API authorization rejected (HTTP %d).", response.status_code)
                return None, {
                    "success": False,
                    "error": "Copernicus authorization rejected by Process API",
                    "error_code": "PROCESS_AUTH_REJECTED",
                }, response.status_code
            elif response.status_code == 400:
                logger.warning("Process API returned 400 Bad Request: %s", response.text[:300])
                return None, {
                    "success": False,
                    "error": "Process API rejected request parameters (likely no SAR data covering the bounding box/time range)",
                    "error_code": "PROCESS_BAD_REQUEST",
                    "details": response.text[:200],
                }, 400
            else:
                logger.error("Process API failed with HTTP %d: %s", response.status_code, response.text[:300])
                return None, {
                    "success": False,
                    "error": f"Sentinel Hub Process API error (HTTP {response.status_code})",
                    "error_code": "PROCESS_API_ERROR",
                }, response.status_code

        except requests.Timeout:
            logger.error("Timeout during Sentinel Hub Process API request.")
            return None, {
                "success": False,
                "error": "Sentinel Hub Process API request timed out",
                "error_code": "REQUEST_TIMEOUT",
            }, 504
        except requests.RequestException as e:
            logger.error("Network communication error with Process API: %s", e)
            return None, {
                "success": False,
                "error": "Network communication error with Copernicus Process API",
                "error_code": "NETWORK_ERROR",
            }, 502
        except Exception as e:
            logger.error("Unexpected error during Sentinel-1 image fetch: %s", e)
            return None, {
                "success": False,
                "error": "Unexpected server error during SAR image generation",
                "error_code": "INTERNAL_ERROR",
            }, 500
