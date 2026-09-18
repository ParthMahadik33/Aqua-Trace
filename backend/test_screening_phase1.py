import os
import json
import shutil
import tempfile
import unittest
from pathlib import Path

from app import app, acquisition_registry
from acquisition_registry import AcquisitionRegistry
from quality_gate import (
    QualityGate,
    STATUS_PASS,
    STATUS_REJECT,
    STATUS_UNAVAILABLE,
)


class TestAcquisitionRegistry(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp(prefix="aquatrace_test_reg_")
        self.reg_file = os.path.join(self.test_dir, "test_acquisitions.json")
        self.registry = AcquisitionRegistry(storage_path=self.reg_file)

    def tearDown(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_first_acquisition_insert(self):
        """1. First acquisition insert must populate defaults and persist to disk."""
        data = {
            "product_id": "S1A_IW_GRDH_1SDV_20260829T120000_TEST01",
            "zone_id": "MUMBAI_GUJARAT",
            "acquisition_time_utc": "2026-08-29T12:00:00Z",
            "bbox": [69.0, 18.5, 72.5, 21.0],
            "platform": "Sentinel-1A",
            "instrument_mode": "IW",
            "polarization": ["VV", "VH"],
        }
        rec, is_new = self.registry.register(data)
        self.assertTrue(is_new)
        self.assertEqual(rec["product_id"], data["product_id"])
        self.assertEqual(rec["zone_id"], "MUMBAI_GUJARAT")
        self.assertTrue(rec["id"].startswith("acq_"))
        self.assertEqual(rec["status"], "DISCOVERED")
        self.assertEqual(rec["classification"], "UNSCREENED")
        self.assertEqual(self.registry.count(), 1)

        # Confirm written to disk
        self.assertTrue(os.path.exists(self.reg_file))
        with open(self.reg_file, "r", encoding="utf-8") as f:
            disk_data = json.load(f)
            self.assertEqual(disk_data["count"], 1)
            self.assertEqual(disk_data["acquisitions"][0]["product_id"], data["product_id"])

    def test_duplicate_product_id(self):
        """2. product_id must be canonical unique identity; re-inserting must not duplicate."""
        data1 = {
            "product_id": "S1A_IW_GRDH_1SDV_20260829T120000_CANONICAL_01",
            "zone_id": "MALACCA_STRAIT",
            "acquisition_time_utc": "2026-08-29T12:00:00Z",
            "status": "DISCOVERED",
        }
        rec1, is_new1 = self.registry.register(data1)
        self.assertTrue(is_new1)
        self.assertEqual(self.registry.count(), 1)
        original_id = rec1["id"]
        original_created_at = rec1["created_at"]

        # Re-register with updated status and quality
        data2 = {
            "product_id": "S1A_IW_GRDH_1SDV_20260829T120000_CANONICAL_01",
            "status": "QUALITY_PASSED",
            "screening_score": 0.88,
        }
        rec2, is_new2 = self.registry.register(data2)
        self.assertFalse(is_new2)  # Not newly created
        self.assertEqual(self.registry.count(), 1, "Count must remain 1 on duplicate product_id")
        self.assertEqual(rec2["id"], original_id, "Internal id must be preserved")
        self.assertEqual(rec2["created_at"], original_created_at, "created_at must be preserved")
        self.assertEqual(rec2["status"], "QUALITY_PASSED", "Field must be updated")
        self.assertEqual(rec2["screening_score"], 0.88)

    def test_registry_persistence(self):
        """3. Persist safely so a backend restart does not destroy acquisition history."""
        sample_records = [
            {"product_id": "S1A_TEST_PERSIST_01", "zone_id": "ALL_INDIA"},
            {"product_id": "S1A_TEST_PERSIST_02", "zone_id": "CHENNAI_VIZAG"},
            {"product_id": "S1A_TEST_PERSIST_03", "zone_id": "MALACCA_STRAIT"},
        ]
        for r in sample_records:
            self.registry.register(r)
        self.assertEqual(self.registry.count(), 3)

        # Simulate backend restart by instantiating a completely new registry object pointing to the file
        new_registry = AcquisitionRegistry(storage_path=self.reg_file)
        self.assertEqual(new_registry.count(), 3)
        found = new_registry.get_by_product_id("S1A_TEST_PERSIST_02")
        self.assertIsNotNone(found)
        self.assertEqual(found["zone_id"], "CHENNAI_VIZAG")

    def test_malformed_registry_recovery(self):
        """4. Handle corrupt or non-JSON file gracefully by creating valid empty registry and logging."""
        # Intentionally write garbage into registry file
        with open(self.reg_file, "w", encoding="utf-8") as f:
            f.write("{!! NOT VALID JSON == %%% CORRUPT FILE >>")

        # Initializing registry must not crash
        recovered_reg = AcquisitionRegistry(storage_path=self.reg_file)
        self.assertEqual(recovered_reg.count(), 0)

        # It must be able to register new records immediately
        rec, is_new = recovered_reg.register({"product_id": "S1A_AFTER_RECOVERY_01"})
        self.assertTrue(is_new)
        self.assertEqual(recovered_reg.count(), 1)


class TestQualityGate(unittest.TestCase):
    def setUp(self):
        self.gate = QualityGate()

    def test_valid_quality_gate(self):
        """5. Valid quality gate: realistic Sentinel-1 GRD product passes all checks."""
        valid_acquisition = {
            "product_id": "S1A_IW_GRDH_1SDV_20260829T123000_VALID_01",
            "acquisition_time_utc": "2026-08-29T12:30:00Z",
            "collection": "sentinel-1-grd",
            "instrument_mode": "IW",
            "polarization": ["VV", "VH"],
            "bbox": [100.0, 2.0, 103.0, 4.5],
        }
        zone_bbox = [99.5, 1.0, 104.5, 6.0]  # Intersecting Malacca Strait zone

        res = self.gate.evaluate(valid_acquisition, zone_bbox=zone_bbox)
        self.assertTrue(res["passed"], f"Quality gate should pass, failed reasons: {res['reasons']}")
        self.assertEqual(res["checks"]["metadata"]["status"], STATUS_PASS)
        self.assertEqual(res["checks"]["collection"]["status"], STATUS_PASS)
        self.assertEqual(res["checks"]["polarization"]["status"], STATUS_PASS)
        self.assertEqual(res["checks"]["coverage"]["status"], STATUS_PASS)
        self.assertEqual(res["checks"]["aoi_overlap"]["status"], STATUS_PASS)
        self.assertEqual(res["checks"]["nodata"]["status"], STATUS_UNAVAILABLE)
        self.assertEqual(res["checks"]["wind"]["status"], STATUS_UNAVAILABLE)
        self.assertEqual(len(res["reasons"]), 0)

    def test_invalid_metadata(self):
        """6. Invalid metadata: missing product_id or invalid bbox triggers REJECT."""
        # Case A: Missing product_id
        res_no_id = self.gate.evaluate({
            "product_id": "",
            "acquisition_time_utc": "2026-08-29T12:00:00Z",
            "bbox": [70.0, 18.0, 72.0, 20.0],
            "polarization": ["VV"],
        })
        self.assertFalse(res_no_id["passed"])
        self.assertEqual(res_no_id["checks"]["metadata"]["status"], STATUS_REJECT)

        # Case B: Inverted bbox (min > max)
        res_inv_bbox = self.gate.evaluate({
            "product_id": "S1A_INVERTED_BBOX_TEST",
            "acquisition_time_utc": "2026-08-29T12:00:00Z",
            "bbox": [75.0, 22.0, 70.0, 18.0],
            "polarization": ["VV"],
        })
        self.assertFalse(res_inv_bbox["passed"])
        self.assertEqual(res_inv_bbox["checks"]["metadata"]["status"], STATUS_REJECT)

    def test_unsupported_polarization(self):
        """7. Unsupported polarization: missing VV channel triggers REJECT."""
        hh_only_acquisition = {
            "product_id": "S1A_HH_ONLY_TEST",
            "acquisition_time_utc": "2026-08-29T12:00:00Z",
            "collection": "sentinel-1-grd",
            "instrument_mode": "IW",
            "polarization": ["HH", "HV"],  # Lacks VV
            "bbox": [100.0, 2.0, 103.0, 4.5],
        }
        res = self.gate.evaluate(hh_only_acquisition)
        self.assertFalse(res["passed"])
        self.assertEqual(res["checks"]["polarization"]["status"], STATUS_REJECT)
        self.assertTrue(any("VV" in r for r in res["reasons"]))

    def test_missing_wind_treated_as_unavailable(self):
        """8. Missing wind treated as unavailable rather than fatal."""
        acq = {
            "product_id": "S1A_NO_WIND_TEST",
            "acquisition_time_utc": "2026-08-29T12:00:00Z",
            "collection": "sentinel-1-grd",
            "instrument_mode": "IW",
            "polarization": ["VV", "VH"],
            "bbox": [100.0, 2.0, 103.0, 4.5],
        }
        # Explicitly pass wind_data=None
        res = self.gate.evaluate(acq, wind_data=None)
        self.assertTrue(res["passed"], "Missing wind observation must not cause quality rejection")
        self.assertEqual(res["checks"]["wind"]["status"], STATUS_UNAVAILABLE)
        self.assertNotIn("wind", [r.lower() for r in res["reasons"]])

    def test_wind_screening_guideline_evaluated_when_present(self):
        """Wind is evaluated against operational screening thresholds when provided."""
        acq = {
            "product_id": "S1A_WIND_EVAL_TEST",
            "acquisition_time_utc": "2026-08-29T12:00:00Z",
            "collection": "sentinel-1-grd",
            "instrument_mode": "IW",
            "polarization": ["VV"],
            "bbox": [100.0, 2.0, 103.0, 4.5],
        }

        # Wind in operational guideline (e.g. 5.5 m/s) -> PASS
        res_pass = self.gate.evaluate(acq, wind_data={"speed_ms": 5.5})
        self.assertTrue(res_pass["passed"])
        self.assertEqual(res_pass["checks"]["wind"]["status"], STATUS_PASS)

        # Calm wind (1.5 m/s < 3.0 m/s minimum screening guideline) -> REJECT
        res_calm = self.gate.evaluate(acq, wind_data={"speed_ms": 1.5})
        self.assertFalse(res_calm["passed"])
        self.assertEqual(res_calm["checks"]["wind"]["status"], STATUS_REJECT)

        # Storm wind (15.0 m/s > 10.0 m/s maximum screening guideline) -> REJECT
        res_gale = self.gate.evaluate(acq, wind_data={"speed_ms": 15.0})
        self.assertFalse(res_gale["passed"])
        self.assertEqual(res_gale["checks"]["wind"]["status"], STATUS_REJECT)


class TestAcquisitionEndpoints(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()
        self.client.testing = True

        # Register two test acquisitions
        acquisition_registry.register({
            "product_id": "S1A_API_ENDPOINT_TEST_01",
            "zone_id": "MUMBAI_GUJARAT",
            "acquisition_time_utc": "2026-08-29T10:00:00Z",
            "status": "DISCOVERED",
        })
        acquisition_registry.register({
            "product_id": "S1A_API_ENDPOINT_TEST_02",
            "zone_id": "MALACCA_STRAIT",
            "acquisition_time_utc": "2026-08-29T14:00:00Z",
            "status": "QUALITY_PASSED",
        })

    def test_get_acquisitions_list(self):
        """GET /api/acquisitions returns list with filtering."""
        res = self.client.get("/api/acquisitions")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertGreaterEqual(data["count"], 2)

        # Test filtering by zone_id
        res_zone = self.client.get("/api/acquisitions?zone_id=MUMBAI_GUJARAT")
        self.assertEqual(res_zone.status_code, 200)
        data_zone = res_zone.get_json()
        self.assertTrue(all(a["zone_id"] == "MUMBAI_GUJARAT" for a in data_zone["acquisitions"]))

    def test_get_acquisition_by_id_and_product_id(self):
        """GET /api/acquisitions/<id> works for internal id or canonical product_id."""
        # By product_id
        res = self.client.get("/api/acquisitions/S1A_API_ENDPOINT_TEST_01")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertEqual(data["acquisition"]["product_id"], "S1A_API_ENDPOINT_TEST_01")

        internal_id = data["acquisition"]["id"]
        # By internal id
        res_internal = self.client.get(f"/api/acquisitions/{internal_id}")
        self.assertEqual(res_internal.status_code, 200)
        self.assertEqual(res_internal.get_json()["acquisition"]["product_id"], "S1A_API_ENDPOINT_TEST_01")

        # Non-existent id
        res_404 = self.client.get("/api/acquisitions/NON_EXISTENT_ID_9999")
        self.assertEqual(res_404.status_code, 404)
        self.assertFalse(res_404.get_json()["success"])


if __name__ == "__main__":
    unittest.main()
