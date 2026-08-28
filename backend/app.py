import logging
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from config import SERVER_HOST, SERVER_PORT, CORS_ALLOWED_ORIGINS, BOUNDING_BOX_PRESETS
from ais_relay import AISRelayService

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
