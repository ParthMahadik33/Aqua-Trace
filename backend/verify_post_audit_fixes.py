"""
End-to-End Technical Verification for AquaTrace Backend Post-Audit Fixes.
Validates ML inference route, Quality Gate screening, Counterfactual engine,
Lagrangian hindcast engine, screening incidents, and AIS correlation candidate endpoints.
"""

import sys
import unittest
import json
from app import app

class PostAuditBackendVerification(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_01_health_check(self):
        """Verify basic backend health endpoint."""
        resp = self.client.get("/api/health")
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.data)
        self.assertEqual(data.get("status"), "healthy")

    def test_02_ml_classify_endpoint(self):
        """Verify ConvNeXt-Tiny classification endpoint with clean simulated fallback & validation metrics."""
        resp = self.client.post(
            "/api/ml/classify",
            data=json.dumps({"sample_id": "CASE-0004-TEST", "channels": ["VV", "VH"]}),
            content_type="application/json"
        )
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.data)
        self.assertIn("oil_probability", data)
        self.assertEqual(data.get("oil_probability"), 0.987)
        self.assertEqual(data.get("lookalike_probability"), 0.011)
        self.assertEqual(data.get("no_oil_probability"), 0.002)
        self.assertEqual(data.get("model_name"), "ConvNeXt-Tiny")
        self.assertEqual(data.get("mode"), "SIMULATED")
        val = data.get("development_validation", {})
        self.assertAlmostEqual(val.get("macro_f1", 0), 0.6471, places=3)
        self.assertAlmostEqual(val.get("accuracy", 0), 68.29, places=1)

    def test_03_quality_gate_endpoint(self):
        """Verify Stage 02 SAR Quality Gate screening endpoint."""
        resp = self.client.post(
            "/api/screening/quality-gate",
            data=json.dumps({
                "product_id": "S1A_IW_GRDH_1SDV_20180803T172551_GERMAN_BIGHT",
                "polarizations": ["VV", "VH"],
                "incidence_angle_deg": 34.2,
                "nodata_percentage": 0.0,
                "land_coverage_percentage": 0.0
            }),
            content_type="application/json"
        )
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.data)
        self.assertIn("passed", data)
        self.assertTrue(data.get("passed"))
        self.assertIn("checks", data)

    def test_04_counterfactual_simulation(self):
        """Verify Stage 10 Counterfactual dynamic simulation endpoint."""
        resp = self.client.post(
            "/api/simulation/counterfactual",
            data=json.dumps({
                "incident_id": "CASE-0004-GERMAN-BIGHT",
                "candidate": {
                    "mmsi": "244710000",
                    "name": "MT NORDIC POLARIS",
                    "lat": 55.1884,
                    "lon": 5.8122,
                    "sog": 12.4,
                    "cog": 54.0
                },
                "observed_slick": {
                    "centroid": {"lat": 55.2443, "lon": 5.8856},
                    "areaKm2": 4.41,
                    "axisHeadingDeg": 52.0
                },
                "duration_hours": 0.25,
                "environment_source": "PROTOTYPE_BASELINE"
            }),
            content_type="application/json"
        )
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.data)
        self.assertTrue(data.get("success"))
        self.assertIn("metrics", data)
        self.assertIn("simulation", data)
        self.assertIn("particles", data["simulation"])
        self.assertGreater(len(data["simulation"]["particles"]), 0)
        self.assertIn(data.get("verdict"), ["SUPPORTED", "WEAK", "INCONCLUSIVE"])

    def test_05_backward_lagrangian_hindcast(self):
        """Verify Stage 07 Backward Lagrangian ensemble hindcast endpoint."""
        resp = self.client.post(
            "/api/simulation/hindcast",
            data=json.dumps({
                "origin_lat": 55.2443,
                "origin_lon": 5.8856,
                "duration_hours": 18.0,
                "ensemble_size": 5
            }),
            content_type="application/json"
        )
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.data)
        self.assertTrue(data.get("success"))
        self.assertIn("ensembleTrajectories", data)
        self.assertEqual(len(data["ensembleTrajectories"]), 5)
        self.assertIn("originCentroid", data)
        self.assertIn("sourceCorridorPolygon", data)
        self.assertEqual(data.get("mode"), "LAGRANGIAN PROTOTYPE: ENSEMBLE SOURCE RECONSTRUCTION")

    def test_06_incidents_and_candidates(self):
        """Verify incident listings and candidates endpoint."""
        resp = self.client.get("/api/incidents")
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.data)
        self.assertIn("incidents", data)
        incidents = data.get("incidents", [])
        self.assertIsInstance(incidents, list)
        if len(incidents) > 0:
            first_id = incidents[0]["incident_id"]
            cand_resp = self.client.get(f"/api/incidents/{first_id}/candidates")
            self.assertEqual(cand_resp.status_code, 200)
            cand_data = json.loads(cand_resp.data)
            self.assertTrue(cand_data.get("success"))
            self.assertIn("candidates", cand_data)

if __name__ == "__main__":
    unittest.main(verbosity=2)
