"""
AquaTrace Phase 4 Demo Hardening Verification Script:
Demonstrates dynamic AIS candidate correlation, parameter-driven counterfactual drift engine,
deterministic particle plume generation, distinct telemetry-driven verdicts for Vessel A vs B,
explicit environmental semantics, assumptions panel, evidence factor trace, and execution time.
"""

import json
import time
from app import app, incident_store


def run_phase4_demo():
    print("\n" + "=" * 80)
    print("  AQUATRACE PHASE 4 - DYNAMIC COUNTERFACTUAL & AIS CORRELATION DEMO")
    print("=" * 80)

    client = app.test_client()

    # Step 1: Query Incidents from IncidentStore
    print("\n[STEP 1] Fetching real/screened incident from IncidentStore...")
    inc_res = client.get("/api/incidents")
    assert inc_res.status_code == 200, f"Failed to fetch incidents: {inc_res.data}"
    inc_data = json.loads(inc_res.data)
    incidents = inc_data.get("incidents", [])

    if not incidents:
        print("  (!) No incidents in store. Creating demo incident...")
        inc = incident_store.create_incident_from_screening(
            acquisition_record={
                "id": "acq_demo_p4",
                "product_id": "S1A_IW_GRDH_1SDV_20260914T110245_DEMO",
                "zone_id": "MALACCA_STRAIT",
                "acquisition_time_utc": "2026-09-14T11:02:45Z",
                "bbox": [101.3, 3.3, 101.7, 3.7],
            },
            screening_decision={
                "triage_status": "CONFIRMED_OIL",
                "triage_source": "development_adapter",
                "model_version": "dev-adapter-v1",
                "candidate_area_km2": 4.41,
                "candidate_centroid": [101.5, 3.5],
            },
            quality_result={"passed": True},
        )
        incident_id = inc["incident_id"]
    else:
        incident = incidents[0]
        incident_id = incident["incident_id"]

    print(f"  [OK] Target Incident: {incident_id}")

    # Step 2: Dynamic AIS Candidate Correlation
    print(f"\n[STEP 2] Correlating AIS candidates for {incident_id}...")
    cand_res = client.get(f"/api/incidents/{incident_id}/candidates")
    assert cand_res.status_code == 200, f"Failed: {cand_res.data}"
    cand_data = json.loads(cand_res.data)

    candidates = cand_data.get("candidates", [])
    print(f"  [OK] Candidates Correlated: {len(candidates)}")
    print(f"  [OK] Historical AIS Provider Status: {cand_data.get('historical_ais_available')}")
    print(f"  [OK] Data Honesty Note: {cand_data.get('limitation_note')}")

    for idx, c in enumerate(candidates[:2]):
        print(f"    Candidate #{idx+1}: {c['name']} (MMSI: {c['mmsi']}) | Dist: {c.get('distance_to_source_nm', 'N/A')} NM | Course: {c.get('courseAtClosestApproachDeg', c.get('cog', 'N/A'))} deg | Speed: {c.get('speedAtClosestApproachKn', c.get('sog', 'N/A'))} kn")

    assert len(candidates) >= 2, "Expected at least 2 candidate vessels"
    vessel_a = candidates[0]
    vessel_b = candidates[1]

    # Step 3: Run Counterfactual Test for Vessel A (MT MALACCA PIONEER)
    print(f"\n[STEP 3] Executing Counterfactual Drift Engine for Vessel A: {vessel_a['name']}...")
    payload_a = {
        "incident_id": incident_id,
        "candidate": {
            "mmsi": vessel_a["mmsi"],
            "name": vessel_a["name"],
            "lat": vessel_a.get("lat", 3.48),
            "lon": vessel_a.get("lon", 101.48),
            "sog": vessel_a.get("speedAtClosestApproachKn", 13.8),
            "cog": vessel_a.get("courseAtClosestApproachDeg", 52.0),
        },
        "observed_slick": {
            "centroid": cand_data.get("source_region", {"lat": 3.5, "lon": 101.5}),
            "areaKm2": 4.41,
            "axisHeadingDeg": 50.0,
        },
        "duration_hours": 0.25,
        "seed": 42,
    }
    t0 = time.perf_counter()
    res_a = client.post("/api/simulation/counterfactual", json=payload_a)
    elapsed_ms_a = (time.perf_counter() - t0) * 1000.0
    assert res_a.status_code == 200, f"Simulation failed: {res_a.data}"
    out_a = json.loads(res_a.data)

    print(f"  [PERF] Calculation Time: {elapsed_ms_a:.2f} ms")
    print(f"  [OK] Model: {out_a['simulation']['model_type']}")
    print(f"  [OK] Environmental Source: {out_a['environmental_forcing']['environment_source']} ({out_a['environmental_forcing']['source_label']})")
    print(f"  [OK] Current: {out_a['environmental_forcing']['current_speed_ms']} m/s @ {out_a['environmental_forcing']['current_direction_deg']} deg")
    print(f"  [OK] Wind: {out_a['environmental_forcing']['wind_speed_ms']} m/s @ {out_a['environmental_forcing']['wind_direction_deg']} deg")
    print(f"  [OK] Simulated Particles: {len(out_a['simulation']['particles'])} points")
    print(f"  [OK] Plume Centroid: {out_a['simulation']['plume_centroid']}")
    print(f"  [OK] Centroid Distance Offset: {out_a['metrics']['centroid_distance_nm']} NM")
    print(f"  [OK] Orientation Delta: +/-{out_a['metrics']['orientation_delta_deg']} deg")
    print(f"  [OK] Spatial Consistency: {out_a['evidenceFactors']['spatialConsistency']}%")
    print(f"  [OK] Trajectory Consistency: {out_a['evidenceFactors']['trajectoryConsistency']}%")
    print(f"  [OK] Final Hypothesis Verdict: {out_a['verdict']} ({out_a['verdictLabel']})")
    print(f"  [OK] Verdict Explanation: \"{out_a['summary_explanation']}\"")
    print(f"  [OK] Forecast Timeline Snapshots: {[f['time_label'] for f in out_a['forecastTimeline']]}")
    
    print("\n  [EVIDENCE FACTOR TRACE - CANDIDATE A]")
    for factor in out_a.get("evidence_factor_trace", []):
        print(f"    - {factor['factor']:<22}: calc={factor['calculated_value']:<10} score={factor['normalized_score']:<5}% ({factor['explanation']})")

    # Step 4: Run Counterfactual Test for Vessel B (MV OCEAN FREIGHTER)
    print(f"\n[STEP 4] Executing Counterfactual Drift Engine for Vessel B: {vessel_b['name']}...")
    payload_b = {
        "incident_id": incident_id,
        "candidate": {
            "mmsi": vessel_b["mmsi"],
            "name": vessel_b["name"],
            "lat": vessel_b.get("lat", 3.90),
            "lon": vessel_b.get("lon", 102.20),
            "sog": vessel_b.get("speedAtClosestApproachKn", 8.4),
            "cog": vessel_b.get("courseAtClosestApproachDeg", 185.0),
        },
        "observed_slick": {
            "centroid": cand_data.get("source_region", {"lat": 3.5, "lon": 101.5}),
            "areaKm2": 4.41,
            "axisHeadingDeg": 50.0,
        },
        "duration_hours": 0.25,
        "seed": 42,
    }
    t0 = time.perf_counter()
    res_b = client.post("/api/simulation/counterfactual", json=payload_b)
    elapsed_ms_b = (time.perf_counter() - t0) * 1000.0
    assert res_b.status_code == 200, f"Simulation failed: {res_b.data}"
    out_b = json.loads(res_b.data)

    print(f"  [PERF] Calculation Time: {elapsed_ms_b:.2f} ms")
    print(f"  [OK] Plume Centroid: {out_b['simulation']['plume_centroid']}")
    print(f"  [OK] Centroid Distance Offset: {out_b['metrics']['centroid_distance_nm']} NM")
    print(f"  [OK] Orientation Delta: +/-{out_b['metrics']['orientation_delta_deg']} deg")
    print(f"  [OK] Spatial Consistency: {out_b['evidenceFactors']['spatialConsistency']}%")
    print(f"  [OK] Trajectory Consistency: {out_b['evidenceFactors']['trajectoryConsistency']}%")
    print(f"  [OK] Final Hypothesis Verdict: {out_b['verdict']} ({out_b['verdictLabel']})")
    print(f"  [OK] Verdict Explanation: \"{out_b['summary_explanation']}\"")

    print("\n  [EVIDENCE FACTOR TRACE - CANDIDATE B]")
    for factor in out_b.get("evidence_factor_trace", []):
        print(f"    - {factor['factor']:<22}: calc={factor['calculated_value']:<10} score={factor['normalized_score']:<5}% ({factor['explanation']})")

    # Step 5: Assumptions Panel Inspection
    print("\n[STEP 5] Active Assumptions (Judge-Safe):")
    for assumption in out_a.get("assumptions", []):
        print(f"  * {assumption}")

    # Step 6: Verification & Comparison Summary
    print("\n[STEP 6] Comparing Candidate A vs Candidate B Telemetry & Results:")
    print("-" * 80)
    print(f"  Metric                     | Vessel A ({vessel_a['name'][:14]}) | Vessel B ({vessel_b['name'][:14]})")
    print("-" * 80)
    print(f"  Candidate SOG / COG        | {payload_a['candidate']['sog']} kn / {payload_a['candidate']['cog']} deg            | {payload_b['candidate']['sog']} kn / {payload_b['candidate']['cog']} deg")
    print(f"  Centroid Distance Offset   | {out_a['metrics']['centroid_distance_nm']} NM                   | {out_b['metrics']['centroid_distance_nm']} NM")
    print(f"  Orientation Divergence     | +/-{out_a['metrics']['orientation_delta_deg']} deg                    | +/-{out_b['metrics']['orientation_delta_deg']} deg")
    print(f"  Spatial Consistency Score  | {out_a['evidenceFactors']['spatialConsistency']}%                     | {out_b['evidenceFactors']['spatialConsistency']}%")
    print(f"  Trajectory Alignment Score | {out_a['evidenceFactors']['trajectoryConsistency']}%                     | {out_b['evidenceFactors']['trajectoryConsistency']}%")
    print(f"  Hypothesis Test Verdict    | {out_a['verdict']}                  | {out_b['verdict']}")
    print("-" * 80)

    # Sanity checks
    assert out_a["verdict"] == "SUPPORTED", f"Expected Vessel A to be SUPPORTED, got {out_a['verdict']}"
    assert out_b["verdict"] == "INCONCLUSIVE", f"Expected Vessel B to be INCONCLUSIVE, got {out_b['verdict']}"
    assert out_a["metrics"]["centroid_distance_nm"] < out_b["metrics"]["centroid_distance_nm"]
    assert out_a["simulation"]["plume_centroid"] != out_b["simulation"]["plume_centroid"]

    # Language checks (Judge-Safety)
    for res_obj in (out_a, out_b):
        explanation = res_obj["summary_explanation"].lower()
        assert "guilt" not in explanation, "Forbidden word 'guilt' found in verdict explanation"
        assert "responsibility" not in explanation, "Forbidden word 'responsibility' found in verdict explanation"
        assert "confirmed vessel" not in explanation, "Forbidden phrase 'confirmed vessel' found in verdict explanation"

    print("\n[SUCCESS] ALL PHASE 4 DEMO ACCEPTANCE CRITERIA VERIFIED SUCCESSFULLY!")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    run_phase4_demo()
