import json
import logging
from app import app, screening_service, acquisition_registry

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ScreeningLiveVerifier")


def run_live_verification():
    client = app.test_client()
    client.testing = True

    print("Step 1: Checking GET /api/screening/status before manual run...")
    res_status_1 = client.get("/api/screening/status")
    assert res_status_1.status_code == 200
    data_status_1 = res_status_1.get_json()["status"]
    print("Initial status:", json.dumps(data_status_1, indent=2))

    print("\nStep 2: Triggering POST /api/screening/run (with Malacca Strait corridor, lookback 14 days)...")
    res_run = client.post("/api/screening/run", json={
        "zone_id": "MALACCA_STRAIT",
        "force_lookback_days": 14,
        "reset_checkpoints": True
    })
    print(f"Run response code: {res_run.status_code}")
    data_run = res_run.get_json()
    print("Run response payload:", json.dumps(data_run, indent=2))

    assert res_run.status_code == 200, f"Screening run failed: {data_run}"
    assert data_run["success"] is True
    summary = data_run["summary"]
    print(f"\n[SUMMARY] Discovered: {summary['discovered']}, New: {summary['new']}, Passed Quality: {summary['passed_quality']}, Rejected Quality: {summary['rejected_quality']}")

    print("\nStep 3: Checking GET /api/screening/status after run...")
    res_status_2 = client.get("/api/screening/status")
    assert res_status_2.status_code == 200
    data_status_2 = res_status_2.get_json()["status"]
    print("Updated status:", json.dumps(data_status_2, indent=2))
    assert data_status_2["last_run_completed"] is not None
    assert "MALACCA_STRAIT" in data_status_2["current_checkpoint"]

    print("\nStep 4: Inspecting registered acquisitions via GET /api/acquisitions...")
    res_acq = client.get("/api/acquisitions?zone_id=MALACCA_STRAIT&limit=5")
    assert res_acq.status_code == 200
    data_acq = res_acq.get_json()
    print(f"Total acquisitions in registry: {data_acq['total']}")
    if data_acq["acquisitions"]:
        sample = data_acq["acquisitions"][0]
        print("Sample registered acquisition:")
        print(f"  ID: {sample['id']}")
        print(f"  Product ID: {sample['product_id']}")
        print(f"  Zone ID: {sample['zone_id']}")
        print(f"  Acquisition Time: {sample['acquisition_time_utc']}")
        print(f"  Status: {sample['status']}")
        print(f"  Quality Passed: {sample['quality_result']['passed'] if sample.get('quality_result') else 'N/A'}")

    print("\nStep 5: Verifying existing Live AIS and health endpoints...")
    res_health = client.get("/api/health")
    assert res_health.status_code == 200
    assert res_health.get_json()["status"] == "healthy"

    res_ships = client.get("/api/ships")
    assert res_ships.status_code == 200

    print("\nALL SCREENING LIVE VERIFICATIONS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    run_live_verification()
