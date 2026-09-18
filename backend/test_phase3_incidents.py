import json
import os
import shutil
import tempfile
import unittest
from unittest.mock import MagicMock

from config import BOUNDING_BOX_PRESETS
from acquisition_registry import AcquisitionRegistry
from quality_gate import QualityGate
from ai_triage_adapter import DevelopmentAITriageAdapter, BaseAITriageAdapter
from screening_policy import ScreeningPolicy, ScreeningDecision
from incident_store import IncidentStore
from screening_service import ScreeningService
from app import app


class TestPhase3Incidents(unittest.TestCase):
    """
    Phase 3 Test Suite:
    Verifies AI triage adapter, screening policy, automatic incident persistence,
    duplicate prevention, restart durability, and incidents REST API.
    """

    def setUp(self):
        self.test_dir = tempfile.mkdtemp(prefix="aquatrace_phase3_test_")
        self.acq_path = os.path.join(self.test_dir, "acquisitions.json")
        self.chk_path = os.path.join(self.test_dir, "checkpoints.json")
        self.inc_path = os.path.join(self.test_dir, "incidents.json")

        self.registry = AcquisitionRegistry(storage_path=self.acq_path)
        self.incident_store = IncidentStore(storage_path=self.inc_path)
        self.quality_gate = QualityGate()
        self.triage_adapter = DevelopmentAITriageAdapter()
        self.screening_policy = ScreeningPolicy()

        self.mock_catalogue = MagicMock()
        self.zones = {
            "MALACCA_STRAIT": {
                "zone_id": "MALACCA_STRAIT",
                "name": "Malacca Strait Corridor",
                "bbox": [99.5, 1.0, 104.5, 6.0],
                "enabled": True,
                "priority": 1,
            }
        }

        self.service = ScreeningService(
            catalogue_service=self.mock_catalogue,
            acquisition_registry=self.registry,
            quality_gate=self.quality_gate,
            triage_adapter=self.triage_adapter,
            screening_policy=self.screening_policy,
            incident_store=self.incident_store,
            zones=self.zones,
            checkpoints_path=self.chk_path,
        )

        self.app_client = app.test_client()

    def tearDown(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_quality_passed_acquisition_reaches_triage(self):
        """1. Quality-passed acquisition must reach triage."""
        good_feature = {
            "id": "S1A_QUALITY_PASS_01",
            "bbox": [101.0, 2.5, 102.5, 4.0],
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[101.0, 2.5], [102.5, 2.5], [102.5, 4.0], [101.0, 4.0], [101.0, 2.5]]]
            },
            "properties": {
                "datetime": "2026-09-14T10:00:00Z",
                "sar:polarizations": ["VV", "VH"],
                "sar:instrument_mode": "IW",
                "sat:orbit_state": "ascending",
            }
        }
        self.mock_catalogue.search_sentinel1_grd.return_value = {
            "success": True,
            "features": [good_feature],
        }

        # Spy on triage adapter
        spy_adapter = MagicMock(wraps=self.triage_adapter)
        self.service.triage_adapter = spy_adapter

        res = self.service.run_reconciliation_cycle(zone_id="MALACCA_STRAIT")
        self.assertTrue(res["success"])
        self.assertEqual(res["passed_quality"], 1)
        self.assertEqual(res["rejected_quality"], 0)

        # Assert triage was called with the registered acquisition
        self.assertEqual(spy_adapter.triage.call_count, 1)
        called_arg = spy_adapter.triage.call_args[0][0]
        self.assertEqual(called_arg["product_id"], "S1A_QUALITY_PASS_01")

    def test_quality_rejected_acquisition_does_not_reach_triage(self):
        """2. Quality-rejected acquisition must NOT reach triage."""
        rejected_feature = {
            "id": "S1A_BAD_POLARIZATION_HH",
            "bbox": [101.0, 2.5, 102.5, 4.0],
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[101.0, 2.5], [102.5, 2.5], [102.5, 4.0], [101.0, 4.0], [101.0, 2.5]]]
            },
            "properties": {
                "datetime": "2026-09-14T10:00:00Z",
                "sar:polarizations": ["HH", "HV"],  # Lacks VV
                "sar:instrument_mode": "IW",
            }
        }
        self.mock_catalogue.search_sentinel1_grd.return_value = {
            "success": True,
            "features": [rejected_feature],
        }

        spy_adapter = MagicMock(wraps=self.triage_adapter)
        self.service.triage_adapter = spy_adapter

        res = self.service.run_reconciliation_cycle(zone_id="MALACCA_STRAIT")
        self.assertTrue(res["success"])
        self.assertEqual(res["passed_quality"], 0)
        self.assertEqual(res["rejected_quality"], 1)

        # Triage must NEVER be called
        self.assertEqual(spy_adapter.triage.call_count, 0)

    def test_deterministic_development_adapter_returns_valid_schema(self):
        """3. Deterministic development adapter returns a valid schema with explicit adapter labels."""
        adapter = DevelopmentAITriageAdapter()
        acq = {
            "product_id": "S1A_IW_GRDH_TEST_CANDIDATE_01",
            "zone_id": "MALACCA_STRAIT",
            "bbox": [101.0, 2.5, 102.5, 4.0],
            "acquisition_time_utc": "2026-09-14T12:00:00Z",
        }
        result = adapter.triage(acq)

        # Check required schema keys
        expected_keys = {
            "status",
            "oil_probability",
            "lookalike_probability",
            "no_oil_probability",
            "candidate_geometry",
            "candidate_area_km2",
            "candidate_centroid",
            "model_version",
            "source",
            "triage_mode",
            "rationale",
        }
        self.assertTrue(expected_keys.issubset(result.keys()))
        self.assertIn(result["status"], ["NO_OIL", "LOOKALIKE", "POSSIBLE_OIL", "REVIEW"])
        self.assertEqual(result["model_version"], "development-adapter-v1")
        self.assertEqual(result["source"], "development_adapter")
        self.assertEqual(result["triage_mode"], "DEVELOPMENT ADAPTER")

    def test_no_fake_numeric_confidence_values(self):
        """4. Verify no fake numeric confidence percentages are fabricated."""
        adapter = DevelopmentAITriageAdapter()
        samples = [
            {"product_id": "S1A_CLEAN_OCEAN", "bbox": [100.0, 2.0, 102.0, 3.0]},
            {"product_id": "S1A_CANDIDATE_ANOMALY", "bbox": [101.0, 2.5, 102.5, 4.0]},
            {"product_id": "S1A_LOOKALIKE_TEST", "is_demo_candidate": False},
        ]
        for s in samples:
            res = adapter.triage(s)
            self.assertIsNone(res["oil_probability"], f"oil_probability must be None, got {res['oil_probability']}")
            self.assertIsNone(res["lookalike_probability"], "lookalike_probability must be None")
            self.assertIsNone(res["no_oil_probability"], "no_oil_probability must be None")

    def test_screening_policy_creates_incident_only_for_review_or_priority(self):
        """5. Screening policy creates incident only for REVIEW / PRIORITY, not ARCHIVE / MONITOR."""
        policy = ScreeningPolicy()

        # Quality failed -> ARCHIVE
        eval_q_fail = policy.evaluate(
            quality_result={"passed": False, "reasons": ["No overlap"]},
            triage_result={"status": "POSSIBLE_OIL"}
        )
        self.assertEqual(eval_q_fail["decision"], ScreeningDecision.ARCHIVE.value)

        # Triage NO_OIL -> ARCHIVE
        eval_no_oil = policy.evaluate(
            quality_result={"passed": True},
            triage_result={"status": "NO_OIL"}
        )
        self.assertEqual(eval_no_oil["decision"], ScreeningDecision.ARCHIVE.value)

        # Triage LOOKALIKE -> MONITOR
        eval_lookalike = policy.evaluate(
            quality_result={"passed": True},
            triage_result={"status": "LOOKALIKE"}
        )
        self.assertEqual(eval_lookalike["decision"], ScreeningDecision.MONITOR.value)

        # Triage POSSIBLE_OIL -> REVIEW
        eval_possible = policy.evaluate(
            quality_result={"passed": True},
            triage_result={"status": "POSSIBLE_OIL"}
        )
        self.assertEqual(eval_possible["decision"], ScreeningDecision.REVIEW.value)

        # Triage PRIORITY -> PRIORITY
        eval_priority = policy.evaluate(
            quality_result={"passed": True},
            triage_result={"status": "PRIORITY"}
        )
        self.assertEqual(eval_priority["decision"], ScreeningDecision.PRIORITY.value)

    def test_duplicate_acquisition_does_not_create_duplicate_incident(self):
        """6. Duplicate acquisition does not create duplicate incident."""
        acq_record = {
            "id": "acq_test_12345",
            "product_id": "S1A_IW_GRDH_DUPLICATE_CHECK_01",
            "zone_id": "MALACCA_STRAIT",
            "acquisition_time_utc": "2026-09-14T08:00:00Z",
            "bbox": [100.0, 2.0, 102.0, 4.0],
        }
        triage_result = {
            "status": "POSSIBLE_OIL",
            "candidate_area_km2": 2.4,
            "candidate_centroid": [101.0, 3.0],
            "candidate_geometry": {"type": "Polygon", "coordinates": []},
            "source": "development_adapter",
            "model_version": "development-adapter-v1",
        }
        quality_result = {"passed": True}

        # First creation
        inc1, created1 = self.incident_store.create_incident(acq_record, triage_result, quality_result)
        self.assertTrue(created1)
        self.assertIsNotNone(inc1.get("incident_id"))

        # Second creation with identical product_id
        inc2, created2 = self.incident_store.create_incident(acq_record, triage_result, quality_result)
        self.assertFalse(created2)
        self.assertEqual(inc1["incident_id"], inc2["incident_id"])
        self.assertEqual(self.incident_store.count(), 1)

    def test_incident_persists_across_restart(self):
        """7. Incident records and sequence persist across application restarts."""
        acq = {
            "id": "acq_persist_01",
            "product_id": "S1A_RESTART_TEST_01",
            "zone_id": "MALACCA_STRAIT",
            "acquisition_time_utc": "2026-09-14T11:00:00Z",
        }
        triage = {
            "status": "REVIEW",
            "candidate_area_km2": 3.1,
            "source": "development_adapter",
            "model_version": "development-adapter-v1",
        }
        inc, _ = self.incident_store.create_incident(acq, triage, {"passed": True})
        inc_id = inc["incident_id"]

        # Simulate fresh process restart loading from the same JSON file
        restarted_store = IncidentStore(storage_path=self.inc_path)
        self.assertEqual(restarted_store.count(), 1)
        loaded = restarted_store.get_by_incident_id(inc_id)
        self.assertIsNotNone(loaded)
        self.assertEqual(loaded["product_id"], "S1A_RESTART_TEST_01")
        self.assertEqual(loaded["candidate_area_km2"], 3.1)
        self.assertEqual(loaded["investigation_state"], "NEW")

        # Create another incident to verify sequence numbering continues correctly
        acq2 = {
            "id": "acq_persist_02",
            "product_id": "S1A_RESTART_TEST_02",
            "zone_id": "MALACCA_STRAIT",
            "acquisition_time_utc": "2026-09-14T12:00:00Z",
        }
        inc2, _ = restarted_store.create_incident(acq2, triage, {"passed": True})
        self.assertEqual(restarted_store.count(), 2)
        self.assertNotEqual(inc_id, inc2["incident_id"])

    def test_incidents_api_endpoints(self):
        """8. Verify incidents REST API endpoints (GET /api/incidents, GET /<id>, POST /<id>/acknowledge)."""
        # Inject incident into global incident_store used by app
        from app import incident_store as app_inc_store
        acq = {
            "id": "acq_api_test_01",
            "product_id": "S1A_API_TEST_PROD_01",
            "zone_id": "MALACCA_STRAIT",
            "acquisition_time_utc": "2026-09-14T09:30:00Z",
            "bbox": [101.0, 2.0, 103.0, 4.0],
        }
        triage = {
            "status": "POSSIBLE_OIL",
            "candidate_area_km2": 1.95,
            "candidate_centroid": [102.0, 3.0],
            "source": "development_adapter",
            "model_version": "development-adapter-v1",
        }
        test_inc, _ = app_inc_store.create_incident(acq, triage, {"passed": True})
        inc_id = test_inc["incident_id"]

        # GET /api/incidents
        res_list = self.app_client.get("/api/incidents")
        self.assertEqual(res_list.status_code, 200)
        list_data = json.loads(res_list.data)
        self.assertIn("incidents", list_data)
        self.assertGreaterEqual(list_data["count"], 1)

        # GET /api/incidents/<incident_id>
        res_item = self.app_client.get(f"/api/incidents/{inc_id}")
        self.assertEqual(res_item.status_code, 200)
        item_data = json.loads(res_item.data)
        self.assertEqual(item_data["incident_id"], inc_id)
        self.assertEqual(item_data["product_id"], "S1A_API_TEST_PROD_01")
        self.assertEqual(item_data["candidate_area_km2"], 1.95)

        # GET /api/incidents/<non_existent> -> 404
        res_404 = self.app_client.get("/api/incidents/INC-9999-NOT-FOUND")
        self.assertEqual(res_404.status_code, 404)

        # POST /api/incidents/<incident_id>/acknowledge
        res_ack = self.app_client.post(f"/api/incidents/{inc_id}/acknowledge", json={"notes": "Investigator assigned"})
        self.assertEqual(res_ack.status_code, 200)
        ack_data = json.loads(res_ack.data)
        self.assertTrue(ack_data["success"])
        self.assertEqual(ack_data["incident"]["investigation_state"], "ACKNOWLEDGED")

    def test_end_to_end_screening_pipeline_to_incident(self):
        """End-to-end integration: discovery -> quality -> triage -> policy -> incident."""
        candidate_feature = {
            "id": "S1A_IW_GRDH_CANDIDATE_DEMO_01",
            "bbox": [100.5, 2.0, 102.5, 4.5],
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[100.5, 2.0], [102.5, 2.0], [102.5, 4.5], [100.5, 4.5], [100.5, 2.0]]]
            },
            "properties": {
                "datetime": "2026-09-14T07:15:00Z",
                "sar:polarizations": ["VV", "VH"],
                "sar:instrument_mode": "IW",
                "sat:orbit_state": "ascending",
            }
        }
        self.mock_catalogue.search_sentinel1_grd.return_value = {
            "success": True,
            "features": [candidate_feature],
        }

        res = self.service.run_reconciliation_cycle(zone_id="MALACCA_STRAIT")
        self.assertTrue(res["success"])
        self.assertEqual(res["passed_quality"], 1)
        self.assertEqual(res["triage_candidates"], 1)
        self.assertEqual(res["incidents_created"], 1)
        self.assertIsNotNone(res.get("last_incident_created"))

        # Verify registry record status is CANDIDATE with incident_id linked
        acq_rec = self.registry.get_by_product_id("S1A_IW_GRDH_CANDIDATE_DEMO_01")
        self.assertIsNotNone(acq_rec)
        self.assertEqual(acq_rec["status"], "CANDIDATE")
        self.assertIn("incident_id", acq_rec)

        # Verify incident record in store
        inc_rec = self.incident_store.get_by_incident_id(acq_rec["incident_id"])
        self.assertIsNotNone(inc_rec)
        self.assertEqual(inc_rec["product_id"], "S1A_IW_GRDH_CANDIDATE_DEMO_01")
        self.assertIn(inc_rec["triage_status"], ["POSSIBLE_OIL", "REVIEW"])
        self.assertEqual(inc_rec["triage_source"], "development_adapter")


if __name__ == "__main__":
    unittest.main()
