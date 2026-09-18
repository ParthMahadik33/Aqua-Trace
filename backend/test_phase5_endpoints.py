import unittest
import json
from app import app


class TestPhase5NewEndpoints(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_ml_classify_endpoint_simulation_fallback(self):
        """Test POST /api/ml/classify returns clean simulation fallback with validation metrics."""
        response = self.client.post(
            "/api/ml/classify",
            data=json.dumps({}),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)

        self.assertIn("mode", data)
        self.assertIn("development_validation", data)
        dev_val = data["development_validation"]
        self.assertEqual(dev_val["macro_f1"], 0.6471)
        self.assertEqual(dev_val["accuracy"], 68.29)
        self.assertEqual(dev_val["oil_recall"], 85.0)
        self.assertEqual(dev_val["lookalike_recall"], 67.88)
        self.assertEqual(dev_val["no_oil_recall"], 39.42)

        self.assertEqual(data["oil_probability"], 0.987)
        self.assertEqual(data["lookalike_probability"], 0.011)
        self.assertEqual(data["no_oil_probability"], 0.002)

    def test_quality_gate_endpoint(self):
        """Test POST /api/screening/quality-gate returns evaluated checks."""
        response = self.client.post(
            "/api/screening/quality-gate",
            data=json.dumps({}),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)

        self.assertIn("checks", data)
        self.assertIn("passed", data)
        self.assertTrue(data["passed"])
        self.assertIn("metadata", data["checks"])

    def test_hindcast_backward_advection_endpoint(self):
        """Test POST /api/simulation/hindcast calculates 5 ensemble backward trajectories."""
        response = self.client.post(
            "/api/simulation/hindcast",
            data=json.dumps({
                "origin_lat": 55.2443,
                "origin_lon": 5.8856,
                "duration_hours": 18.0,
            }),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)

        self.assertTrue(data.get("success"))
        self.assertIn("ensembleTrajectories", data)
        self.assertEqual(len(data["ensembleTrajectories"]), 5)
        self.assertIn("originCentroid", data)
        self.assertIn("sourceCorridorPolygon", data)
        self.assertEqual(data["mode"], "LAGRANGIAN PROTOTYPE: ENSEMBLE SOURCE RECONSTRUCTION")


if __name__ == "__main__":
    unittest.main()
