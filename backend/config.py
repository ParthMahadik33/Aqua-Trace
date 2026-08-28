import os
import json
from pathlib import Path
from dotenv import load_dotenv

# Load .env from backend directory or project root
root_dir = Path(__file__).resolve().parent.parent
dotenv_path = root_dir / ".env"
if dotenv_path.exists():
    load_dotenv(dotenv_path)
else:
    load_dotenv()

# AISStream Configuration
AISSTREAM_API_KEY = os.getenv("AISSTREAM_API_KEY", "").strip()
AISSTREAM_URL = os.getenv("AISSTREAM_URL", "wss://stream.aisstream.io/v0/stream")

# Maritime Corridor Bounding Box Presets verified for coastal and port water coverage:
# Format: [[[south_lat, west_lon], [north_lat, east_lon]]]
BOUNDING_BOX_PRESETS = {
    "ALL_INDIA": {
        "name": "All India Coastline",
        "description": "Arabian Sea, Bay of Bengal, and Indian Peninsula waters",
        "bounds": [[[6.0, 68.0], [24.0, 90.0]]],
        "center": [15.5, 78.0],
        "zoom": 5,
    },
    "MUMBAI_GUJARAT": {
        "name": "Mumbai / Gujarat Corridor",
        "description": "JNPT, Mumbai Port (18.9°N, 72.8°E), Gulf of Khambhat, Hazira waters",
        "bounds": [[[18.0, 68.5], [23.5, 73.5]]],
        "center": [20.5, 71.0],
        "zoom": 7,
    },
    "CHENNAI_VIZAG": {
        "name": "Chennai / Vizag Corridor",
        "description": "Chennai Port (13.08°N, 80.29°E) to Vizag Port (17.69°N, 83.28°E) coastal waters",
        "bounds": [[[12.5, 79.5], [18.2, 84.5]]],
        "center": [15.3, 82.0],
        "zoom": 7,
    },
    "KANDLA_MUNDRA": {
        "name": "Kandla / Mundra Corridor",
        "description": "Gulf of Kutch, Deendayal/Kandla (23.0°N, 70.2°E) & Mundra (22.7°N, 69.7°E)",
        "bounds": [[[21.5, 68.2], [23.5, 71.0]]],
        "center": [22.5, 69.6],
        "zoom": 8,
    },
    "STRAIT_OF_HORMUZ": {
        "name": "Gulf / Strait of Hormuz",
        "description": "Persian Gulf & Gulf of Oman Strategic Energy Chokepoint waters",
        "bounds": [[[23.5, 54.0], [27.5, 59.5]]],
        "center": [25.5, 56.5],
        "zoom": 7,
    },
    "MALACCA_STRAIT": {
        "name": "Malacca Strait",
        "description": "Singapore (1.26°N, 103.8°E) & Malacca Strait Global Shipping Lane",
        "bounds": [[[1.0, 99.5], [6.0, 104.5]]],
        "center": [3.5, 102.0],
        "zoom": 7,
    },
}

# Default Selected Preset from .env (defaults to ALL_INDIA)
DEFAULT_PRESET_KEY = os.getenv("BOUNDING_BOX_PRESET", "ALL_INDIA").upper()
if DEFAULT_PRESET_KEY not in BOUNDING_BOX_PRESETS:
    DEFAULT_PRESET_KEY = "ALL_INDIA"

# Explicit AIS message types to subscribe to from aisstream.io
FILTER_MESSAGE_TYPES = [
    "PositionReport",
    "ShipStaticData",
    "StandardClassBPositionReport",
    "StaticDataReport",
    "ExtendedClassBPositionReport",
]

# Set to True only if you want sample fallback vessels when testing without live AIS data
ENABLE_SAMPLE_SEEDS = os.getenv("ENABLE_SAMPLE_SEEDS", "false").lower() in ("true", "1", "yes")

# Application Settings
BROADCAST_INTERVAL_SEC = float(os.getenv("BROADCAST_INTERVAL_SEC", "2.0"))
SERVER_HOST = os.getenv("HOST", "0.0.0.0")
SERVER_PORT = int(os.getenv("PORT", "5000"))
CORS_ALLOWED_ORIGINS = os.getenv("CORS_ALLOWED_ORIGINS", "*")
