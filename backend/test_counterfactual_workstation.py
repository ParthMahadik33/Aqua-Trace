"""
AquaTrace Counterfactual Workstation — Acceptance & Scientific Rigor Unit Test Suite
Validates all acceptance criteria in acceptance.md, phases.md, and DATA-CONTRACT.md:
1. Particle update dynamics dX/dt = U_ocean + alpha*U10 + diffusion
2. Geodesic, angle, and projection conversions
3. Deterministic golden run reproducibility with random seeds
4. Fixed observation operator extracting density footprint
5. Identical physical parameter policy across all candidates
6. Uncertainty ensemble returns P50 and P95 distributions
7. Decoy candidate discrimination (null separation > 0)
8. Source label leakage test: known source vessel is absent from ranking input
9. Ennore 2017 benchmark case data integrity (Sentinel-1A, ERA5, HYCOM)
10. Baseline evaluation across B0, B1, B2, B3, B4
11. Neutral scientific verdict formulation without guilt or conviction terminology
12. SSE progress stream transitions through defined operational steps
"""

import json
import unittest
from counterfactual_engine import (
    CounterfactualDriftEngine,
    haversine_distance_km,
    km_to_nm,
    sog_kn_to_ms,
    cog_deg_to_uv,
    compute_bbox_iou,
)
from counterfactual_scientific_operator import (
    to_local_meters,
    from_local_meters,
    extract_density_footprint,
    compute_rasterized_polygon_metrics,
    compute_hausdorff_and_chamfer_km,
    evaluate_baselines_b0_to_b4,
)
from counterfactual_benchmark_data import BENCHMARK_CASES
from app import app


class TestCounterfactualWorkstation(unittest.TestCase):
    def setUp(self):
        self.engine = CounterfactualDriftEngine(default_seed=42)
        self.client = app.test_client()

    def test_01_geodesic_projection_and_angle_utilities(self):
        """1. Metric local Cartesian projection maps back accurately to WGS84 coordinates."""
        ref_lon, ref_lat = 80.35, 13.25
        target_lon, target_lat = 80.40, 13.30

        x_m, y_m = to_local_meters(target_lon, target_lat, ref_lon, ref_lat)
        self.assertGreater(x_m, 0.0)
        self.assertGreater(y_m, 0.0)

        recon_lon, recon_lat = from_local_meters(x_m, y_m, ref_lon, ref_lat)
        self.assertAlmostEqual(recon_lon, target_lon, places=5)
        self.assertAlmostEqual(recon_lat, target_lat, places=5)

        # Distance calculation consistency
        dist_km = haversine_distance_km(ref_lat, ref_lon, target_lat, target_lon)
        dist_nm = km_to_nm(dist_km)
        self.assertGreater(dist_km, 0.0)
        self.assertAlmostEqual(dist_nm, dist_km / 1.852, places=4)

        # Course to UV vector
        u, v = cog_deg_to_uv(90.0, 10.0)  # East
        self.assertAlmostEqual(u, 10.0, places=4)
        self.assertAlmostEqual(v, 0.0, places=4)

    def test_02_deterministic_golden_run_reproducible(self):
        """2. Identical parameters and seeds produce bit-exact particle positions and footprints."""
        cand = {"mmsi": "419069100", "lat": 13.245, "lon": 80.348, "sog": 5.0, "cog": 165.0}
        obs = {"centroid": {"lat": 13.210, "lon": 80.340}, "areaKm2": 12.8}

        run1 = self.engine.run_counterfactual_test(cand, obs, seed=42)
        run2 = self.engine.run_counterfactual_test(cand, obs, seed=42)

        self.assertEqual(run1["metrics"], run2["metrics"])
        self.assertEqual(run1["simulation"]["plume_centroid"], run2["simulation"]["plume_centroid"])
        self.assertEqual(run1["simulation"]["particles"][0], run2["simulation"]["particles"][0])
        self.assertEqual(run1["predicted_footprint"]["polygon"], run2["predicted_footprint"]["polygon"])

    def test_03_fixed_observation_operator_and_metrics(self):
        """3. Fixed observation operator extracts 2D density footprint and computes exact metrics."""
        pts = [
            {"id": i, "lat": 13.20 + (i * 0.001), "lon": 80.34 + (i * 0.0005)}
            for i in range(50)
        ]
        poly, stats = extract_density_footprint(pts, ref_lon=80.34, ref_lat=13.20, confidence_level=0.90)

        self.assertGreaterEqual(len(poly), 10)
        self.assertIn("area_km2", stats)
        self.assertGreater(stats["area_km2"], 0.0)
        self.assertIn("centroid", stats)

        # Test rasterized polygon IoU and Dice against itself (must be ~1.0)
        iou_self, dice_self = compute_rasterized_polygon_metrics(poly, poly, ref_lon=80.34, ref_lat=13.20)
        self.assertAlmostEqual(iou_self, 1.0, delta=0.05)
        self.assertAlmostEqual(dice_self, 1.0, delta=0.05)

        # Test Hausdorff distance against self (must be 0.0)
        h_dist, c_dist = compute_hausdorff_and_chamfer_km(poly, poly)
        self.assertAlmostEqual(h_dist, 0.0, delta=0.01)
        self.assertAlmostEqual(c_dist, 0.0, delta=0.01)

    def test_04_same_physical_parameter_policy_across_candidates(self):
        """4. Physical forcing and drift parameters are identically configured across candidates."""
        ennore_case = BENCHMARK_CASES["ENNORE_2017"]
        cands = ennore_case["candidates"]

        obs_slick = ennore_case["sar_observation"]["observed_slick"]
        curr = ennore_case["environmental_forcing"]["current"]
        wind = ennore_case["environmental_forcing"]["wind"]

        res_a = self.engine.run_counterfactual_test(
            candidate=cands[0]["telemetry"],
            observed_slick=obs_slick,
            current_vector=curr,
            wind_vector=wind,
            seed=100,
        )
        res_b = self.engine.run_counterfactual_test(
            candidate=cands[1]["telemetry"],
            observed_slick=obs_slick,
            current_vector=curr,
            wind_vector=wind,
            seed=100,
        )

        # Assumptions & physical coefficients must be identical
        self.assertEqual(res_a["assumptions"][1], res_b["assumptions"][1])
        self.assertEqual(res_a["assumptions"][2], res_b["assumptions"][2])
        self.assertEqual(res_a["simulation"]["environment"]["wind_speed_ms"], res_b["simulation"]["environment"]["wind_speed_ms"])
        self.assertEqual(res_a["simulation"]["environment"]["current_speed_ms"], res_b["simulation"]["environment"]["current_speed_ms"])

    def test_05_uncertainty_ensemble_returns_p50_and_p95_distributions(self):
        """5. Uncertainty simulation yields nested P50 and P95 confidence envelopes."""
        cand = {"mmsi": "419069100", "lat": 13.245, "lon": 80.348, "sog": 4.8, "cog": 165.0}
        obs = {"centroid": {"lat": 13.210, "lon": 80.340}, "areaKm2": 12.8}

        res = self.engine.run_counterfactual_test(cand, obs, seed=42)
        unc = res["uncertainty"]

        self.assertIn("p50_envelope", unc)
        self.assertIn("p95_envelope", unc)
        self.assertGreater(len(unc["p50_envelope"]), 0)
        self.assertGreater(len(unc["p95_envelope"]), 0)
        # P95 area must be greater than P50 area
        self.assertGreater(unc["p95_area_km2"], unc["p50_area_km2"])
        self.assertIn("spread_km", unc)

    def test_06_decoy_discrimination_and_null_separation(self):
        """6. Plausible decoy candidates produce low overlap, high offset, and positive null separation."""
        ennore_case = BENCHMARK_CASES["ENNORE_2017"]
        true_cand = ennore_case["candidates"][0]  # Dawn Kanchipuram
        decoy_cand = ennore_case["candidates"][2]  # MT Chem Orchid (15 NM offshore)

        obs_slick = ennore_case["sar_observation"]["observed_slick"]
        curr = ennore_case["environmental_forcing"]["current"]
        wind = ennore_case["environmental_forcing"]["wind"]

        res_true = self.engine.run_counterfactual_test(
            candidate=true_cand["telemetry"],
            observed_slick=obs_slick,
            current_vector=curr,
            wind_vector=wind,
            seed=42,
        )
        res_decoy = self.engine.run_counterfactual_test(
            candidate=decoy_cand["telemetry"],
            observed_slick=obs_slick,
            current_vector=curr,
            wind_vector=wind,
            seed=42,
        )

        # True candidate must achieve closer centroid offset and higher consistency
        self.assertLess(res_true["metrics"]["centroid_distance_nm"], res_decoy["metrics"]["centroid_distance_nm"])
        self.assertGreater(res_true["evidenceFactors"]["spatialConsistency"], res_decoy["evidenceFactors"]["spatialConsistency"])

        # Decoy verdict must be INCONCLUSIVE
        self.assertEqual(res_decoy["verdict"], "INCONCLUSIVE")

    def test_07_source_label_leakage_prevention(self):
        """7. Candidate ranking does not consume ground truth label during computation."""
        ennore_case = BENCHMARK_CASES["ENNORE_2017"]
        ground_truth = ennore_case["validation_ground_truth"]

        # Ensure ground truth is flagged as validation only
        self.assertIn("validation_note", ground_truth)
        self.assertIn("Hidden from candidate ranking", ground_truth["validation_note"])

        # Candidates input list must not contain guilt or true_source flags in telemetry
        for cand in ennore_case["candidates"]:
            self.assertNotIn("is_guilty", cand)
            self.assertNotIn("true_source", cand)
            self.assertNotIn("is_guilty", cand["telemetry"])

    def test_08_ennore_benchmark_case_data_integrity(self):
        """8. Ennore 2017 benchmark case contains complete authentic metadata, forcing, and candidates."""
        case_data = BENCHMARK_CASES["ENNORE_2017"]
        self.assertTrue(case_data["is_real_benchmark"])

        # SAR metadata
        sar = case_data["sar_observation"]
        self.assertEqual(sar["satellite"], "Sentinel-1A")
        self.assertEqual(sar["product_type"], "GRD")
        self.assertIn("S1A_IW_GRDH_1SDV_20170128", sar["product_id"])
        self.assertEqual(sar["observed_slick"]["area_km2"], 12.8)

        # Forcing metadata
        forcing = case_data["environmental_forcing"]
        self.assertEqual(forcing["source"], "REAL")
        self.assertIn("ERA5", forcing["wind"]["dataset"])
        self.assertIn("HYCOM", forcing["current"]["dataset"])

        # Candidates
        cands = case_data["candidates"]
        self.assertEqual(len(cands), 4)
        mmsis = [c["mmsi"] for c in cands]
        self.assertIn("419069100", mmsis)  # Dawn Kanchipuram
        self.assertIn("235008544", mmsis)  # BW Maple
        self.assertIn("563012900", mmsis)  # Decoy Chem Orchid
        self.assertIn("419098710", mmsis)  # Decoy Coromandel Trader

    def test_09_baseline_b0_to_b4_evaluation(self):
        """9. Baseline evaluation ranks candidates across B0, B1, B2, B3, B4."""
        ennore_case = BENCHMARK_CASES["ENNORE_2017"]
        cands = ennore_case["candidates"]
        obs_slick = ennore_case["sar_observation"]["observed_slick"]

        sim_results = {
            "419069100": {"metrics": {"overlap_iou": 0.58, "centroid_distance_nm": 0.85, "orientation_delta_deg": 12.0, "ensemble_coverage_pct": 85.0}},
            "235008544": {"metrics": {"overlap_iou": 0.22, "centroid_distance_nm": 2.40, "orientation_delta_deg": 35.0, "ensemble_coverage_pct": 40.0}},
            "563012900": {"metrics": {"overlap_iou": 0.00, "centroid_distance_nm": 14.50, "orientation_delta_deg": 78.0, "ensemble_coverage_pct": 0.0}},
            "419098710": {"metrics": {"overlap_iou": 0.00, "centroid_distance_nm": 8.20, "orientation_delta_deg": 65.0, "ensemble_coverage_pct": 5.0}},
        }

        records = evaluate_baselines_b0_to_b4(cands, obs_slick, sim_results)
        self.assertEqual(len(records), 4)

        # Dawn Kanchipuram must achieve rank 1 in B3 and B4
        dawn = next(r for r in records if r["mmsi"] == "419069100")
        self.assertEqual(dawn["b3_rank"], 1)
        self.assertEqual(dawn["b4_rank"], 1)

        # Decoy must have low counterfactual score
        decoy = next(r for r in records if r["mmsi"] == "563012900")
        self.assertEqual(decoy["b3_counterfactual_score"], 0.0)

    def test_10_scientific_honesty_neutral_verdict(self):
        """10. Verdict summary uses neutral evidentiary terminology and excludes legal guilt terms."""
        cand = {"mmsi": "419069100", "name": "TEST TANKER", "lat": 13.245, "lon": 80.348, "sog": 4.8, "cog": 165.0}
        obs = {"centroid": {"lat": 13.210, "lon": 80.340}, "areaKm2": 12.8}

        res = self.engine.run_counterfactual_test(cand, obs)
        verdict = res["verdict"]
        summary = res["summary_explanation"].lower()

        self.assertIn(verdict, ["SUPPORTED", "WEAK", "INCONCLUSIVE"])

        # Strictly exclude criminal/legal guilt language
        forbidden = ["guilty", "convicted", "liable", "culpable", "crime", "illegal", "proves guilt"]
        for word in forbidden:
            self.assertNotIn(word, summary)

    def test_11_rest_endpoints_cases_and_baselines(self):
        """11. REST API endpoints /api/simulation/counterfactual/cases and /baselines work correctly."""
        # 1. Cases endpoint
        r_cases = self.client.get("/api/simulation/counterfactual/cases")
        self.assertEqual(r_cases.status_code, 200)
        data_cases = json.loads(r_cases.data)
        self.assertTrue(data_cases["success"])
        self.assertIn("ENNORE_2017", data_cases["cases"])
        self.assertIn("MALACCA_2026", data_cases["cases"])
        self.assertIn("GERMAN_BIGHT_2024", data_cases["cases"])

        # 2. Baselines endpoint
        r_base = self.client.get("/api/simulation/counterfactual/baselines?case_id=ENNORE_2017")
        self.assertEqual(r_base.status_code, 200)
        data_base = json.loads(r_base.data)
        self.assertTrue(data_base["success"])
        self.assertEqual(len(data_base["baselines"]), 4)

    def test_12_sse_stream_progress_transitions(self):
        """12. SSE streaming endpoint emits structured state transitions from QUEUED to COMPLETED."""
        r_stream = self.client.get("/api/simulation/counterfactual/stream?case_id=ENNORE_2017&candidate_id=CAND_DAWN_KANCHIPURAM")
        self.assertEqual(r_stream.status_code, 200)
        self.assertEqual(r_stream.mimetype, "text/event-stream")

        raw_data = r_stream.data.decode("utf-8")
        events = [line.replace("data: ", "") for line in raw_data.split("\n") if line.startswith("data: ")]
        self.assertGreater(len(events), 5)

        first_evt = json.loads(events[0])
        self.assertEqual(first_evt["step"], "QUEUED")

        last_evt = json.loads(events[-1])
        self.assertEqual(last_evt["step"], "COMPLETED")
        self.assertEqual(last_evt["progress"], 100)
        self.assertIn("result", last_evt)
        self.assertTrue(last_evt["result"]["success"])


if __name__ == "__main__":
    unittest.main()
