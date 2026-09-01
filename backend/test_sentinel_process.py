import unittest
from unittest.mock import patch, MagicMock
import requests

from app import app
from config import DEFAULT_SENTINEL1_BBOX
from sentinel_process_service import Sentinel1ProcessService, compute_bbox_intersection
from copernicus_service import CopernicusAuthService
from sentinel_service import Sentinel1CatalogueService

MOCK_PNG_BYTES = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x00\x00\x00\x00:~\x9bU\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"


class TestSentinel1ProcessService(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True
        self.mock_auth = MagicMock(spec=CopernicusAuthService)
        self.mock_auth.get_auth_headers.return_value = {"Authorization": "Bearer mock_token"}
        self.mock_catalogue = MagicMock(spec=Sentinel1CatalogueService)
        self.mock_catalogue.search_sentinel1_grd.return_value = {
            "success": True,
            "features": [
                {
                    "id": "S1D_MATCH_SCENE",
                    "properties": {
                        "datetime": "2026-08-29T11:17:59Z",
                        "platform": "sentinel-1d",
                        "sat:orbit_state": "ascending",
                    },
                    "bbox": [99.5, 1.0, 104.5, 6.0],
                }
            ]
        }
        self.service = Sentinel1ProcessService(
            auth_service=self.mock_auth,
            catalogue_service=self.mock_catalogue
        )


    def test_compute_bbox_intersection(self):
        """Test 2D bounding box intersection calculation."""
        # 1. Partial overlap
        b1 = [99.5, 1.0, 104.5, 6.0]
        b2 = [102.0, 5.0, 106.0, 7.5]
        inter = compute_bbox_intersection(b1, b2)
        self.assertEqual(inter, [102.0, 5.0, 104.5, 6.0])

        # 2. b1 contained inside b2
        b1 = [100.0, 2.0, 102.0, 4.0]
        b2 = [98.0, 1.0, 105.0, 5.0]
        inter = compute_bbox_intersection(b1, b2)
        self.assertEqual(inter, [100.0, 2.0, 102.0, 4.0])

        # 3. Disjoint / no intersection
        b1 = [68.0, 18.0, 72.0, 22.0]
        b2 = [100.0, 1.0, 104.0, 5.0]
        inter = compute_bbox_intersection(b1, b2)
        self.assertIsNone(inter)

        # 4. Invalid input
        self.assertIsNone(compute_bbox_intersection(None, b2))
        self.assertIsNone(compute_bbox_intersection([1, 2], b2))

    def test_parse_time_range(self):
        """Test parsing of various date and timestamp formats."""
        f, t = self.service._parse_time_range("2026-08-29")
        self.assertEqual(f, "2026-08-29T00:00:00Z")
        self.assertEqual(t, "2026-08-29T23:59:59Z")

        f, t = self.service._parse_time_range("2026-08-29T11:17:59Z")
        self.assertEqual(f, "2026-08-29T00:00:00Z")
        self.assertEqual(t, "2026-08-29T23:59:59Z")

        f, t = self.service._parse_time_range("2026-08-28T00:00:00Z/2026-08-29T23:59:59Z")
        self.assertEqual(f, "2026-08-28T00:00:00Z")
        self.assertEqual(t, "2026-08-29T23:59:59Z")

    @patch("sentinel_process_service.requests.post")
    def test_auto_discovery_and_intersection_cropping(self, mock_post):
        """Test that missing bbox triggers intersection between default monitoring region and product footprint."""
        # Default monitoring bbox is [99.5, 1.0, 104.5, 6.0]
        # Product footprint is [102.0, 4.0, 106.0, 7.0]
        # Expected intersection sent to Process API: [102.0, 4.0, 104.5, 6.0]
        self.mock_catalogue.get_latest_acquisition.return_value = {
            "success": True,
            "status_code": 200,
            "product": {
                "id": "S1D_LATEST_SCENE",
                "datetime": "2026-08-29T11:17:59Z",
                "platform": "sentinel-1d",
                "orbit_direction": "ascending",
                "bbox": [102.0, 4.0, 106.0, 7.0]
            }
        }

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.content = MOCK_PNG_BYTES
        mock_post.return_value = mock_response

        img_bytes, meta, status = self.service.fetch_sentinel1_image(
            bbox=None,  # No explicit bbox provided
            datetime_val=None
        )

        self.assertEqual(status, 200)
        self.assertEqual(img_bytes, MOCK_PNG_BYTES)
        self.assertEqual(meta["processed_bbox"], [102.0, 4.0, 104.5, 6.0])
        self.assertEqual(meta["requested_bbox"], DEFAULT_SENTINEL1_BBOX)
        self.assertEqual(meta["product_bbox"], [102.0, 4.0, 106.0, 7.0])

        # Verify POST payload sent cropped intersection bbox
        mock_post.assert_called_once()
        args, kwargs = mock_post.call_args
        sent_bbox = kwargs["json"]["input"]["bounds"]["bbox"]
        self.assertEqual(sent_bbox, [102.0, 4.0, 104.5, 6.0])

    @patch("sentinel_process_service.requests.post")
    def test_custom_partial_overlap_cropping(self, mock_post):
        """Test that a partially overlapping requested bbox is cropped to the intersection."""
        # User requested bbox: [100.0, 5.0, 103.5, 6.5]
        # Product footprint: [102.0, 4.0, 106.0, 7.0]
        # Expected intersection: [102.0, 5.0, 103.5, 6.5]
        self.mock_catalogue.get_latest_acquisition.return_value = {
            "success": True,
            "status_code": 200,
            "product": {
                "id": "S1D_LATEST_SCENE",
                "datetime": "2026-08-29T11:17:59Z",
                "platform": "sentinel-1d",
                "orbit_direction": "ascending",
                "bbox": [102.0, 4.0, 106.0, 7.0]
            }
        }

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.content = MOCK_PNG_BYTES
        mock_post.return_value = mock_response

        img_bytes, meta, status = self.service.fetch_sentinel1_image(
            bbox=[100.0, 5.0, 103.5, 6.5],
            datetime_val=None
        )

        self.assertEqual(status, 200)
        self.assertEqual(meta["processed_bbox"], [102.0, 5.0, 103.5, 6.5])
        self.assertEqual(meta["requested_bbox"], [100.0, 5.0, 103.5, 6.5])

    def test_no_intersection_error(self):
        """Test that disjoint bbox returns a clear 404 NO_SAR_COVERAGE_INTERSECTION error."""
        # User requested bbox in Arabian Sea
        self.mock_catalogue.get_latest_acquisition.return_value = {
            "success": True,
            "status_code": 200,
            "product": {
                "id": "S1D_MALACCA_SCENE",
                "datetime": "2026-08-29T11:17:59Z",
                "platform": "sentinel-1d",
                "bbox": [102.0, 4.0, 106.0, 7.0]  # Malacca
            }
        }

        img_bytes, err, status = self.service.fetch_sentinel1_image(
            bbox=[68.0, 18.0, 72.0, 22.0],  # Mumbai / Arabian Sea
            datetime_val=None
        )

        self.assertIsNone(img_bytes)
        self.assertEqual(status, 404)
        self.assertEqual(err["error_code"], "NO_SAR_COVERAGE_INTERSECTION")
        self.assertIn("does not intersect", err["error"])
        self.assertEqual(err["requested_bbox"], [68.0, 18.0, 72.0, 22.0])
        self.assertEqual(err["product_footprint"], [102.0, 4.0, 106.0, 7.0])

    def test_auth_headers_failure(self):
        """Test handling when auth token generation fails."""
        self.mock_auth.get_auth_headers.return_value = None

        img_bytes, err, status = self.service.fetch_sentinel1_image(
            datetime_val="2026-08-29"
        )

        self.assertIsNone(img_bytes)
        self.assertEqual(status, 401)
        self.assertEqual(err["error_code"], "AUTH_FAILED")

    @patch("sentinel_process_service.requests.post")
    def test_process_api_400_error(self, mock_post):
        """Test handling of 400 Bad Request from Process API."""
        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_response.text = '{"error": "No data found"}'
        mock_post.return_value = mock_response

        img_bytes, err, status = self.service.fetch_sentinel1_image(
            datetime_val="2026-08-29"
        )

        self.assertIsNone(img_bytes)
        self.assertEqual(status, 400)
        self.assertEqual(err["error_code"], "PROCESS_BAD_REQUEST")

    @patch("sentinel_process_service.requests.post")
    def test_process_api_timeout(self, mock_post):
        """Test handling of network timeout."""
        mock_post.side_effect = requests.Timeout("Connection timed out")

        img_bytes, err, status = self.service.fetch_sentinel1_image(
            datetime_val="2026-08-29"
        )

        self.assertIsNone(img_bytes)
        self.assertEqual(status, 504)
        self.assertEqual(err["error_code"], "REQUEST_TIMEOUT")

    @patch("sentinel_process_service.Sentinel1ProcessService.fetch_sentinel1_image")
    def test_app_endpoint_image_success_with_intersection_header(self, mock_fetch):
        """Test GET /api/copernicus/sentinel1/image returns X-AquaTrace-SAR-BBox with intersection."""
        mock_fetch.return_value = (
            MOCK_PNG_BYTES,
            {
                "time_range": "2026-08-29T00:00:00Z/2026-08-29T23:59:59Z",
                "product_id": "S1D_TEST_SCENE",
                "processed_bbox": [102.878987, 5.462352, 104.5, 6.0],
                "requested_bbox": [99.5, 1.0, 104.5, 6.0],
                "product_bbox": [102.878987, 5.462352, 105.410457, 7.428631],
            },
            200
        )

        response = self.app.get("/api/copernicus/sentinel1/image?width=512&height=512")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.mimetype, "image/png")
        self.assertEqual(response.data, MOCK_PNG_BYTES)
        self.assertEqual(response.headers.get("X-AquaTrace-SAR-ProductId"), "S1D_TEST_SCENE")
        self.assertEqual(response.headers.get("X-AquaTrace-SAR-BBox"), "102.878987,5.462352,104.5,6.0")
        self.assertEqual(response.headers.get("X-AquaTrace-SAR-RequestedBBox"), "99.5,1.0,104.5,6.0")

    def test_app_endpoint_invalid_bbox(self):
        """Test GET /api/copernicus/sentinel1/image with invalid bbox param."""
        response = self.app.get("/api/copernicus/sentinel1/image?bbox=bad_bbox")
        self.assertEqual(response.status_code, 400)
        data = response.get_json()
        self.assertFalse(data["success"])


if __name__ == "__main__":
    unittest.main()
