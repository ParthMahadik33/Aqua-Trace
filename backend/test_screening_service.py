import os
import json
import shutil
import tempfile
import unittest
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone

from app import app
from acquisition_registry import AcquisitionRegistry
from quality_gate import QualityGate
from sentinel_service import Sentinel1CatalogueService
from screening_service import ScreeningService


def make_stac_feature(product_id, dt="2026-08-29T12:00:00Z", pol=None, bbox=None, mode="IW"):
    return {
        "id": product_id,
        "collection": "sentinel-1-grd",
        "bbox": bbox or [99.8, 1.2, 103.5, 5.5],
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[99.8, 1.2], [103.5, 1.2], [103.5, 5.5], [99.8, 5.5], [99.8, 1.2]]],
        },
        "properties": {
            "datetime": dt,
            "platform": "Sentinel-1A",
            "sar:instrument_mode": mode,
            "sat:orbit_state": "ascending",
            "sar:polarizations": pol or ["VV", "VH"],
            "s1:resolution": "10m",
        },
    }


class TestScreeningService(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp(prefix="aquatrace_test_screening_")
        self.reg_file = os.path.join(self.test_dir, "acquisitions.json")
        self.cp_file = os.path.join(self.test_dir, "checkpoints.json")

        self.registry = AcquisitionRegistry(storage_path=self.reg_file)
        self.quality_gate = QualityGate()
        self.mock_catalogue = MagicMock(spec=Sentinel1CatalogueService)

        self.zones = {
            "MALACCA_STRAIT": {
                "zone_id": "MALACCA_STRAIT",
                "name": "Malacca Strait Corridor",
                "bbox": [99.5, 1.0, 104.5, 6.0],
                "priority": 1,
                "enabled": True,
            }
        }

        self.service = ScreeningService(
            catalogue_service=self.mock_catalogue,
            acquisition_registry=self.registry,
            quality_gate=self.quality_gate,
            zones=self.zones,
            checkpoints_path=self.cp_file,
            interval_sec=60.0,
            overlap_hours=1.0,
            initial_lookback_days=7,
        )

    def tearDown(self):
        self.service.stop()
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_watcher_discovers_new_product(self):
        """1. Watcher discovers new product, upserts to registry, and evaluates quality."""
        feat = make_stac_feature("S1A_DISCOVERY_PROD_01")
        self.mock_catalogue.search_sentinel1_grd.return_value = {
            "success": True,
            "features": [feat],
            "bbox": [99.5, 1.0, 104.5, 6.0],
            "status_code": 200,
        }

        res = self.service.reconcile_zone("MALACCA_STRAIT")
        self.assertTrue(res["success"])
        self.assertEqual(res["discovered"], 1)
        self.assertEqual(res["new"], 1)
        self.assertEqual(res["duplicates"], 0)
        self.assertEqual(res["passed_quality"], 1)

        # Check registry state
        rec = self.registry.get_by_product_id("S1A_DISCOVERY_PROD_01")
        self.assertIsNotNone(rec)
        self.assertEqual(rec["status"], "CLEAN")
        self.assertIsNotNone(rec["quality_result"])
        self.assertTrue(rec["quality_result"]["passed"])

    def test_duplicate_product_is_ignored(self):
        """2. Duplicate product is handled idempotently; duplicate count increments, registry count stays 1."""
        feat = make_stac_feature("S1A_DUPLICATE_PROD_01")
        self.mock_catalogue.search_sentinel1_grd.return_value = {
            "success": True,
            "features": [feat],
            "status_code": 200,
        }

        # Run 1
        res1 = self.service.reconcile_zone("MALACCA_STRAIT")
        self.assertEqual(res1["new"], 1)
        self.assertEqual(self.registry.count(), 1)

        # Run 2 with same product returned
        res2 = self.service.reconcile_zone("MALACCA_STRAIT")
        self.assertEqual(res2["discovered"], 1)
        self.assertEqual(res2["new"], 0)
        self.assertEqual(res2["duplicates"], 1)
        self.assertEqual(self.registry.count(), 1, "Duplicate must not increase registry total")

    def test_multiple_pages_are_processed(self):
        """3. Multiple pages from catalogue are consumed and all features registered."""
        feat1 = make_stac_feature("S1A_PAGE1_PROD")
        feat2 = make_stac_feature("S1A_PAGE2_PROD")
        feat3 = make_stac_feature("S1A_PAGE3_PROD")

        self.mock_catalogue.search_sentinel1_grd.return_value = {
            "success": True,
            "features": [feat1, feat2, feat3],
            "pages_fetched": 3,
            "status_code": 200,
        }

        res = self.service.reconcile_zone("MALACCA_STRAIT")
        self.assertTrue(res["success"])
        self.assertEqual(res["discovered"], 3)
        self.assertEqual(res["new"], 3)
        self.assertEqual(self.registry.count(), 3)

    def test_checkpoint_advances_after_successful_reconciliation(self):
        """4. Checkpoint advances after successful reconciliation."""
        self.assertIsNone(self.service.get_zone_checkpoint("MALACCA_STRAIT"))

        self.mock_catalogue.search_sentinel1_grd.return_value = {
            "success": True,
            "features": [make_stac_feature("S1A_CP_PROD_01")],
            "status_code": 200,
        }

        res = self.service.reconcile_zone("MALACCA_STRAIT")
        self.assertTrue(res["success"])
        self.assertTrue(res["checkpoint_advanced"])

        new_cp = self.service.get_zone_checkpoint("MALACCA_STRAIT")
        self.assertIsNotNone(new_cp)
        self.assertIn("T", new_cp)

        # Ensure persisted to disk
        new_service_instance = ScreeningService(
            catalogue_service=self.mock_catalogue,
            acquisition_registry=self.registry,
            quality_gate=self.quality_gate,
            zones=self.zones,
            checkpoints_path=self.cp_file,
        )
        self.assertEqual(new_service_instance.get_zone_checkpoint("MALACCA_STRAIT"), new_cp)

    def test_checkpoint_does_not_advance_after_failed_reconciliation(self):
        """5. Checkpoint does NOT advance if catalogue request fails."""
        initial_cp = "2026-08-25T10:00:00Z"
        self.service.set_zone_checkpoint("MALACCA_STRAIT", initial_cp)

        # Simulate CDSE network failure
        self.mock_catalogue.search_sentinel1_grd.return_value = {
            "success": False,
            "error": "Copernicus token timeout",
            "status_code": 504,
        }

        res = self.service.reconcile_zone("MALACCA_STRAIT")
        self.assertFalse(res["success"])
        self.assertFalse(res.get("checkpoint_advanced", False))
        self.assertEqual(
            self.service.get_zone_checkpoint("MALACCA_STRAIT"),
            initial_cp,
            "Checkpoint must be preserved on failed query",
        )

    def test_overlap_window_does_not_cause_duplicate_registry_records(self):
        """6. Overlap window querying earlier time does not produce duplicate records."""
        feat = make_stac_feature("S1A_OVERLAP_TEST_01", dt="2026-08-29T11:30:00Z")
        self.mock_catalogue.search_sentinel1_grd.return_value = {
            "success": True,
            "features": [feat],
            "status_code": 200,
        }

        # Cycle 1
        self.service.run_reconciliation_cycle(zone_id="MALACCA_STRAIT")
        self.assertEqual(self.registry.count(), 1)

        # Cycle 2 with overlap window returning the exact same feature
        self.service.run_reconciliation_cycle(zone_id="MALACCA_STRAIT")
        self.assertEqual(self.registry.count(), 1)

    def test_quality_gate_is_invoked(self):
        """7. Quality gate is invoked on newly discovered scenes: reject vs pass."""
        good_feat = make_stac_feature("S1A_GOOD_VV_VH", pol=["VV", "VH"])
        bad_feat = make_stac_feature("S1A_BAD_HH_ONLY", pol=["HH", "HV"])  # Lacks VV

        self.mock_catalogue.search_sentinel1_grd.return_value = {
            "success": True,
            "features": [good_feat, bad_feat],
            "status_code": 200,
        }

        res = self.service.reconcile_zone("MALACCA_STRAIT")
        self.assertEqual(res["passed_quality"], 1)
        self.assertEqual(res["rejected_quality"], 1)

        good_rec = self.registry.get_by_product_id("S1A_GOOD_VV_VH")
        self.assertEqual(good_rec["status"], "CLEAN")

        bad_rec = self.registry.get_by_product_id("S1A_BAD_HH_ONLY")
        self.assertEqual(bad_rec["status"], "REJECTED_QUALITY")
        self.assertTrue(any("VV" in r for r in bad_rec["quality_reasons"]))

    def test_one_bad_product_does_not_crash_whole_cycle(self):
        """8. One corrupt product in feature list does not abort the entire cycle."""
        corrupt_feat = {"id": None}  # Missing ID and properties
        valid_feat = make_stac_feature("S1A_VALID_AFTER_CORRUPT")

        self.mock_catalogue.search_sentinel1_grd.return_value = {
            "success": True,
            "features": [corrupt_feat, valid_feat],
            "status_code": 200,
        }

        res = self.service.reconcile_zone("MALACCA_STRAIT")
        self.assertTrue(res["success"])
        self.assertEqual(res["new"], 1)
        self.assertIsNotNone(self.registry.get_by_product_id("S1A_VALID_AFTER_CORRUPT"))


class TestScreeningApiEndpoints(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()
        self.client.testing = True

    @patch("screening_service.Sentinel1CatalogueService.search_sentinel1_grd")
    def test_manual_post_screening_run_endpoint(self, mock_search):
        """9. POST /api/screening/run triggers reconciliation and returns structured summary."""
        mock_search.return_value = {
            "success": True,
            "features": [make_stac_feature("S1A_API_MOCK_RUN_01")],
            "status_code": 200,
        }

        res = self.client.post("/api/screening/run", json={"zone_id": "MALACCA_STRAIT"})
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        summary = data["summary"]
        self.assertIn("discovered", summary)
        self.assertIn("new", summary)
        self.assertIn("duplicates", summary)
        self.assertIn("passed_quality", summary)
        self.assertIn("rejected_quality", summary)
        self.assertIn("failed", summary)

    def test_get_screening_status_endpoint(self):
        """10. GET /api/screening/status returns complete telemetry object."""
        res = self.client.get("/api/screening/status")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        status = data["status"]
        self.assertIn("running", status)
        self.assertIn("last_run_started", status)
        self.assertIn("last_run_completed", status)
        self.assertIn("last_successful_reconciliation", status)
        self.assertIn("zones_checked", status)
        self.assertIn("products_discovered_last_run", status)
        self.assertIn("products_new_last_run", status)
        self.assertIn("products_rejected_last_run", status)
        self.assertIn("products_passed_last_run", status)
        self.assertIn("current_checkpoint", status)
        self.assertIn("last_error", status)


if __name__ == "__main__":
    unittest.main()
