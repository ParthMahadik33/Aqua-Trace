import unittest
from unittest.mock import patch, MagicMock
import requests

from app import app
from config import DEFAULT_SENTINEL1_BBOX
from sentinel_service import Sentinel1CatalogueService
from copernicus_service import CopernicusAuthService


class TestSentinel1CatalogueService(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True
        self.mock_auth = MagicMock(spec=CopernicusAuthService)
        self.mock_auth.get_auth_headers.return_value = {"Authorization": "Bearer mock_token"}
        self.service = Sentinel1CatalogueService(auth_service=self.mock_auth)

    @patch("sentinel_service.requests.post")
    def test_search_sorting_and_metadata_extraction(self, mock_post):
        """Test STAC querying, descending datetime sorting, and safe metadata formatting."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "type": "FeatureCollection",
            "features": [
                {
                    "id": "S1D_OLDER_FEATURE",
                    "collection": "sentinel-1-grd",
                    "bbox": [100.0, 1.0, 102.0, 3.0],
                    "geometry": {"type": "Polygon", "coordinates": [[[100, 1], [102, 1], [102, 3], [100, 3], [100, 1]]]},
                    "properties": {
                        "datetime": "2026-08-20T10:00:00Z",
                        "platform": "sentinel-1d",
                        "sat:orbit_state": "ascending",
                        "sar:polarizations": ["VV", "VH"],
                        "sar:instrument_mode": "IW",
                        "sar:product_type": "GRD",
                    }
                },
                {
                    "id": "S1D_LATEST_FEATURE",
                    "collection": "sentinel-1-grd",
                    "bbox": [101.0, 1.5, 103.5, 4.0],
                    "geometry": {"type": "Polygon", "coordinates": [[[101, 1.5], [103.5, 1.5], [103.5, 4], [101, 4], [101, 1.5]]]},
                    "properties": {
                        "datetime": "2026-08-29T12:30:00Z",
                        "platform": "sentinel-1d",
                        "sat:orbit_state": "descending",
                        "sar:polarizations": ["VV", "VH"],
                        "sar:instrument_mode": "IW",
                        "sar:product_type": "GRD",
                    }
                }
            ]
        }
        mock_post.return_value = mock_response

        res = self.service.get_latest_acquisition(bbox=[99.5, 1.0, 104.5, 6.0], days_back=30)
        self.assertTrue(res["success"])
        self.assertEqual(res["status_code"], 200)

        product = res["product"]
        # Must pick the newest datetime feature
        self.assertEqual(product["id"], "S1D_LATEST_FEATURE")
        self.assertEqual(product["datetime"], "2026-08-29T12:30:00Z")
        self.assertEqual(product["platform"], "sentinel-1d")
        self.assertEqual(product["collection"], "sentinel-1-grd")
        self.assertEqual(product["orbit_direction"], "descending")
        self.assertEqual(product["polarization"], ["VV", "VH"])
        self.assertEqual(product["bbox"], [101.0, 1.5, 103.5, 4.0])
        self.assertIsNotNone(product["geometry"])

        # Ensure no sensitive fields exist
        self.assertNotIn("access_token", product)
        self.assertNotIn("client_secret", product)
        self.assertNotIn("Authorization", product)

    @patch("sentinel_service.requests.post")
    def test_no_acquisitions_found(self, mock_post):
        """Test handling when no acquisitions match the time window or region."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"type": "FeatureCollection", "features": []}
        mock_post.return_value = mock_response

        res = self.service.get_latest_acquisition(days_back=7)
        self.assertFalse(res["success"])
        self.assertEqual(res["status_code"], 404)
        self.assertIn("No Sentinel-1 GRD acquisitions found", res["message"])

    def test_auth_failure_handling(self):
        """Test handling when auth service cannot produce authorization headers."""
        self.mock_auth.get_auth_headers.return_value = None
        res = self.service.get_latest_acquisition()

        self.assertFalse(res["success"])
        self.assertEqual(res["status_code"], 401)
        self.assertEqual(res["error_code"], "AUTH_FAILED")

    @patch("sentinel_service.requests.post")
    def test_network_exception_handling(self, mock_post):
        """Test graceful degradation on network exception."""
        mock_post.side_effect = requests.RequestException("Connection reset by peer")
        res = self.service.get_latest_acquisition()

        self.assertFalse(res["success"])
        self.assertEqual(res["status_code"], 502)
        self.assertEqual(res["error_code"], "NETWORK_ERROR")

    @patch("sentinel_service.Sentinel1CatalogueService.get_latest_acquisition")
    def test_api_endpoint_success(self, mock_get_latest):
        """Test GET /api/copernicus/sentinel1/latest Flask endpoint."""
        mock_get_latest.return_value = {
            "success": True,
            "status_code": 200,
            "product": {
                "id": "S1D_IW_GRDH_TEST",
                "datetime": "2026-08-28T22:55:43Z",
                "platform": "sentinel-1d",
                "collection": "sentinel-1-grd",
                "bbox": [100.5, 0.2, 103.0, 2.2],
                "geometry": {"type": "Polygon", "coordinates": []},
                "orbit_direction": "descending",
                "polarization": ["VV", "VH"]
            },
            "search_criteria": {
                "bbox": DEFAULT_SENTINEL1_BBOX,
                "collection": "sentinel-1-grd",
                "time_window_days": 30
            }
        }

        response = self.app.get("/api/copernicus/sentinel1/latest")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()

        self.assertTrue(data["success"])
        self.assertEqual(data["product"]["id"], "S1D_IW_GRDH_TEST")
        self.assertNotIn("status_code", data)
        self.assertNotIn("access_token", data)

    def test_api_endpoint_invalid_bbox_parameter(self):
        """Test GET /api/copernicus/sentinel1/latest with malformed bbox parameter."""
        response = self.app.get("/api/copernicus/sentinel1/latest?bbox=invalid,bbox")
        self.assertEqual(response.status_code, 400)
        data = response.get_json()
        self.assertFalse(data["success"])
        self.assertIn("error", data)


if __name__ == "__main__":
    unittest.main()
