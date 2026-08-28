# 🌊 AquaTrace — Live AIS Maritime Monitoring Platform (Page 1)

AquaTrace is a real-time maritime domain awareness web application designed for tactical vessel tracking and intelligence. This is **Page 1: Live AIS Ship Tracking View**, covering the Indian coastline and surrounding maritime zones (Arabian Sea and Bay of Bengal).

---

## ⚡ Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS 4, Lucide Icons
- **Map & GIS**: Leaflet & React-Leaflet with CartoDB Dark Matter tile layer
- **Backend**: Python 3, Flask, Flask-SocketIO (`python-socketio`), `websockets`, `python-dotenv`
- **Real-Time Data**: [aisstream.io](https://aisstream.io) WebSocket API (`wss://stream.aisstream.io/v0/stream`)
- **Transport**: WebSockets via Socket.IO for throttled real-time push to the web client

---

## 📁 Repository Structure

```
AquaTrace/
├── .env                       # Environment variables (API Keys & Config)
├── README.md                  # Documentation & Setup Guide
├── backend/                   # Python Flask AIS Relay Service
│   ├── app.py                 # Flask server & Socket.IO handlers
│   ├── ais_relay.py           # WebSocket client & AIS message processor
│   ├── config.py              # Configuration & bounding box definitions
│   ├── requirements.txt       # Python package dependencies
│   └── test_backend.py        # Unit tests for AIS parsing & category mapping
└── frontend/                  # Next.js Web Application
    ├── src/
    │   ├── app/
    │   │   ├── globals.css    # Tactical ops theme styling & Leaflet overrides
    │   │   ├── layout.tsx     # Root layout with fonts & metadata
    │   │   └── page.tsx       # Main full-screen map & dashboard
    │   ├── components/
    │   │   ├── Header/        # Header bar, search, connection status
    │   │   ├── Legend/        # Category toggle filters & vessel counts
    │   │   ├── Map/           # Dynamic Leaflet map & custom SVG ship markers
    │   │   └── VesselDrawer/  # Slide-in dossier drawer with live telemetry
    │   ├── hooks/             # Socket.IO client hooks
    │   └── types/             # Vessel & telemetry TypeScript definitions
    └── package.json
```

---

## 🛠️ Setup & Running

### 1. Configure Environment Variables
Create or verify the `.env` file in the project root:

```env
AISSTREAM_API_KEY="your_aisstream_api_key_here"
```

> Get a free API key at [aisstream.io](https://aisstream.io).

---

### 2. Backend Setup (Flask + Socket.IO)

Open a terminal and navigate to the project directory:

```bash
# Navigate to backend
cd backend

# (Optional) Create and activate a Python virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run backend unit tests
python test_backend.py

# Launch the Flask server
python app.py
```
The backend server runs on `http://localhost:5000`.

---

### 3. Frontend Setup (Next.js)

In a separate terminal window:

```bash
# Navigate to frontend
cd frontend

# Install Node dependencies (if not already installed)
npm install

# Start Next.js development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧭 Features & Capabilities

1. **Live AIS WebSocket Relay**:
   - Subscribes to `wss://stream.aisstream.io/v0/stream` for the Indian coastline sector: `[[[6.0, 68.0], [24.0, 90.0]]]`.
   - Merges separate AIS `PositionReport` (coordinates, speed, course) and `ShipStaticData` (name, type, destination, dimensions) packets into unified per-MMSI vessel records.
   - Throttled broadcasts (every 2.0s) over Socket.IO to prevent client flooding.
   - Resilient automatic reconnection with exponential backoff on network interruptions.

2. **Full-Screen Tactical Ops Map**:
   - CartoDB Dark Matter tile layer centered on the Indian Ocean sector (`[15.5, 78.0]`, zoom 5).
   - Custom SVG ship markers dynamically rotated to reflect vessel Course Over Ground (`cog`).
   - Standardized AIS category color coding:
     - 🔴 **Tanker** (`#EF4444`) — AIS codes 80–89
     - 🔵 **Cargo** (`#3B82F6`) — AIS codes 70–79
     - 🟢 **Fishing** (`#22C55E`) — AIS code 30
     - 🟡 **Passenger** (`#EAB308`) — AIS codes 60–69
     - ⚪ **Other** (`#9CA3AF`) — All other vessel types

3. **Slide-In Vessel Intelligence Drawer**:
   - Smooth right-side dossier panel showing:
     - Vessel Name & MMSI with 1-click copy
     - Speed Over Ground (SOG in knots & km/h) with visual velocity gauge
     - Course Over Ground (COG in degrees) with compass rose needle
     - Geographic coordinates in Decimal and DMS format
     - Destination port & static AIS identifiers
     - **Live ticking relative time counter** ("Last updated Xs ago" updating every second).

4. **Category Visibility Filters**:
   - Interactive bottom-left legend displaying active vessel counts per category.
   - Click any category to toggle marker visibility on the map.

5. **Ops Console Experience**:
   - Live connection status badge (`LIVE AIS` / `RECONNECTING` / `OFFLINE`).
   - Rapid search by vessel name, MMSI, or port destination with automatic pan & zoom.
   - Recenter sector button to quickly reset viewpoint to the Indian coastline.
