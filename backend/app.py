import logging
from flask import Flask, jsonify, request, Response
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from config import (
    SERVER_HOST,
    SERVER_PORT,
    CORS_ALLOWED_ORIGINS,
    BOUNDING_BOX_PRESETS,
    DEFAULT_SENTINEL1_BBOX,
    SCREENING_AUTO_START,
)
from ais_relay import AISRelayService
from copernicus_service import CopernicusAuthService
from sentinel_service import Sentinel1CatalogueService
from sentinel_process_service import Sentinel1ProcessService
from acquisition_registry import AcquisitionRegistry
from quality_gate import QualityGate
from ai_triage_adapter import DevelopmentAITriageAdapter
from screening_policy import ScreeningPolicy
from incident_store import IncidentStore
from screening_service import ScreeningService
from counterfactual_engine import CounterfactualDriftEngine
from ais_correlation_service import AISCorrelationService
from ml_service import ml_service

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("AquaTraceApp")

app = Flask(__name__)
app.config["SECRET_KEY"] = "aquatrace-secret-key-maritime-ops"

# Enable CORS for all routes
CORS(app, resources={r"/*": {"origins": CORS_ALLOWED_ORIGINS}})

# Initialize Flask-SocketIO with threading mode for cross-platform reliability
socketio = SocketIO(
    app,
    cors_allowed_origins=CORS_ALLOWED_ORIGINS,
    async_mode="threading",
    ping_timeout=30,
    ping_interval=15
)

# Initialize AIS relay service with socketio instance
ais_service = AISRelayService(socketio_instance=socketio)

# Initialize Copernicus OAuth authentication service
copernicus_service = CopernicusAuthService()

# Initialize Copernicus Sentinel-1 catalogue service
sentinel_service = Sentinel1CatalogueService(auth_service=copernicus_service)

# Initialize Copernicus Sentinel-1 Process API rendering service
sentinel_process_service = Sentinel1ProcessService(
    auth_service=copernicus_service,
    catalogue_service=sentinel_service
)

# Initialize Acquisition Registry, Quality Gate, AI Triage Adapter, Policy & Incident Store
acquisition_registry = AcquisitionRegistry()
quality_gate = QualityGate()
ai_triage_adapter = DevelopmentAITriageAdapter()
screening_policy = ScreeningPolicy()
incident_store = IncidentStore()

# Initialize Dynamic Counterfactual Engine and AIS Correlation Service
counterfactual_engine = CounterfactualDriftEngine()
ais_correlation_service = AISCorrelationService(ais_relay_service=ais_service)

# Initialize Autonomous Screening Watcher Service
screening_service = ScreeningService(
    catalogue_service=sentinel_service,
    acquisition_registry=acquisition_registry,
    quality_gate=quality_gate,
    triage_adapter=ai_triage_adapter,
    screening_policy=screening_policy,
    incident_store=incident_store,
)


@app.route("/", methods=["GET"])
def root_status():
    """Root health check endpoint for cloud platforms & Hugging Face Spaces."""
    return jsonify({
        "status": "online",
        "service": "AquaTrace Maritime Intelligence Backend",
        "ais_status": ais_service.connection_status,
        "vessels_tracked": len(ais_service.get_all_ships()),
        "acquisitions_registered": acquisition_registry.count(),
        "incidents_created": incident_store.count(),
        "screening_watcher_active": screening_service.is_running,
        "endpoints": [
            "/api/health",
            "/api/ships",
            "/api/ships/<mmsi>",
            "/api/copernicus/test-auth",
            "/api/copernicus/sentinel1/latest",
            "/api/copernicus/sentinel1/image",
            "/api/acquisitions",
            "/api/acquisitions/<id>",
            "/api/screening/run",
            "/api/screening/status",
            "/api/incidents",
            "/api/incidents/<id>",
            "/api/incidents/<id>/acknowledge",
            "/api/incidents/<id>/candidates",
            "/api/simulation/counterfactual",
            "/socket.io"
        ]
    }), 200


@app.route("/api/health", methods=["GET"])
def api_health():
    """Standard health check endpoint."""
    return jsonify({
        "status": "healthy",
        "service": "AquaTrace Backend",
        "ais_connected": ais_service.connection_status == "CONNECTED"
    }), 200


@app.route("/api/copernicus/test-auth", methods=["GET"])
def test_copernicus_auth():
    """
    Test endpoint for Copernicus Data Space Ecosystem OAuth2 authentication.
    Authenticates via OAuth Client Credentials flow and returns strictly
    { "success": true } if an access token is obtained.
    Never exposes client secret or access token to frontend.
    """
    is_authenticated = copernicus_service.test_connection()
    if is_authenticated:
        return jsonify({"success": True}), 200
    return jsonify({"success": False, "error": "Copernicus authentication failed"}), 401


@app.route("/api/copernicus/sentinel1/latest", methods=["GET"])
def get_latest_sentinel1():
    """
    Search Copernicus Data Space Sentinel Hub Catalog API for the latest available
    sentinel-1-grd acquisition covering the Malacca Strait region (or custom bbox).
    Returns sanitized metadata without exposing tokens or secrets.
    """
    bbox_param = request.args.get("bbox")
    bbox = None
    if bbox_param:
        try:
            parts = [float(p.strip()) for p in bbox_param.split(",")]
            if len(parts) == 4:
                bbox = parts
            else:
                return jsonify({
                    "success": False,
                    "error": "Invalid bbox format. Expected 'min_lon,min_lat,max_lon,max_lat'"
                }), 400
        except ValueError:
            return jsonify({
                "success": False,
                "error": "Invalid bbox coordinates. Must be comma-separated floats."
            }), 400

    days_param = request.args.get("days", 30)
    try:
        days = int(days_param)
        days = max(1, min(days, 180))
    except ValueError:
        days = 30

    result = sentinel_service.get_latest_acquisition(bbox=bbox, days_back=days)
    status_code = result.get("status_code", 200)
    response_data = {k: v for k, v in result.items() if k != "status_code"}
    return jsonify(response_data), status_code


@app.route("/api/copernicus/sentinel1/image", methods=["GET"])
def get_sentinel1_image():
    """
    Fetch and render Sentinel-1 SAR (IW GRD VV) grayscale PNG image using
    Copernicus Data Space Sentinel Hub Process API.

    Query Params (optional):
      - bbox: "min_lon,min_lat,max_lon,max_lat" (defaults to latest acquisition / demonstration bbox)
      - datetime: ISO date/timestamp/range (defaults to latest acquisition date)
      - width: integer pixels (defaults to 512, range 64..2048)
      - height: integer pixels (defaults to 512, range 64..2048)

    Returns:
      Binary PNG image with Content-Type: image/png upon success.
      JSON error with appropriate HTTP status upon failure.
    """
    bbox_param = request.args.get("bbox")
    bbox = None
    if bbox_param:
        try:
            parts = [float(p.strip()) for p in bbox_param.split(",")]
            if len(parts) == 4:
                bbox = parts
            else:
                return jsonify({
                    "success": False,
                    "error": "Invalid bbox format. Expected 'min_lon,min_lat,max_lon,max_lat'"
                }), 400
        except ValueError:
            return jsonify({
                "success": False,
                "error": "Invalid bbox coordinates. Must be comma-separated floats."
            }), 400

    datetime_param = request.args.get("datetime")
    if datetime_param:
        datetime_param = datetime_param.strip()

    width = request.args.get("width", 512)
    height = request.args.get("height", 512)
    try:
        width = max(64, min(int(width), 2048))
    except (ValueError, TypeError):
        width = 512
    try:
        height = max(64, min(int(height), 2048))
    except (ValueError, TypeError):
        height = 512

    img_bytes, metadata_or_error, status_code = sentinel_process_service.fetch_sentinel1_image(
        bbox=bbox,
        datetime_val=datetime_param,
        width=width,
        height=height,
    )

    if img_bytes is not None and status_code == 200:
        resp = Response(img_bytes, mimetype="image/png")
        if metadata_or_error:
            if metadata_or_error.get("time_range"):
                resp.headers["X-AquaTrace-SAR-TimeRange"] = metadata_or_error["time_range"]
            if metadata_or_error.get("product_id"):
                resp.headers["X-AquaTrace-SAR-ProductId"] = metadata_or_error["product_id"]
            
            # Actual processed (intersection) bounding box
            processed_bbox = metadata_or_error.get("processed_bbox") or metadata_or_error.get("bbox")
            if processed_bbox:
                resp.headers["X-AquaTrace-SAR-BBox"] = ",".join(str(x) for x in processed_bbox)
            if metadata_or_error.get("requested_bbox"):
                resp.headers["X-AquaTrace-SAR-RequestedBBox"] = ",".join(str(x) for x in metadata_or_error["requested_bbox"])
            if metadata_or_error.get("product_bbox"):
                resp.headers["X-AquaTrace-SAR-ProductBBox"] = ",".join(str(x) for x in metadata_or_error["product_bbox"])
        return resp

    return jsonify(metadata_or_error or {"success": False, "error": "Failed to generate SAR image"}), status_code


@app.route("/api/acquisitions", methods=["GET"])
def get_acquisitions():
    """
    Returns registered Sentinel-1 acquisitions with optional filtering by zone_id and status.
    """
    zone_id = request.args.get("zone_id")
    status = request.args.get("status")
    limit_param = request.args.get("limit", 50)
    try:
        limit = max(1, min(int(limit_param), 200))
    except (ValueError, TypeError):
        limit = 50

    records = acquisition_registry.list_all(zone_id=zone_id, status=status, limit=limit)
    return jsonify({
        "success": True,
        "count": len(records),
        "total": acquisition_registry.count(),
        "acquisitions": records
    }), 200


@app.route("/api/acquisitions/<acq_id>", methods=["GET"])
def get_acquisition_by_id(acq_id: str):
    """
    Retrieves detailed metadata, quality result, and screening state for a specific acquisition.
    Matches either internal acquisition id or canonical product_id.
    """
    record = acquisition_registry.get_by_id(acq_id.strip())
    if not record:
        return jsonify({
            "success": False,
            "error": "Acquisition not found",
            "id": acq_id
        }), 404

    return jsonify({
        "success": True,
        "acquisition": record
    }), 200


@app.route("/api/screening/run", methods=["POST"])
def trigger_screening_run():
    """
    Manually triggers one autonomous satellite screening reconciliation cycle.
    Accepts optional JSON / query parameters:
      - zone_id: string (optional, target a single zone e.g. MALACCA_STRAIT)
      - force_lookback_days: integer (optional, override checkpoint for lookback)
      - reset_checkpoints: boolean (optional, clear zone checkpoints before running)
    """
    data = request.get_json(silent=True) or {}
    zone_id = data.get("zone_id") or request.args.get("zone_id")
    force_lookback_raw = data.get("force_lookback_days") or request.args.get("force_lookback_days")
    reset_checkpoints_raw = data.get("reset_checkpoints") or request.args.get("reset_checkpoints")

    force_lookback = None
    if force_lookback_raw is not None:
        try:
            force_lookback = int(force_lookback_raw)
        except (ValueError, TypeError):
            pass

    reset_checkpoints = str(reset_checkpoints_raw).lower() in ("true", "1", "yes")

    result = screening_service.run_reconciliation_cycle(
        zone_id=zone_id,
        force_lookback_days=force_lookback,
        reset_checkpoints=reset_checkpoints,
    )

    status_code = 200 if result.get("success") else 502
    return jsonify({
        "success": result.get("success", False),
        "summary": {
            "discovered": result.get("discovered", 0),
            "new": result.get("new", 0),
            "duplicates": result.get("duplicates", 0),
            "passed_quality": result.get("passed_quality", 0),
            "rejected_quality": result.get("rejected_quality", 0),
            "triage_candidates": result.get("triage_candidates", 0),
            "incidents_created": result.get("incidents_created", 0),
            "last_incident_created": result.get("last_incident_created"),
            "failed": result.get("failed", 0),
        },
        "cycle_details": result
    }), status_code


@app.route("/api/screening/status", methods=["GET"])
def get_screening_status():
    """
    Returns the operational status, observability telemetry, checkpoints,
    and last run summary of the autonomous screening watcher.
    """
    status_data = screening_service.get_status()
    return jsonify({
        "success": True,
        "status": status_data
    }), 200


@app.route("/api/incidents", methods=["GET"])
def get_incidents():
    """
    Returns list of screening incidents with optional filtering by zone_id,
    investigation_state, or triage_status.
    Safe and sanitized: does not expose credentials or secrets.
    """
    zone_id = request.args.get("zone_id")
    state = request.args.get("state") or request.args.get("investigation_state")
    triage_status = request.args.get("triage_status")
    limit = request.args.get("limit", 50)
    try:
        limit_val = max(1, min(int(limit), 200))
    except (ValueError, TypeError):
        limit_val = 50

    incidents = incident_store.list_incidents(
        zone_id=zone_id,
        investigation_state=state,
        triage_status=triage_status,
        limit=limit_val,
    )
    return jsonify({
        "count": len(incidents),
        "total": incident_store.count(),
        "incidents": incidents,
    }), 200


@app.route("/api/incidents/<incident_id>", methods=["GET"])
def get_incident(incident_id: str):
    """
    Returns detailed incident metadata including real acquisition properties,
    candidate geometry, triage result, and investigation state.
    """
    incident = incident_store.get_by_incident_id(incident_id)
    if not incident:
        return jsonify({
            "error": "Incident not found",
            "incident_id": incident_id,
        }), 404
    return jsonify(incident), 200


@app.route("/api/incidents/<incident_id>/acknowledge", methods=["POST"])
def acknowledge_incident(incident_id: str):
    """
    Acknowledges an autonomous candidate incident for investigation.
    """
    data = request.get_json(silent=True) or {}
    notes = data.get("notes")
    updated = incident_store.update_investigation_state(
        incident_id=incident_id,
        new_state="ACKNOWLEDGED",
        notes=notes,
    )
    if not updated:
        return jsonify({
            "error": "Incident not found",
            "incident_id": incident_id,
        }), 404
    return jsonify({
        "success": True,
        "incident": updated,
    }), 200


@app.route("/api/incidents/<incident_id>/candidates", methods=["GET"])
def get_incident_candidates(incident_id: str):
    """
    Returns dynamically correlated candidate vessels for a given incident anomaly.
    Searches available AIS data in the corridor; distinguishes live traffic from historical archive limits.
    """
    incident = incident_store.get_by_incident_id(incident_id)
    if not incident:
        return jsonify({
            "error": "Incident not found",
            "incident_id": incident_id,
        }), 404

    result = ais_correlation_service.correlate_candidates(incident)
    return jsonify(result), 200


@app.route("/api/simulation/counterfactual", methods=["POST"])
def run_counterfactual_simulation():
    """
    Executes a parameter-driven Lagrangian / kinematic counterfactual hypothesis test.
    Simulates vessel movement, forward particle dispersion under currents and windage,
    and calculates raw spatial, trajectory, and overlap consistency metrics against observed slick.
    """
    data = request.get_json(silent=True) or {}

    candidate = data.get("candidate")
    if not candidate or not isinstance(candidate, dict):
        return jsonify({"error": "Missing or invalid 'candidate' payload"}), 400

    # Coordinate validation for candidate
    try:
        if "lat" not in candidate or "lon" not in candidate:
            return jsonify({"error": "Missing candidate coordinates: 'lat' and 'lon' are required"}), 400
        lat = float(candidate["lat"])
        lon = float(candidate["lon"])
        if not (-90.0 <= lat <= 90.0) or not (-180.0 <= lon <= 180.0):
            return jsonify({"error": "Invalid candidate coordinates: lat must be in [-90, 90], lon in [-180, 180]"}), 400
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid candidate coordinates: 'lat' and 'lon' must be numeric"}), 400

    # Optional SOG & COG validation
    sog = candidate.get("sog") or candidate.get("speed_kn")
    if sog is not None:
        try:
            sog_val = float(sog)
            if sog_val < 0.0 or sog_val > 100.0:
                return jsonify({"error": "Invalid candidate SOG: speed must be between 0 and 100 knots"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid candidate SOG: must be numeric"}), 400

    cog = candidate.get("cog") or candidate.get("course_deg")
    if cog is not None:
        try:
            cog_val = float(cog)
            if not (-360.0 <= cog_val <= 360.0):
                return jsonify({"error": "Invalid candidate COG: course must be between -360 and 360 degrees"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid candidate COG: must be numeric"}), 400

    incident_id = data.get("incident_id")
    observed_slick = data.get("observed_slick") or {}
    if not isinstance(observed_slick, dict):
        return jsonify({"error": "Insufficient geometry for overlap calculation: observed_slick must be an object"}), 400

    # If incident_id is provided, enhance observed_slick with incident candidate geometry/centroid
    if incident_id:
        incident = incident_store.get_by_incident_id(incident_id)
        if incident:
            centroid = incident.get("candidate_centroid")
            if centroid:
                observed_slick["centroid"] = centroid
            if incident.get("candidate_area_km2"):
                observed_slick["area_km2"] = incident.get("candidate_area_km2")
            if incident.get("bbox"):
                observed_slick["extent"] = incident.get("bbox")

    # If observed_slick centroid is present, validate coordinates
    obs_c = observed_slick.get("centroid")
    if obs_c:
        try:
            if isinstance(obs_c, dict):
                o_lat = float(obs_c.get("lat"))
                o_lon = float(obs_c.get("lon"))
            elif isinstance(obs_c, (list, tuple)) and len(obs_c) >= 2:
                o_lon = float(obs_c[0])
                o_lat = float(obs_c[1])
            else:
                return jsonify({"error": "Insufficient geometry for overlap calculation: malformed observed centroid"}), 400

            if not (-90.0 <= o_lat <= 90.0) or not (-180.0 <= o_lon <= 180.0):
                return jsonify({"error": "Insufficient geometry for overlap calculation: observed centroid out of bounds"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "Insufficient geometry for overlap calculation: observed centroid values must be numeric"}), 400
    else:
        # Fallback to candidate coordinates as baseline reference
        observed_slick["centroid"] = {"lat": lat, "lon": lon}

    release_time = data.get("release_time")
    try:
        duration_hours = float(data.get("duration_hours", 0.25))
    except (ValueError, TypeError):
        duration_hours = 0.25

    current_vector = data.get("current_vector")
    wind_vector = data.get("wind_vector")
    environment_source = data.get("environment_source")

    result = counterfactual_engine.run_counterfactual_test(
        candidate=candidate,
        observed_slick=observed_slick,
        release_time_iso=release_time,
        duration_hours=duration_hours,
        current_vector=current_vector,
        wind_vector=wind_vector,
        environment_source=environment_source,
    )

    return jsonify(result), 200


@app.route("/api/ml/classify", methods=["POST"])
def ml_classify_scene():
    """
    Executes ConvNeXt-Tiny inference on calibrated 2-channel VV/VH input
    or returns structured simulation baseline with authenticated validation metrics.
    """
    data = request.get_json(silent=True) or {}
    result = ml_service.classify(data)
    return jsonify(result), 200


@app.route("/api/screening/quality-gate", methods=["POST"])
def evaluate_quality_gate():
    """
    Evaluates SAR acquisition quality against operational screening rules
    (incidence angle, missing nodata lines, land mask contamination, polarization).
    """
    data = request.get_json(silent=True) or {}
    acquisition_data = data.get("acquisition_data") or {
        "id": "part1_oil_00004",
        "product_id": "S1A_IW_GRDH_1SDV_20180803T172551_20180803T172608_023085_0281B1_DB30",
        "acquisition_time_utc": "2018-08-03T17:25:51Z",
        "collection": "sentinel-1-grd",
        "instrument_mode": "IW",
        "polarization": ["VV", "VH"],
        "bbox": [5.6, 55.0, 6.2, 55.5],
        "incidence_angle_deg": 34.2,
        "nodata_percent": 0.0,
        "land_mask_percent": 0.0,
    }
    zone_bbox = data.get("zone_bbox")
    wind_data = data.get("wind_data") or {"speed_ms": 4.8}

    result = quality_gate.evaluate(
        acquisition_data=acquisition_data,
        zone_bbox=zone_bbox,
        wind_data=wind_data,
    )
    return jsonify(result), 200


@app.route("/api/simulation/hindcast", methods=["POST"])
def run_hindcast_simulation():
    """
    Executes backward Lagrangian particle dispersion (T0 -> T-18h)
    to calculate the historical source corridor and release locus envelope.
    """
    data = request.get_json(silent=True) or {}
    origin_lat = float(data.get("origin_lat", 55.2443))
    origin_lon = float(data.get("origin_lon", 5.8856))
    duration_hours = float(data.get("duration_hours", 18.0))
    current_vector = data.get("current_vector")
    wind_vector = data.get("wind_vector")
    seed = data.get("seed", 42)

    result = counterfactual_engine.run_backward_hindcast(
        origin_lat=origin_lat,
        origin_lon=origin_lon,
        duration_hours=duration_hours,
        current_vector=current_vector,
        wind_vector=wind_vector,
        seed=seed,
    )
    return jsonify(result), 200








@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint with system status."""
    ships = ais_service.get_all_ships()
    preset_info = BOUNDING_BOX_PRESETS.get(ais_service.selected_preset_key, BOUNDING_BOX_PRESETS["ALL_INDIA"])
    return jsonify({
        "status": "healthy",
        "service": "AquaTrace AIS Backend",
        "ais_stream_status": ais_service.connection_status,
        "status_message": ais_service.status_message,
        "preset": ais_service.selected_preset_key,
        "preset_name": ais_service.preset_name,
        "bounding_boxes": ais_service.bounding_boxes,
        "center": preset_info["center"],
        "zoom": preset_info["zoom"],
        "tracked_vessels": len(ships),
        "total_messages": ais_service.total_messages_received,
    })


@app.route("/api/sectors", methods=["GET"])
def get_sectors():
    """Returns available maritime corridor presets."""
    return jsonify({
        "active_preset": ais_service.selected_preset_key,
        "presets": BOUNDING_BOX_PRESETS
    })


@app.route("/api/sector", methods=["POST"])
def set_sector():
    """Dynamically switch the active tracking sector."""
    data = request.get_json(silent=True) or {}
    preset_key = data.get("preset") or request.args.get("preset")
    if not preset_key:
        return jsonify({"error": "Missing 'preset' parameter"}), 400

    result = ais_service.change_sector(preset_key)
    return jsonify({
        "status": "success",
        "message": f"Sector switched to {result['name']}",
        "sector": result
    })


@app.route("/api/ships", methods=["GET"])
def get_ships():
    """Returns the current in-memory snapshot of all tracked vessels."""
    ship_type_filter = request.args.get("type")
    ships = ais_service.get_all_ships()
    
    if ship_type_filter:
        ships = [s for s in ships if s.get("ship_type", "").lower() == ship_type_filter.lower()]
        
    return jsonify({
        "count": len(ships),
        "preset": ais_service.selected_preset_key,
        "preset_name": ais_service.preset_name,
        "vessels": ships
    })


@app.route("/api/ships/<mmsi>", methods=["GET"])
def get_ship_by_mmsi(mmsi: str):
    """Returns detailed telemetry for a specific vessel by MMSI."""
    ship = ais_service.get_ship(mmsi)
    if not ship:
        return jsonify({"error": "Vessel not found", "mmsi": mmsi}), 404
    return jsonify(ship)


@socketio.on("connect")
def handle_connect():
    """Fired when a frontend client connects via Socket.IO."""
    logger.info(f"Frontend client connected. SID: {request.sid}")
    # Push immediate initial snapshot to the new client
    initial_ships = ais_service.get_all_ships()
    preset_info = BOUNDING_BOX_PRESETS.get(ais_service.selected_preset_key, BOUNDING_BOX_PRESETS["ALL_INDIA"])
    emit("ship_update", initial_ships)
    emit("status_update", {
        "status": ais_service.connection_status,
        "message": ais_service.status_message,
        "vessel_count": len(initial_ships),
        "total_messages": ais_service.total_messages_received,
        "preset": ais_service.selected_preset_key,
        "preset_name": ais_service.preset_name,
        "bounding_boxes": ais_service.bounding_boxes,
        "center": preset_info["center"],
        "zoom": preset_info["zoom"],
    })


@socketio.on("disconnect")
def handle_disconnect():
    """Fired when a frontend client disconnects."""
    logger.info(f"Frontend client disconnected. SID: {request.sid}")


@socketio.on("request_snapshot")
def handle_request_snapshot():
    """Explicit request from frontend for an instant vessel snapshot."""
    ships = ais_service.get_all_ships()
    emit("ship_update", ships)


@socketio.on("change_sector")
def handle_change_sector(data):
    """Client-triggered dynamic sector change."""
    preset_key = data.get("preset") if isinstance(data, dict) else str(data)
    if preset_key:
        logger.info(f"Socket.IO client requested sector change to: {preset_key}")
        ais_service.change_sector(preset_key)


def start_server():
    # Start the AIS relay background worker
    ais_service.start()
    # Start autonomous satellite screening watcher background worker
    if SCREENING_AUTO_START:
        screening_service.start()
    logger.info(f"Starting AquaTrace Flask-SocketIO server on {SERVER_HOST}:{SERVER_PORT}")
    socketio.run(app, host=SERVER_HOST, port=SERVER_PORT, debug=False, use_reloader=False, allow_unsafe_werkzeug=True)



if __name__ == "__main__":
    start_server()
