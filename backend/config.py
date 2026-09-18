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
# Default to 7860 on Hugging Face Spaces (SPACE_ID detected), 5000 locally
default_port = "7860" if os.getenv("SPACE_ID") else "5000"
SERVER_PORT = int(os.getenv("PORT", default_port))
CORS_ALLOWED_ORIGINS = os.getenv("CORS_ALLOWED_ORIGINS", "*")

# Copernicus Data Space Ecosystem Configuration
COPERNICUS_CLIENT_ID = os.getenv("COPERNICUS_CLIENT_ID", "").strip()
COPERNICUS_CLIENT_SECRET = os.getenv("COPERNICUS_CLIENT_SECRET", "").strip()
COPERNICUS_TOKEN_URL = os.getenv(
    "COPERNICUS_TOKEN_URL",
    "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
).strip()

# Sentinel Hub Catalog API Configuration
SENTINEL_HUB_CATALOG_URL = os.getenv(
    "SENTINEL_HUB_CATALOG_URL",
    "https://sh.dataspace.copernicus.eu/catalog/v1/search"
).strip()

# Sentinel Hub Process API Configuration
SENTINEL_HUB_PROCESS_URL = os.getenv(
    "SENTINEL_HUB_PROCESS_URL",
    "https://sh.dataspace.copernicus.eu/api/v1/process"
).strip()

# Default Sentinel-1 Demonstration Bounding Box: Malacca Strait / Singapore Corridor
# Format: [min_lon, min_lat, max_lon, max_lat] in WGS84 coordinates
DEFAULT_SENTINEL1_BBOX = [99.5, 1.0, 104.5, 6.0]

# Autonomous Screening & Acquisition Registry Configuration
DATA_DIR = Path(__file__).resolve().parent / "data"
ACQUISITIONS_REGISTRY_PATH = os.getenv(
    "ACQUISITIONS_REGISTRY_PATH",
    str(DATA_DIR / "acquisitions.json")
)

# Supported SAR specifications
SUPPORTED_SAR_COLLECTIONS = [
    col.strip() for col in os.getenv("SUPPORTED_SAR_COLLECTIONS", "sentinel-1-grd").split(",") if col.strip()
]
REQUIRED_SAR_POLARIZATIONS = [
    pol.strip().upper() for pol in os.getenv("REQUIRED_SAR_POLARIZATIONS", "VV").split(",") if pol.strip()
]
ALLOWED_SAR_INSTRUMENT_MODES = [
    mode.strip().upper() for mode in os.getenv("ALLOWED_SAR_INSTRUMENT_MODES", "IW,EW,SM").split(",") if mode.strip()
]

# Operational screening thresholds (configurable screening rules, not hardcoded physical laws)
SCREENING_MIN_WIND_MS = float(os.getenv("SCREENING_MIN_WIND_MS", "3.0"))
SCREENING_MAX_WIND_MS = float(os.getenv("SCREENING_MAX_WIND_MS", "10.0"))
MAX_NODATA_PERCENT = float(os.getenv("MAX_NODATA_PERCENT", "50.0"))
MIN_SPATIAL_SPAN_DEG = float(os.getenv("MIN_SPATIAL_SPAN_DEG", "0.02"))

# Autonomous Screening Monitoring Zones (WGS84 [min_lon, min_lat, max_lon, max_lat])
SCREENING_ZONES = {
    "MALACCA_STRAIT": {
        "zone_id": "MALACCA_STRAIT",
        "name": "Malacca Strait Corridor",
        "bbox": [99.5, 1.0, 104.5, 6.0],
        "priority": 1,
        "enabled": True,
    },
    "MUMBAI_GUJARAT": {
        "zone_id": "MUMBAI_GUJARAT",
        "name": "Mumbai / Gujarat Corridor",
        "bbox": [68.5, 18.0, 73.5, 23.5],
        "priority": 1,
        "enabled": True,
    },
    "CHENNAI_VIZAG": {
        "zone_id": "CHENNAI_VIZAG",
        "name": "Chennai / Vizag Corridor",
        "bbox": [79.5, 12.5, 84.5, 18.2],
        "priority": 2,
        "enabled": True,
    },
    "KANDLA_MUNDRA": {
        "zone_id": "KANDLA_MUNDRA",
        "name": "Kandla / Mundra Corridor",
        "bbox": [68.2, 21.5, 71.0, 23.5],
        "priority": 2,
        "enabled": True,
    },
    "STRAIT_OF_HORMUZ": {
        "zone_id": "STRAIT_OF_HORMUZ",
        "name": "Gulf / Strait of Hormuz",
        "bbox": [54.0, 23.5, 59.5, 27.5],
        "priority": 2,
        "enabled": True,
    },
}

# Screening Worker Orchestration Settings
SCREENING_INTERVAL_SEC = float(os.getenv("SCREENING_INTERVAL_SEC", "300.0"))
SCREENING_OVERLAP_HOURS = float(os.getenv("SCREENING_OVERLAP_HOURS", "2.0"))
SCREENING_INITIAL_LOOKBACK_DAYS = int(os.getenv("SCREENING_INITIAL_LOOKBACK_DAYS", "7"))
SCREENING_MAX_PAGES = int(os.getenv("SCREENING_MAX_PAGES", "5"))
SCREENING_PAGE_LIMIT = int(os.getenv("SCREENING_PAGE_LIMIT", "25"))
CHECKPOINTS_FILE_PATH = os.getenv(
    "CHECKPOINTS_FILE_PATH",
    str(DATA_DIR / "screening_checkpoints.json")
)
SCREENING_AUTO_START = os.getenv("SCREENING_AUTO_START", "true").lower() in ("true", "1", "yes")

# Incident Store Configuration
INCIDENTS_STORE_PATH = os.getenv(
    "INCIDENTS_STORE_PATH",
    str(DATA_DIR / "incidents.json")
)






