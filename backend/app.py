import logging
from flask import Flask, jsonify, request, Response
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from config import SERVER_HOST, SERVER_PORT, CORS_ALLOWED_ORIGINS, BOUNDING_BOX_PRESETS, DEFAULT_SENTINEL1_BBOX
from ais_relay import AISRelayService
from copernicus_service import CopernicusAuthService
from sentinel_service import Sentinel1CatalogueService
from sentinel_process_service import Sentinel1ProcessService

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
    logger.info(f"Starting AquaTrace Flask-SocketIO server on {SERVER_HOST}:{SERVER_PORT}")
    socketio.run(app, host=SERVER_HOST, port=SERVER_PORT, debug=False, use_reloader=False, allow_unsafe_werkzeug=True)


if __name__ == "__main__":
    start_server()
