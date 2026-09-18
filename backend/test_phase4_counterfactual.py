import json
import unittest
from datetime import datetime, timezone
from counterfactual_engine import (
    CounterfactualDriftEngine,
    haversine_distance_km,
    km_to_nm,
    sog_kn_to_ms,
    cog_deg_to_uv,
    compute_bbox_iou,
)
from ais_correlation_service import AISCorrelationService
from app import app, incident_store


class TestPhase4Counterfactual(unittest.TestCase):
    """
    Phase 4 Validation & Demo-Hardening Test Suite:
    Verifies:
    1. Fallback environmental forcing is explicitly labeled
    2. Real environmental forcing is explicitly labeled
    3. Candidate A and B use their own telemetry
    4. Dynamic metrics are not sourced from Case 0004 constants
    5. Verdict explanation reflects calculated evidence and contains zero guilt terms
    6. Missing / unavailable environment handled safely
    7. Invalid geometry handled safely
    8. Timeline contains T+0 / T+6 / T+12 / T+24 / T+48 checkpoints
    9. Static benchmark remains unchanged without incidentId
    10. Dynamic incident remains dynamic
    """

    def setUp(self):
        self.engine = CounterfactualDriftEngine(default_seed=42)
        self.app_client = app.test_client()

    def test_1_fallback_environmental_forcing_explicitly_labeled(self):
        """1. Fallback environmental forcing is explicitly labeled as PROTOTYPE_BASELINE."""
        cand = {"mmsi": "123456789", "lat": 3.5, "lon": 101.5, "sog": 12.0, "cog": 45.0}
        obs = {"centroid": {"lat": 3.5, "lon": 101.5}}

        # Default run without environment specified
        res = self.engine.run_counterfactual_test(cand, obs)
        self.assertEqual(res["environment"]["source"], "PROTOTYPE_BASELINE")
        self.assertIn("Prototype baseline", res["environment"]["source_label"])
        self.assertIn("Environmental forcing: Prototype baseline", res["assumptions"][-1])

    def test_2_real_environmental_forcing_explicitly_labeled(self):
        """2. Real environmental forcing is explicitly labeled as REAL."""
        cand = {"mmsi": "123456789", "lat": 3.5, "lon": 101.5, "sog": 12.0, "cog": 45.0}
        obs = {"centroid": {"lat": 3.5, "lon": 101.5}}

        res = self.engine.run_counterfactual_test(
            candidate=cand,
            observed_slick=obs,
            current_vector={"velocity_ms": 0.42, "direction_deg": 80.0, "source": "REAL"},
            wind_vector={"speed_ms": 6.1, "direction_deg": 40.0, "source": "REAL"},
            environment_source="REAL",
        )
        self.assertEqual(res["environment"]["source"], "REAL")
        self.assertIn("Real Environmental Observation", res["environment"]["source_label"])
        self.assertEqual(res["environment"]["current_speed_ms"], 0.42)
        self.assertEqual(res["environment"]["wind_speed_ms"], 6.1)

    def test_3_candidate_a_and_b_use_own_telemetry(self):
        """3. Candidate A and Candidate B with different coordinates/headings produce distinct results."""
        observed_slick = {
            "centroid": {"lat": 3.50, "lon": 101.50},
            "areaKm2": 4.4,
            "axisHeadingDeg": 50.0,
        }

        # Candidate A: Near slick, matching course
        candA = {"mmsi": "111111111", "name": "Vessel A", "lat": 3.49, "lon": 101.49, "sog": 14.0, "cog": 50.0}
        # Candidate B: Distant, divergent course
        candB = {"mmsi": "222222222", "name": "Vessel B", "lat": 3.85, "lon": 102.10, "sog": 7.5, "cog": 190.0}

        resA = self.engine.run_counterfactual_test(candA, observed_slick, seed=42)
        resB = self.engine.run_counterfactual_test(candB, observed_slick, seed=42)

        # Telemetry retained
        self.assertEqual(resA["candidate"]["sog"], 14.0)
        self.assertEqual(resB["candidate"]["sog"], 7.5)
        self.assertEqual(resA["candidate"]["cog"], 50.0)
        self.assertEqual(resB["candidate"]["cog"], 190.0)

        # Results must be distinct
        self.assertNotEqual(resA["metrics"]["centroid_distance_nm"], resB["metrics"]["centroid_distance_nm"])
        self.assertNotEqual(resA["metrics"]["orientation_delta_deg"], resB["metrics"]["orientation_delta_deg"])
        self.assertNotEqual(resA["evidenceFactors"]["spatialConsistency"], resB["evidenceFactors"]["spatialConsistency"])
        self.assertNotEqual(resA["simulation"]["particles"], resB["simulation"]["particles"])

        self.assertEqual(resA["verdict"], "SUPPORTED")
        self.assertEqual(resB["verdict"], "INCONCLUSIVE")

    def test_4_dynamic_metrics_not_sourced_from_case0004_constants(self):
        """4. Dynamic incident workflow metrics are derived strictly from inputs, not static Case 0004 values."""
        observed_slick = {
            "centroid": {"lat": 4.12, "lon": 102.35},
            "areaKm2": 6.8,
            "axisHeadingDeg": 75.0,
        }
        cand = {
            "mmsi": "999888777",
            "name": "DYNAMIC TESTER",
            "lat": 4.10,
            "lon": 102.30,
            "sog": 11.2,
            "cog": 72.0,
        }

        res = self.engine.run_counterfactual_test(cand, observed_slick, seed=42)

        # Confirm none of the Case 0004 historical benchmark constants are returned
        self.assertNotEqual(res["metrics"]["centroid_distance_nm"], 0.38)
        self.assertNotEqual(res["metrics"]["overlap_dice_coefficient"], 0.914)
        self.assertNotEqual(res["testResult"]["volumePlausibilityScore"], 95.0)
        self.assertNotEqual(res["testResult"]["volumePlausibilityScore"], 92.0)
        self.assertNotEqual(res["evidenceFactors"]["spatialConsistency"], 81.0)
        self.assertNotEqual(res["evidenceFactors"]["trajectoryConsistency"], 86.0)

    def test_5_verdict_explanation_reflects_calculated_evidence_and_no_guilt(self):
        """5. Verdict explanation reflects calculated evidence and strictly excludes guilt/conviction terminology."""
        observed_slick = {"centroid": {"lat": 3.5, "lon": 101.5}, "axisHeadingDeg": 50.0}

        # Supported case
        cand_sup = {"mmsi": "1", "name": "Vessel Sup", "lat": 3.49, "lon": 101.49, "sog": 12.0, "cog": 50.0}
        res_sup = self.engine.run_counterfactual_test(cand_sup, observed_slick)
        exp_sup = res_sup["summary_explanation"].lower()

        # Inconclusive case
        cand_inc = {"mmsi": "2", "name": "Vessel Inc", "lat": 5.0, "lon": 105.0, "sog": 12.0, "cog": 270.0}
        res_inc = self.engine.run_counterfactual_test(cand_inc, observed_slick)
        exp_inc = res_inc["summary_explanation"].lower()

        for exp in [exp_sup, exp_inc]:
            self.assertNotIn("guilt", exp)
            self.assertNotIn("guilty", exp)
            self.assertNotIn("convicted", exp)
            self.assertNotIn("responsibility", exp)
            self.assertNotIn("confirmed vessel", exp)
            self.assertIn("candidate vessel", exp)

        self.assertIn("supported because", exp_sup)
        self.assertIn("inconclusive because", exp_inc)

    def test_6_missing_environment_handled_safely(self):
        """6. When environmental forcing is UNAVAILABLE, forecast is marked withheld without silent zero-replacement."""
        cand = {"mmsi": "100", "lat": 3.5, "lon": 101.5, "sog": 10.0, "cog": 45.0}
        obs = {"centroid": {"lat": 3.5, "lon": 101.5}}

        res = self.engine.run_counterfactual_test(
            candidate=cand,
            observed_slick=obs,
            environment_source="UNAVAILABLE",
        )
        self.assertTrue(res["success"])
        self.assertEqual(res["environment"]["source"], "UNAVAILABLE")
        self.assertEqual(res["environment"]["forecast_status"], "WITHHELD_DUE_TO_UNAVAILABLE_ENVIRONMENT")
        self.assertIsNone(res["environment"]["current_speed_ms"])

        # Timeline entries must reflect withheld/uncertain status
        timeline = res["forecastTimeline"]
        for entry in timeline:
            self.assertEqual(entry["forecast_status"], "WITHHELD_DUE_TO_UNAVAILABLE_ENVIRONMENT")
            self.assertTrue(entry["uncertain"])

    def test_7_invalid_geometry_handled_safely(self):
        """7. Malformed candidate coordinates or observed geometry are rejected with HTTP 400."""
        # Non-numeric candidate lat
        r1 = self.app_client.post("/api/simulation/counterfactual", json={
            "candidate": {"lat": "abc", "lon": 101.5}
        })
        self.assertEqual(r1.status_code, 400)

        # Out-of-range candidate lat
        r2 = self.app_client.post("/api/simulation/counterfactual", json={
            "candidate": {"lat": 95.0, "lon": 101.5}
        })
        self.assertEqual(r2.status_code, 400)

        # Missing candidate coordinates
        r3 = self.app_client.post("/api/simulation/counterfactual", json={
            "candidate": {"name": "No Coords"}
        })
        self.assertEqual(r3.status_code, 400)

        # Malformed observed centroid
        r4 = self.app_client.post("/api/simulation/counterfactual", json={
            "candidate": {"lat": 3.5, "lon": 101.5},
            "observed_slick": {"centroid": {"lat": "not_a_num", "lon": 101.5}}
        })
        self.assertEqual(r4.status_code, 400)
        self.assertIn("Insufficient geometry", json.loads(r4.data)["error"])

    def test_8_timeline_contains_all_checkpoints(self):
        """8. Timeline contains T+0, T+6h, T+12h, T+24h, T+48h with particle sets."""
        cand = {"mmsi": "100", "lat": 3.5, "lon": 101.5, "sog": 10.0, "cog": 45.0}
        obs = {"centroid": {"lat": 3.5, "lon": 101.5}}

        res = self.engine.run_counterfactual_test(cand, obs)
        timeline = res["forecastTimeline"]
        self.assertEqual(len(timeline), 5)

        expected_labels = ["T+0h", "T+6h", "T+12h", "T+24h", "T+48h"]
        expected_hours = [0.0, 6.0, 12.0, 24.0, 48.0]

        for i, (label, h) in enumerate(zip(expected_labels, expected_hours)):
            self.assertEqual(timeline[i]["time_label"], label)
            self.assertEqual(timeline[i]["time_hours"], h)
            self.assertIn("centroid", timeline[i])
            self.assertIn("particles", timeline[i])
            self.assertEqual(len(timeline[i]["particles"]), 120)

    def test_9_static_benchmark_remains_unchanged_without_incident_id(self):
        """9. Historical Case 0004 German Bight benchmark constants remain intact."""
        from case_0004_data_benchmark import BENCHMARK_METRICS
        self.assertEqual(BENCHMARK_METRICS["overlap_dice_coefficient"], 0.914)
        self.assertEqual(BENCHMARK_METRICS["centroid_offset_distance_nm"], 0.38)
        self.assertEqual(BENCHMARK_METRICS["volume_plausibility_score"], 95.0)

    def test_10_dynamic_incident_remains_dynamic(self):
        """10. Supplying incident_id dynamically retrieves geometry from incident store."""
        # Seed a test dynamic incident
        acq = {
            "id": "acq_dynamic_test",
            "product_id": "S1A_IW_GRDH_1SDV_20260914T120000_DYNAMIC_TEST",
            "zone_id": "STRAIT_OF_MALACCA",
            "bbox": [101.70, 3.80, 101.80, 3.90],
        }
        triage = {
            "status": "HIGH_CONFIDENCE_SLICK",
            "candidate_centroid": [101.75, 3.85],
            "candidate_area_km2": 5.25,
            "source": "development_adapter",
        }
        inc, _ = incident_store.create_incident(acq, triage)

        # Query counterfactual passing this dynamic incident_id
        res = self.app_client.post("/api/simulation/counterfactual", json={
            "incident_id": inc["incident_id"],
            "candidate": {
                "mmsi": "555666777",
                "name": "CORRIDOR TRANSIT",
                "lat": 3.84,
                "lon": 101.74,
                "sog": 12.5,
                "cog": 65.0,
            }
        })
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)

        # Dynamic centroid from incident store used
        self.assertEqual(data["testResult"]["observedSlickStats"]["areaKm2"], 5.25)
        self.assertIn("evidence_factor_trace", data)
        self.assertEqual(len(data["evidence_factor_trace"]), 4)

    def test_11_kinematic_spherical_movement(self):
        """11. Kinematic track generation moves vessel accurately over spherical surface."""
        track = self.engine.simulate_vessel_track(
            start_lat=3.5,
            start_lon=101.5,
            sog_kn=12.0,
            cog_deg=90.0,  # East
            duration_hours=1.0,
            timestep_minutes=15.0,
        )
        self.assertEqual(len(track), 5)
        # Heading East -> lon increases, lat remains approximately constant
        self.assertAlmostEqual(track[-1]["lat"], 3.5, delta=0.01)
        self.assertGreater(track[-1]["lon"], 101.5)
        dist_km = haversine_distance_km(3.5, 101.5, track[-1]["lat"], track[-1]["lon"])
        self.assertAlmostEqual(dist_km, 12.0 * 1.852, delta=0.5)

    def test_12_seeded_prng_determinism(self):
        """12. Identical seeds produce 100% bit-exact particle clouds."""
        track = [{"lat": 3.5, "lon": 101.5, "time_offset_hours": 0.0, "course_deg": 50.0}]
        p1 = self.engine.simulate_plume(track, seed=777)
        p2 = self.engine.simulate_plume(track, seed=777)
        self.assertEqual(p1["plume_centroid"], p2["plume_centroid"])
        self.assertEqual(p1["particles"][0], p2["particles"][0])
    def test_13_timeline_step_particle_evolution(self):
        """13. Timeline snapshots evolve particles across T+0, T+6h, T+12h, T+24h, T+48h."""
        track = [{"lat": 3.5, "lon": 101.5, "time_offset_hours": 0.0, "course_deg": 50.0}]
        res = self.engine.simulate_plume(track, seed=42)
        timeline = res["forecast_timeline"]
        self.assertEqual(len(timeline), 5)
        step_hours = [s["time_hours"] for s in timeline]
        self.assertEqual(step_hours, [0.0, 6.0, 12.0, 24.0, 48.0])

        # Centroid at T+48h has advected further than T+0h
        c0 = timeline[0]["centroid"]
        c48 = timeline[4]["centroid"]
        self.assertNotEqual(c0, c48)
        dist_drift_km = haversine_distance_km(c0["lat"], c0["lon"], c48["lat"], c48["lon"])
        self.assertGreater(dist_drift_km, 10.0)

    def test_14_environmental_source_semantics_and_withheld_forecast(self):
        """14. Environmental source semantics distinguish REAL, PROTOTYPE_BASELINE, and UNAVAILABLE."""
        cand = {"mmsi": "123456789", "lat": 3.5, "lon": 101.5, "sog": 12.0, "cog": 45.0}
        obs = {"centroid": {"lat": 3.5, "lon": 101.5}}

        res_unavail = self.engine.run_counterfactual_test(cand, obs, environment_source="UNAVAILABLE")
        self.assertEqual(res_unavail["environment"]["source"], "UNAVAILABLE")
        self.assertEqual(res_unavail["environment"]["environment_source"], "UNAVAILABLE")
        self.assertIn("WITHHELD", res_unavail["environment"]["forecast_status"])
        self.assertIsNone(res_unavail["environment"]["current_speed_ms"])

        res_proto = self.engine.run_counterfactual_test(cand, obs, environment_source="PROTOTYPE_BASELINE")
        self.assertEqual(res_proto["environment"]["source"], "PROTOTYPE_BASELINE")
        self.assertIn("Prototype baseline", res_proto["environment"]["source_label"])

    def test_15_distinct_observed_and_simulated_layers(self):
        """15. Observed SAR slick and simulated plume are geographically distinct layers with calculated offset."""
        cand = {"mmsi": "999888777", "name": "TEST VESSEL", "lat": 3.84, "lon": 101.74, "sog": 13.0, "cog": 52.0}
        obs = {"centroid": {"lat": 3.85, "lon": 101.75}, "areaKm2": 4.41, "axisHeadingDeg": 50.0}

        res = self.engine.run_counterfactual_test(cand, obs, seed=42)
        sim_c = res["simulation"]["plume_centroid"]
        obs_c = obs["centroid"]

        # Geographically distinct
        self.assertNotEqual((sim_c["lat"], sim_c["lon"]), (obs_c["lat"], obs_c["lon"]))
        self.assertIn("centroid_distance_nm", res["metrics"])
        self.assertGreater(res["metrics"]["centroid_distance_nm"], 0.0)


if __name__ == "__main__":
    unittest.main()

