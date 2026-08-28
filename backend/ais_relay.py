import asyncio
import json
import logging
import threading
import time
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import websockets
from config import (
    AISSTREAM_API_KEY,
    AISSTREAM_URL,
    BOUNDING_BOX_PRESETS,
    DEFAULT_PRESET_KEY,
    FILTER_MESSAGE_TYPES,
    BROADCAST_INTERVAL_SEC,
    ENABLE_SAMPLE_SEEDS,
)

logger = logging.getLogger("AISRelay")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

MAX_HISTORY_POINTS = 20


def map_ais_type_to_category(raw_type: Any) -> str:
    """
    Map numeric AIS ship type code to primary categories:
    - If raw_type is None/missing -> 'Pending' (Awaiting Static Data)
    - 80-89: Tanker
    - 70-79: Cargo
    - 60-69: Passenger
    - 30 (or 30-39): Fishing
    - Otherwise (valid number e.g. 52 Tug, 31 Towing, 50 Pilot): Other
    """
    if raw_type is None:
        return "Pending"
    try:
        t = int(raw_type)
        if 80 <= t <= 89:
            return "Tanker"
        elif 70 <= t <= 79:
            return "Cargo"
        elif 60 <= t <= 69:
            return "Passenger"
        elif t == 30 or (30 <= t <= 39):
            return "Fishing"
        else:
            return "Other"
    except (ValueError, TypeError):
        return "Pending"


class AISRelayService:
    def __init__(self, socketio_instance=None):
        self.socketio = socketio_instance
        self.ships: Dict[str, Dict[str, Any]] = {}
        self.lock = threading.Lock()
        self.is_running = False
        self.is_connected = False
        self.last_broadcast_time = 0.0
        self.has_new_updates = False
        self.total_messages_received = 0
        self.connection_status = "DISCONNECTED"  # DISCONNECTED, CONNECTING, CONNECTED, ERROR
        self.status_message = "Initialized"
        
        # Sector preset state
        self.selected_preset_key = DEFAULT_PRESET_KEY
        preset_info = BOUNDING_BOX_PRESETS.get(self.selected_preset_key, BOUNDING_BOX_PRESETS["ALL_INDIA"])
        self.bounding_boxes = preset_info["bounds"]
        self.preset_name = preset_info["name"]

        # Active websocket reference and asyncio loop
        self.active_ws = None
        self.ws_loop = None

        # Seed sample vessels only if explicitly requested in config
        if ENABLE_SAMPLE_SEEDS:
            logger.info("⚠️ ENABLE_SAMPLE_SEEDS is True: Seeding fallback demo vessels with [DEMO DATA] badge.")
            self._seed_initial_vessels()
        else:
            logger.info("⚡ Operating in 100% PURE LIVE AIS STREAM MODE (zero fallback seeds).")

    def _seed_initial_vessels(self):
        """Optional sample vessels for offline demo fallback mode."""
        initial_vessels = [
            {
                "mmsi": "419001234",
                "name": "MT SWARNA JAL",
                "lat": 18.892,
                "lon": 72.781,
                "sog": 12.4,
                "cog": 215.0,
                "ship_type": "Tanker",
                "raw_type": 80,
                "destination": "JNPT MUMBAI",
                "callsign": "AVTW",
                "is_demo": True,
                "classification_status": "RESOLVED",
                "first_tracked_epoch": time.time() - 300,
                "history": [
                    [18.962, 72.831],
                    [18.945, 72.818],
                    [18.928, 72.805],
                    [18.910, 72.793],
                    [18.892, 72.781],
                ],
                "last_updated": datetime.now(timezone.utc).isoformat(),
                "last_updated_epoch": time.time(),
            },
            {
                "mmsi": "419005678",
                "name": "MV MAERSK COLOMBO",
                "lat": 13.084,
                "lon": 80.332,
                "sog": 16.8,
                "cog": 82.0,
                "ship_type": "Cargo",
                "raw_type": 70,
                "destination": "CHENNAI PORT",
                "callsign": "VTXL",
                "is_demo": True,
                "classification_status": "RESOLVED",
                "first_tracked_epoch": time.time() - 240,
                "history": [
                    [13.061, 80.250],
                    [13.068, 80.275],
                    [13.075, 80.300],
                    [13.084, 80.332],
                ],
                "last_updated": datetime.now(timezone.utc).isoformat(),
                "last_updated_epoch": time.time(),
            },
            {
                "mmsi": "419009012",
                "name": "SAGAR SAMPADA",
                "lat": 9.931,
                "lon": 76.214,
                "sog": 8.1,
                "cog": 145.0,
                "ship_type": "Fishing",
                "raw_type": 30,
                "destination": "COCHIN HARBOUR",
                "callsign": "VWPS",
                "is_demo": True,
                "classification_status": "RESOLVED",
                "first_tracked_epoch": time.time() - 180,
                "history": [
                    [9.975, 76.180],
                    [9.960, 76.192],
                    [9.945, 76.203],
                    [9.931, 76.214],
                ],
                "last_updated": datetime.now(timezone.utc).isoformat(),
                "last_updated_epoch": time.time(),
            },
        ]
        with self.lock:
            for v in initial_vessels:
                self.ships[v["mmsi"]] = v

    def get_all_ships(self) -> List[Dict[str, Any]]:
        with self.lock:
            return list(self.ships.values())

    def get_ship(self, mmsi: str) -> Optional[Dict[str, Any]]:
        with self.lock:
            return self.ships.get(str(mmsi))

    def change_sector(self, preset_key: str) -> Dict[str, Any]:
        """
        Dynamically update the active sector bounding box, clear existing vessel list,
        and resubscribe over the WebSocket stream to aisstream.io with the new coordinates.
        """
        clean_key = preset_key.upper().strip()
        if clean_key not in BOUNDING_BOX_PRESETS:
            logger.warning(f"Unknown preset key '{preset_key}'. Defaulting to ALL_INDIA.")
            clean_key = "ALL_INDIA"

        preset_info = BOUNDING_BOX_PRESETS[clean_key]
        self.selected_preset_key = clean_key
        self.preset_name = preset_info["name"]
        self.bounding_boxes = preset_info["bounds"]

        # Clear vessel list for the new sector
        with self.lock:
            self.ships = {}

        # Log exact BoundingBoxes array sent to aisstream.io
        logger.info(
            f"\n======================================================================\n"
            f"🔄 SECTOR CHANGE TRIGGERED -> '{self.preset_name}' [{clean_key}]\n"
            f"📦 BoundingBoxes Array Sent to aisstream.io: {json.dumps(self.bounding_boxes)}\n"
            f"🌐 Center: {preset_info['center']} | Default Zoom: {preset_info['zoom']}\n"
            f"📡 FilterMessageTypes: {FILTER_MESSAGE_TYPES}\n"
            f"======================================================================"
        )

        # Trigger clean WebSocket resubscription/reconnect with new BoundingBoxes
        if self.active_ws and self.ws_loop and self.is_connected:
            asyncio.run_coroutine_threadsafe(
                self._resubscribe_or_reconnect(),
                self.ws_loop
            )

        # Immediate broadcast of cleared ship list and new status to all connected frontend clients
        if self.socketio:
            self.socketio.emit("ship_update", [])
            self.socketio.emit("status_update", {
                "status": self.connection_status,
                "message": f"Active Sector: {self.preset_name}",
                "vessel_count": 0,
                "total_messages": self.total_messages_received,
                "preset": self.selected_preset_key,
                "preset_name": self.preset_name,
                "bounding_boxes": self.bounding_boxes,
                "center": preset_info["center"],
                "zoom": preset_info["zoom"],
                "timestamp": datetime.now(timezone.utc).isoformat()
            })

        return {
            "preset": self.selected_preset_key,
            "name": self.preset_name,
            "bounds": self.bounding_boxes,
            "center": preset_info["center"],
            "zoom": preset_info["zoom"],
        }

    async def _resubscribe_or_reconnect(self):
        """Send new subscription payload and reconnect active WebSocket cleanly."""
        try:
            if self.active_ws:
                sub_payload = {
                    "APIKey": AISSTREAM_API_KEY,
                    "BoundingBoxes": self.bounding_boxes,
                    "FilterMessageTypes": FILTER_MESSAGE_TYPES,
                }
                await self.active_ws.send(json.dumps(sub_payload))
                logger.info(f"📡 In-flight subscription frame sent for {self.selected_preset_key}.")
                # Close websocket cleanly to trigger instant reconnect loop with fresh subscription
                await self.active_ws.close()
                logger.info(f"🔄 Reconnecting WebSocket with new bounding boxes: {self.bounding_boxes}")
        except Exception as e:
            logger.warning(f"Error during websocket resubscription: {e}")

    def _process_message(self, raw_msg: str):
        try:
            packet = json.loads(raw_msg)
        except Exception as e:
            logger.warning(f"Failed to parse JSON packet: {e}")
            return

        msg_type = packet.get("MessageType")
        metadata = packet.get("MetaData", {})
        message_body = packet.get("Message", {})

        mmsi = str(metadata.get("MMSI") or metadata.get("UserID") or "").strip()
        if not mmsi:
            return

        now_utc = datetime.now(timezone.utc).isoformat()
        now_epoch = time.time()

        with self.lock:
            ship = self.ships.get(mmsi, {
                "mmsi": mmsi,
                "name": (metadata.get("ShipName") or "").strip() or f"VESSEL-{mmsi[-4:]}",
                "lat": metadata.get("latitude") or 0.0,
                "lon": metadata.get("longitude") or 0.0,
                "sog": 0.0,
                "cog": 0.0,
                "true_heading": 0,
                "ship_type": "Pending",  # Initial state when only PositionReport is known
                "raw_type": None,
                "destination": "UNSPECIFIED",
                "callsign": "",
                "is_demo": False,
                "classification_status": "SYNCING",  # SYNCING until ShipStaticData arrives
                "first_tracked_epoch": now_epoch,
                "history": [],
                "last_updated": now_utc,
                "last_updated_epoch": now_epoch,
            })

            # Mark as authentic live data
            ship["is_demo"] = False

            # Ensure history list exists
            if "history" not in ship or not isinstance(ship["history"], list):
                ship["history"] = []

            # 1. Handle PositionReport (Live Coordinates, Speed, Course)
            if msg_type in ("PositionReport", "StandardClassBPositionReport", "ExtendedClassBPositionReport") or \
               "PositionReport" in message_body or "StandardClassBPositionReport" in message_body or "ExtendedClassBPositionReport" in message_body:
                
                pos = (
                    message_body.get("PositionReport") or
                    message_body.get("StandardClassBPositionReport") or
                    message_body.get("ExtendedClassBPositionReport") or
                    message_body
                )
                lat = pos.get("Latitude", metadata.get("latitude"))
                lon = pos.get("Longitude", metadata.get("longitude"))

                # Validate coordinates
                if lat is not None and lon is not None and -90 <= lat <= 90 and -180 <= lon <= 180 and lat != 91 and lon != 181:
                    valid_lat = float(lat)
                    valid_lon = float(lon)
                    ship["lat"] = valid_lat
                    ship["lon"] = valid_lon

                    # Append to rolling history array (capped at MAX_HISTORY_POINTS)
                    new_pt = [round(valid_lat, 5), round(valid_lon, 5)]
                    curr_history = ship.get("history", [])
                    if not curr_history or (curr_history[-1][0] != new_pt[0] or curr_history[-1][1] != new_pt[1]):
                        curr_history.append(new_pt)
                        if len(curr_history) > MAX_HISTORY_POINTS:
                            curr_history = curr_history[-MAX_HISTORY_POINTS:]
                        ship["history"] = curr_history

                sog = pos.get("Sog")
                if sog is not None:
                    ship["sog"] = round(float(sog), 1)

                cog = pos.get("Cog")
                if cog is not None and cog <= 360:
                    ship["cog"] = round(float(cog), 1)

                heading = pos.get("TrueHeading")
                if heading is not None and heading != 511:
                    ship["true_heading"] = int(heading)

                if metadata.get("ShipName"):
                    name = metadata.get("ShipName", "").strip()
                    if name:
                        ship["name"] = name

                # If static data hasn't arrived yet, keep ship_type as 'Pending' and classification_status as 'SYNCING'
                if ship.get("raw_type") is None:
                    ship["ship_type"] = "Pending"
                    ship["classification_status"] = "SYNCING"

                ship["last_updated"] = now_utc
                ship["last_updated_epoch"] = now_epoch
                self.ships[mmsi] = ship
                self.has_new_updates = True
                self.total_messages_received += 1

                # Real-Time Console Logging
                logger.info(
                    f"⚡ [AIS LIVE] PositionReport: '{ship['name']}' (MMSI: {mmsi}) | "
                    f"Pos: ({ship['lat']:.4f}, {ship['lon']:.4f}) | SOG: {ship['sog']} kn | COG: {ship['cog']}° | "
                    f"Status: {ship['ship_type']} ({ship['classification_status']}) | History: {len(ship['history'])} pts"
                )

            # 2. Handle ShipStaticData & StaticDataReport (Name, AIS Category, Destination, Dimension, Callsign)
            elif msg_type in ("ShipStaticData", "StaticDataReport") or \
                 "ShipStaticData" in message_body or "StaticDataReport" in message_body:
                
                static = (
                    message_body.get("ShipStaticData") or
                    message_body.get("StaticDataReport") or
                    message_body
                )

                # Extract numeric AIS ship type from Type 5 or Type 24 ReportB
                raw_type = (
                    static.get("Type") or
                    static.get("ShipType") or
                    static.get("ReportB", {}).get("ShipType") or
                    metadata.get("ShipType")
                )
                category = map_ais_type_to_category(raw_type)

                # Extract vessel name
                name = (
                    static.get("Name") or
                    static.get("ReportA", {}).get("Name") or
                    metadata.get("ShipName") or
                    ""
                ).strip()

                # Extract destination and callsign
                dest = (static.get("Destination") or "").strip()
                callsign = (
                    static.get("CallSign") or
                    static.get("ReportB", {}).get("CallSign") or
                    ""
                ).strip()

                dimension = static.get("Dimension") or static.get("ReportB", {}).get("Dimension")

                if name:
                    ship["name"] = name
                if raw_type is not None:
                    ship["raw_type"] = raw_type
                    ship["ship_type"] = category
                    ship["classification_status"] = "RESOLVED"
                if dest:
                    ship["destination"] = dest
                if callsign:
                    ship["callsign"] = callsign
                if dimension:
                    ship["dimension"] = dimension

                if metadata.get("latitude") and metadata.get("longitude"):
                    lat = metadata.get("latitude")
                    lon = metadata.get("longitude")
                    if -90 <= lat <= 90 and -180 <= lon <= 180 and lat != 91 and lon != 181:
                        valid_lat = float(lat)
                        valid_lon = float(lon)
                        ship["lat"] = valid_lat
                        ship["lon"] = valid_lon

                        new_pt = [round(valid_lat, 5), round(valid_lon, 5)]
                        curr_history = ship.get("history", [])
                        if not curr_history or (curr_history[-1][0] != new_pt[0] or curr_history[-1][1] != new_pt[1]):
                            curr_history.append(new_pt)
                            if len(curr_history) > MAX_HISTORY_POINTS:
                                curr_history = curr_history[-MAX_HISTORY_POINTS:]
                            ship["history"] = curr_history

                ship["last_updated"] = now_utc
                ship["last_updated_epoch"] = now_epoch
                self.ships[mmsi] = ship
                self.has_new_updates = True
                self.total_messages_received += 1

                # Real-Time Console Logging for ShipStaticData merge
                logger.info(
                    f"📋 [AIS LIVE] ShipStaticData MERGED: '{ship['name']}' (MMSI: {mmsi}) | "
                    f"AIS Code: {raw_type} -> Category: '{category}' | Dest: '{dest}' | Callsign: '{callsign}'"
                )

    async def _ais_websocket_loop(self):
        """
        Connects to aisstream.io WebSocket, sends subscription message, and processes stream.
        Implements automatic reconnection with exponential backoff.
        """
        backoff = 2
        max_backoff = 30

        if not AISSTREAM_API_KEY:
            logger.warning("AISSTREAM_API_KEY is empty! Live AIS WebSocket will not connect. Set it in .env")
            self.connection_status = "ERROR"
            self.status_message = "Missing AISSTREAM_API_KEY"
            return

        while self.is_running:
            try:
                self.connection_status = "CONNECTING"
                self.status_message = f"Connecting to {AISSTREAM_URL}..."
                logger.info(f"Connecting to AISStream WebSocket: {AISSTREAM_URL}")

                async with websockets.connect(
                    AISSTREAM_URL,
                    ping_interval=20,
                    ping_timeout=20,
                    close_timeout=10,
                ) as ws:
                    self.active_ws = ws
                    subscription_payload = {
                        "APIKey": AISSTREAM_API_KEY,
                        "BoundingBoxes": self.bounding_boxes,
                        "FilterMessageTypes": FILTER_MESSAGE_TYPES,
                    }
                    # Send subscription within 3 seconds of connecting
                    await ws.send(json.dumps(subscription_payload))
                    logger.info(
                        f"✅ Successfully subscribed to AISStream for Sector '{self.preset_name}'\n"
                        f"   📦 BoundingBoxes: {json.dumps(self.bounding_boxes)}\n"
                        f"   📡 FilterMessageTypes: {FILTER_MESSAGE_TYPES}"
                    )
                    self.is_connected = True
                    self.connection_status = "CONNECTED"
                    self.status_message = f"Live AIS Stream Active [{self.preset_name}]"
                    backoff = 2  # reset backoff

                    async for message in ws:
                        if not self.is_running:
                            break
                        self._process_message(message)

            except websockets.ConnectionClosed as cc:
                self.active_ws = None
                self.is_connected = False
                self.connection_status = "RECONNECTING"
                self.status_message = f"Connection closed ({cc.code}). Reconnecting in {backoff}s..."
                logger.warning(f"AISStream WebSocket closed ({cc.code}: {cc.reason}). Retrying in {backoff}s...")
            except Exception as e:
                self.active_ws = None
                self.is_connected = False
                self.connection_status = "RECONNECTING"
                self.status_message = f"Error: {e}. Reconnecting in {backoff}s..."
                logger.error(f"AISStream WebSocket error: {e}. Retrying in {backoff}s...")

            await asyncio.sleep(backoff)
            backoff = min(backoff * 1.5, max_backoff)

    def _broadcast_loop(self):
        """
        Background thread that broadcasts the full ship list to Socket.IO clients
        at most once every BROADCAST_INTERVAL_SEC (2.0s).
        """
        logger.info(f"Broadcast loop started with interval {BROADCAST_INTERVAL_SEC}s")
        while self.is_running:
            time.sleep(BROADCAST_INTERVAL_SEC)
            try:
                if self.socketio:
                    ships_list = self.get_all_ships()
                    # Emit ship_update to all connected clients
                    self.socketio.emit("ship_update", ships_list)
                    self.socketio.emit("status_update", {
                        "status": self.connection_status,
                        "message": self.status_message,
                        "vessel_count": len(ships_list),
                        "total_messages": self.total_messages_received,
                        "preset": self.selected_preset_key,
                        "preset_name": self.preset_name,
                        "bounding_boxes": self.bounding_boxes,
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    })
                    self.has_new_updates = False
            except Exception as e:
                logger.error(f"Error during Socket.IO broadcast: {e}")

    def _run_async_loop(self):
        """Run asyncio event loop in background thread."""
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        self.ws_loop = loop
        try:
            loop.run_until_complete(self._ais_websocket_loop())
        finally:
            loop.close()

    def start(self):
        """Start the AIS relay service threads."""
        if self.is_running:
            return
        self.is_running = True

        # 1. Start AISStream WebSocket receiver thread
        self.ws_thread = threading.Thread(target=self._run_async_loop, daemon=True, name="AIS-WS-Thread")
        self.ws_thread.start()

        # 2. Start Socket.IO throttled broadcast thread
        self.broadcast_thread = threading.Thread(target=self._broadcast_loop, daemon=True, name="AIS-Broadcast-Thread")
        self.broadcast_thread.start()
        logger.info("AISRelayService successfully started.")

    def stop(self):
        self.is_running = False
        logger.info("AISRelayService stopped.")
