import json
import logging
from app import app, acquisition_registry

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("EndpointVerifier")


def run_verification():
    client = app.test_client()
    client.testing = True

    results = {}

    # 1. Test Root endpoint /
    res_root = client.get("/")
    data_root = res_root.get_json()
    results["root"] = {
        "status_code": res_root.status_code,
        "service": data_root.get("service"),
        "endpoints": data_root.get("endpoints"),
        "acquisitions_registered": data_root.get("acquisitions_registered"),
    }
    assert res_root.status_code == 200, "Root endpoint must return 200"
    assert "/api/acquisitions" in data_root.get("endpoints", []), "Endpoints list must contain /api/acquisitions"

    # 2. Test /api/health
    res_health = client.get("/api/health")
    data_health = res_health.get_json()
    results["health"] = {
        "status_code": res_health.status_code,
        "status": data_health.get("status"),
        "service": data_health.get("service"),
        "preset": data_health.get("preset"),
    }
    assert res_health.status_code == 200, "/api/health must return 200"
    assert data_health.get("status") == "healthy"

    # 3. Test AIS endpoints
    res_ships = client.get("/api/ships")
    data_ships = res_ships.get_json()
    results["ships"] = {
        "status_code": res_ships.status_code,
        "count": data_ships.get("count"),
        "preset": data_ships.get("preset"),
    }
    assert res_ships.status_code == 200, "/api/ships must return 200"

    res_sectors = client.get("/api/sectors")
    data_sectors = res_sectors.get_json()
    results["sectors"] = {
        "status_code": res_sectors.status_code,
        "active_preset": data_sectors.get("active_preset"),
        "preset_count": len(data_sectors.get("presets", {})),
    }
    assert res_sectors.status_code == 200, "/api/sectors must return 200"

    # 4. Test Copernicus test-auth endpoint (does not crash, returns 200 or 401 based on live credentials)
    res_auth = client.get("/api/copernicus/test-auth")
    results["copernicus_auth"] = {
        "status_code": res_auth.status_code,
        "json": res_auth.get_json(),
    }
    assert res_auth.status_code in (200, 401), "/api/copernicus/test-auth should return 200 (if creds set) or 401 (if unset/invalid)"

    # 5. Test Copernicus Sentinel-1 latest endpoint
    res_s1 = client.get("/api/copernicus/sentinel1/latest?days=30")
    results["sentinel1_latest"] = {
        "status_code": res_s1.status_code,
        "json_keys": list(res_s1.get_json().keys()) if res_s1.get_json() else [],
    }
    assert res_s1.status_code in (200, 401, 404, 502), f"Unexpected status {res_s1.status_code} for sentinel1/latest"

    # 6. Test New Acquisition Endpoints
    # Ensure at least one acquisition is registered
    test_acq, _ = acquisition_registry.register({
        "product_id": "S1A_IW_GRDH_1SDV_VERIFICATION_TEST",
        "zone_id": "MUMBAI_GUJARAT",
        "acquisition_time_utc": "2026-08-29T12:00:00Z",
        "status": "QUALITY_PASSED",
        "polarization": ["VV", "VH"],
        "bbox": [69.0, 18.0, 72.0, 21.0],
    })

    res_acqs = client.get("/api/acquisitions")
    data_acqs = res_acqs.get_json()
    results["get_acquisitions"] = {
        "status_code": res_acqs.status_code,
        "success": data_acqs.get("success"),
        "count": data_acqs.get("count"),
        "total": data_acqs.get("total"),
    }
    assert res_acqs.status_code == 200
    assert data_acqs.get("success") is True
    assert data_acqs.get("count") >= 1

    # Test GET /api/acquisitions/<id> by internal id
    res_by_id = client.get(f"/api/acquisitions/{test_acq['id']}")
    data_by_id = res_by_id.get_json()
    assert res_by_id.status_code == 200
    assert data_by_id.get("success") is True
    assert data_by_id["acquisition"]["product_id"] == "S1A_IW_GRDH_1SDV_VERIFICATION_TEST"

    # Test GET /api/acquisitions/<id> by product_id
    res_by_prod = client.get("/api/acquisitions/S1A_IW_GRDH_1SDV_VERIFICATION_TEST")
    assert res_by_prod.status_code == 200
    assert res_by_prod.get_json()["acquisition"]["id"] == test_acq["id"]

    # Test GET /api/acquisitions/<id> 404
    res_404 = client.get("/api/acquisitions/DOES_NOT_EXIST_XYZ")
    assert res_404.status_code == 404
    assert res_404.get_json().get("success") is False

    results["get_acquisition_by_id"] = {
        "status_code_by_id": res_by_id.status_code,
        "status_code_by_product_id": res_by_prod.status_code,
        "status_code_404": res_404.status_code,
    }

    print("\n==================== VERIFICATION RESULTS ====================")
    print(json.dumps(results, indent=2))
    print("==============================================================")
    print("ALL VERIFICATIONS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    run_verification()
