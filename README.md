<div align="center">

# 🌊 AquaTrace
### Autonomous Maritime Domain Awareness, Satellite Oil Spill Intelligence & Forensic Investigation Workstation

[![Next.js](https://img.shields.io/badge/Next.js-16.3.3-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react&logoColor=white)](https://react.dev/)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org/)
[![Flask](https://img.shields.io/badge/Flask-Socket.IO-000000?style=for-the-badge&logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![Copernicus](https://img.shields.io/badge/Copernicus-Sentinel--1%20SAR-004B87?style=for-the-badge&logo=european-space-agency&logoColor=white)](https://dataspace.copernicus.eu/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

<p align="center">
  <strong>AquaTrace</strong> is an end-to-end maritime intelligence console engineered for national maritime safety agencies, coast guards, and environmental authorities. It integrates <strong>real-time global AIS vessel telemetry</strong>, <strong>Copernicus Sentinel-1 Synthetic Aperture Radar (SAR) acquisition pipelines</strong>, <strong>deep learning dark-patch segmentation</strong>, <strong>backward Lagrangian ensemble hindcasting</strong>, and <strong>forward Eulerian-Lagrangian counterfactual hypothesis testing</strong> to isolate, evaluate, and prioritize oil spill events with verifiable forensic rigor.
</p>

[Mission Overview](#-mission-overview) • [Key Capabilities](#-key-capabilities) • [Investigation Workflow](#-12-stage-forensic-investigation-workflow) • [System Architecture](#-system-architecture) • [Quickstart](#-quickstart--installation) • [Provenance Framework](#-data-provenance--integrity) • [API Reference](#-api-reference)

</div>

---

## 🎯 Mission Overview

Illicit marine oily waste discharges (bilge dumping, tank washing, structural breaches) occur rapidly and dissipate under ocean hydrodynamic forcing. Traditional monitoring relies on isolated satellite captures or unlinked AIS tracking, leaving enforcement agencies unable to connect surface slicks to specific vessels with scientific defensibility.

AquaTrace bridges this gap through two synchronized operational layers:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 AQUATRACE PLATFORM                                     │
├──────────────────────────────────────────┬─────────────────────────────────────────────┤
│   ENGINE 1: TACTICAL OPERATIONS          │   ENGINE 2: INCIDENT INVESTIGATION          │
│   • Real-Time Class-A AIS Tracking       │   • 12-Stage Forensic Investigation Pipeline│
│   • Multi-Zone Indian Ocean Telemetry    │   • Sentinel-1 SAR Calibration & Ingestion  │
│   • Live Velocity, Course & Heading Needles│   • Backward Lagrangian Ensemble Hindcast │
│   • Dynamic Slide-In Vessel Dossier      │   • Multi-Stage Candidate Filtering Funnel  │
│   • High-Density AIS Stream WebSocket    │   • Counterfactual Plume Dispersion Testing │
│   • Interactive Category Filters         │   • Forward Shoreline Impact Forecasting    │
└──────────────────────────────────────────┴─────────────────────────────────────────────┘
```

### Core Design Doctrine
AquaTrace enforces the strict government operations hierarchy:
$$\mathbf{CONTENT > EVIDENCE > CONCLUSION > CONTROLS > BORDERS}$$
Every view prioritizes primary spatial evidence over decorative chrome, eliminates harsh visual glare via calibrated slate/charcoal tones, and delivers quantitative verdicts within 3 seconds of analyst inspection.

---

## ✨ Key Capabilities

### 🛰️ 1. Copernicus Sentinel-1 SAR Acquisition & Quality Gate
- **Direct CDSE STAC Integration**: Automated acquisition discovery via Copernicus Data Space Ecosystem API across high-risk corridors (Malacca Strait, Strait of Hormuz, Mumbai/Gujarat, Chennai/Vizag, Kandla/Mundra).
- **Automated SAR Screening Gate**: Validates sensor mode (`IW`), co-polarization (`VV` / `VH`), spatial resolution (`GRD HIGH`), nodata thresholds, and ERA5 surface wind viability ($3.0\text{ m/s} \le \text{wind} \le 12.0\text{ m/s}$) to guarantee capillary damping visibility.

### 🧠 2. Deep Learning Anomaly Classification & Slick Segmentation
- **Dual-Polarization Processing**: Radiometric calibration, speckle reduction, and normalized radar backscatter cross-section ($\sigma^0$) mapping.
- **Convolutional Triage**: ConvNeXt-Tiny classifier discriminating genuine biogenic/petroleum slicks from lookalikes (internal waves, wind grease, algal blooms).
- **High-Precision Segmentation**: Morphometric boundary delineation computing exact surface area ($\text{km}^2$), perimeter-to-area ratio, major/minor axis orientation, and centroid coordinates.

### 🌊 3. Lagrangian Backward Ensemble Hindcast
- **Metocean Forcing**: Driven by Copernicus Marine Service (CMEMS) surface velocity vectors ($u, v$) and ECMWF ERA5 10m wind fields.
- **5-Member Ensemble**: Runs Monte Carlo perturbed Lagrangian trajectories:
  - `ENS #1`: Mean control trajectory ($35\%$ confidence weight)
  - `ENS #2`: Windage $+10\%$ ($20\%$ weight)
  - `ENS #3`: Windage $-10\%$ ($20\%$ weight)
  - `ENS #4`: Current perturbation North ($12.5\%$ weight)
  - `ENS #5`: Current perturbation South ($12.5\%$ weight)
- **Source Convergence Corridor**: Determines the spatiotemporal release envelope ($11:45\text{--}13:20\text{ UTC}$) and estimated spill volume ($215\text{ m}^3$).

### 🚢 4. Multi-Stage AIS Candidate Filtering Funnel
- Filters dozens of raw regional transits down to prioritized candidates:
  $$\text{Fleet Ingestion (47)} \longrightarrow \text{Spatial Corridor (8)} \longrightarrow \text{Release Window (5)} \longrightarrow \text{Heading Alignment (3)} \longrightarrow \text{Top Suspects (2)}$$
- Identifies closest points of approach (CPA), transit velocity anomalies (speed drops indicating discharge manoeuvres), and historical waypoints.

### ⚖️ 5. Counterfactual Source Hypothesis Testing
- **Physical Feasibility Check**: Tests the hypothesis: *"Could this specific vessel physically explain the observed slick?"*
- Simulates hypothetical release from candidate coordinates and computes:
  - **Centroid Offset**: Spatial separation in nautical miles (tolerance threshold $\le 3.5\text{ NM}$)
  - **Major Axis Delta**: Angular orientation divergence (tolerance threshold $\le 25^\circ$)
  - **Dice Overlap Coefficient**: Spatial overlap between observed SAR polygon and simulated particle cloud
- **Objective Verdict**: Outputs `SUPPORTED`, `WEAK`, or `INCONCLUSIVE` based strictly on mathematical bounds under baseline hydrodynamic forcing.

### 🛡️ 6. Forward Dispersion & Coastal Exposure Forecasting
- **T+0 to T+48h Time-Step Model**: Evaluates expanding slick footprint ($\text{km}^2$) and trajectory under forecast currents and leeway drift.
- **Multi-Layer Sensitivity Screening**:
  - 🏖️ **Coastal Barrier Islands**: Environmental Sensitivity Index (ESI 9–10) tidal mudflats (e.g., Wadden Sea)
  - 🌿 **Natura 2000 Biospheres**: Marine bird and seal nursery habitats
  - 🐟 **Commercial Fisheries**: Demersal active grounds (Zone 4B)
  - ⚓ **Critical Harbors**: Deep-water approaches and municipal population centers
- **Automated Proximity Warnings**: Flags early beaching risks (e.g., Shoreline Encounter at $T+31\text{h}$).

### 📄 7. Evidence Graph & Official Incident Dossier
- **Dynamic Directed Acyclic Graph (DAG)**: Visualizes the unbroken chain of forensic reasoning connecting raw SAR telemetry to the final verdict.
- **Government Incident Dossier**: Formatted for admiralty court submission, port state control inspections, and IMO compliance reporting.

---

## 🔬 12-Stage Forensic Investigation Workflow

| # | Stage ID | Stage Title | Core Method / Engine | Primary Evidence Delivered |
| :---: | :--- | :--- | :--- | :--- |
| **01** | `surveillance` | **Satellite Surveillance** | Wide-area autonomous screening | Ingested Sentinel-1 pass `#023085`, AOI bounds, radar damping trigger |
| **02** | `sar_acquisition` | **SAR Acquisition** | Copernicus CDSE STAC pipeline | Raw IW GRDH VV+VH product metadata, orbit geometry, quality report |
| **03** | `sar_processing` | **SAR Preprocessing** | Radiometric calibration & filtering | Dual-pol backscatter composite, speckle reduction, contrast enhancement |
| **04** | `detection` | **Anomaly Detection** | ConvNeXt-Tiny Deep Learning | Dark patch classification, confidence score ($96.4\%$), lookalike filter |
| **05** | `segmentation` | **Slick Segmentation** | UNet Morphometric Boundary Model | Extracted polygon ($4.41\text{ km}^2$, $44,049\text{ px}$), slick centroid at $55.2443^\circ\text{N}, 5.8856^\circ\text{E}$ |
| **06** | `environmental` | **Metocean Context** | ERA5 + CMEMS hydrodynamic ingestion | Surface current vector ($0.35\text{ m/s}$ set $112^\circ$), wind vector ($4.8\text{ m/s}$ from $245^\circ$) |
| **07** | `source_reconstruction` | **Source Reconstruction** | Backward Lagrangian Hindcast | 5 ensemble trajectories, convergence locus, release window $11:45\text{--}13:20\text{ UTC}$ |
| **08** | `ais_correlation` | **AIS Correlation** | Spatio-temporal filtering funnel | $47 \to 8 \to 5 \to 3 \to 2$ candidate reduction, vessel tracks, corridor overlap |
| **09** | `attribution` | **Attribution Consistency** | Multi-factor weighted matrix | 5-factor scoring (Spatial, Temporal, Trajectory, Anomaly, Metocean), $92\%$ consistency |
| **10** | `counterfactual` | **Counterfactual Test** | Forward particle dispersion solver | Centroid offset ($8.72\text{ NM}$), orientation delta ($15.4^\circ$), verdict: `INCONCLUSIVE` |
| **11** | `impact_prioritization` | **Impact Forecast** | Forward dispersion & exposure model | Plume evolution $T+0 \to T+48\text{h}$, shoreline beaching alert at $T+31\text{h}$, ESI 9-10 sensitivity |
| **12** | `report` | **Incident Dossier** | Evidence synthesis & DAG assembly | Formal legal report modal, full parameter audit, multi-node evidence graph |

```
                              INVESTIGATION PIPELINE FLOW
                              
  [ 01 SURVEILLANCE ] ──> [ 02 SAR ACQUISITION ] ──> [ 03 SAR PREPROCESSING ]
                                                               │
  [ 06 METOCEAN CONTEXT ] <── [ 05 SEGMENTATION ] <── [ 04 ANOMALY DETECTION ]
           │
           ▼
  [ 07 LAGRANGIAN HINDCAST ] ──> [ 08 AIS CORRELATION FUNNEL ] ──> [ 09 ATTRIBUTION MATRIX ]
                                                                              │
  [ 12 OFFICIAL DOSSIER ] <── [ 11 IMPACT FORECAST ] <── [ 10 COUNTERFACTUAL TEST ]
```

---

## 🏛️ Data Provenance & Integrity

AquaTrace adheres to strict data attribution standards. Every metric, overlay, and finding is explicitly tagged with its operational provenance:

| Provenance Badge | Meaning & Authority | Example Components |
| :--- | :--- | :--- |
| `REAL SATELLITE DATA` | Direct raw telemetry from spaceborne instruments | Sentinel-1 SAR VV/VH Imagery, Orbit & Timestamp |
| `CURATED CASE DATA` | Historical ground-truth maritime case studies | German Bight Case 0004 Incident Record |
| `SIMULATED INPUT` | Parametric metocean observations or synthetic forcings | Replay Wind & Surface Current Vectors |
| `DERIVED RESULT` | Mathematically calculated through platform engines | Hindcast Trajectories, Funnel Reduction, Offset NM |
| `PROTOTYPE MODEL` | Prototype baseline calibration pending operational tie-in | Simplified hydrodynamic drag coefficient |

---

## 🏗️ System Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   FRONTEND (Next.js 16)                                │
│                                                                                        │
│   App Router (/operations, /simulation)                                               │
│   ├── Leaflet & React-Leaflet (CartoDB Dark Matter / Esri Light Gray)                  │
│   ├── Dynamic Map Layers (Hindcast, AIS Fleet, Counterfactual, Plume Forecast)         │
│   ├── Forensic Inspector & Quantitative Comparison Tables                              │
│   ├── Compact Analytical Control Bars (SimulationMapControls, ImpactForecastControls)  │
│   └── Dual Theme System (Tailwind CSS 4 Calibrated Government Palette)                │
└───────────────────────────────────────────▲────────────────────────────────────────────┘
                                            │ HTTP / Socket.IO
┌───────────────────────────────────────────▼────────────────────────────────────────────┐
│                                    BACKEND (Python Flask)                              │
│                                                                                        │
│   REST Endpoints (/api/screening, /api/simulation/counterfactual, /api/ml/classify)    │
│   ├── CopernicusService (CDSE STAC OAuth2 Ingestion & Discovery)                       │
│   ├── QualityGate (SAR Calibration, Polarization, Nodata & Wind Filtering)             │
│   ├── MLService & AiTriageAdapter (ConvNeXt-Tiny Dark Patch Classification)             │
│   ├── CounterfactualEngine (Eulerian-Lagrangian Forward Particle Dispersion Solver)    │
│   ├── AisCorrelationService (Spatio-Temporal Corridor Intersection)                    │
│   └── AisRelay (WebSocket Ingestion from aisstream.io with Throttled Broadcast)        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Repository Structure

```
AquaTrace/
├── .env.example                               # Sample environment configuration
├── backend/                                   # Python Flask Backend & Services
│   ├── app.py                                 # Core server, REST routes & Socket.IO handlers
│   ├── acquisition_registry.py                # Persistent STAC acquisition cache
│   ├── ai_triage_adapter.py                   # ConvNeXt classifier interface & fallback adapter
│   ├── ais_correlation_service.py             # Spatio-temporal vessel track correlator
│   ├── ais_relay.py                           # Real-time AIS WebSocket stream processor
│   ├── config.py                              # Service configuration & AOI coordinates
│   ├── copernicus_service.py                  # CDSE STAC client & token manager
│   ├── counterfactual_engine.py               # Lagrangian forward dispersion solver
│   ├── incident_store.py                      # Incident persistence manager
│   ├── ml_service.py                          # Deep learning model loader & inference runner
│   ├── quality_gate.py                        # Multi-check SAR data quality gate
│   ├── screening_policy.py                    # Autonomous AOI surveillance rules
│   ├── screening_service.py                   # Background sentinel acquisition discovery
│   ├── sentinel_process_service.py            # GeoTIFF calibration & patch processor
│   ├── verify_post_audit_fixes.py             # Automated backend verification test suite
│   └── requirements.txt                       # Python dependencies
├── frontend/                                  # Next.js 16 Web Application
│   ├── src/
│   │   ├── app/
│   │   │   ├── globals.css                    # Calibrated government palette & Leaflet overrides
│   │   │   ├── layout.tsx                     # Root layout with ThemeProvider & fonts
│   │   │   ├── page.tsx                       # Landing page & mission bridge
│   │   │   ├── operations/page.tsx            # Live Tactical AIS Monitoring Console
│   │   │   └── simulation/page.tsx            # 12-Stage Forensic Investigation Workstation
│   │   ├── components/
│   │   │   ├── Header/                        # Operational navigation, case metadata & stats
│   │   │   ├── Landing/                       # Mission console landing page modules
│   │   │   ├── Map/                           # Live AIS Leaflet canvas & vessel markers
│   │   │   ├── Simulation/                    # Forensic investigation components:
│   │   │   │   ├── AisCorrelationMapLayer.tsx           # Multi-track vessel rendering
│   │   │   │   ├── ConclusionPanel.tsx                  # Flat, dominant verdict footer
│   │   │   │   ├── CounterfactualAnalyticalOverlay.tsx   # Slim candidate selector bar
│   │   │   │   ├── CounterfactualMapLayer.tsx           # 8-element geographic evidence layer
│   │   │   │   ├── EvidenceGraphModal.tsx               # Interactive DAG evidence modal
│   │   │   │   ├── ImpactForecastControls.tsx           # Compact bottom timeline scrubber
│   │   │   │   ├── ImpactForecastMapLayer.tsx           # Shoreline plume expansion layer
│   │   │   │   ├── IncidentReportModal.tsx              # Official dossier viewer
│   │   │   │   ├── SimulationInspector.tsx              # Right-hand forensic telemetry drawer
│   │   │   │   ├── SimulationMapControls.tsx            # Analyst fit & zoom controls
│   │   │   │   ├── SimulationMapInner.tsx               # Primary map container & camera controller
│   │   │   │   ├── SimulationPrimaryVisual.tsx          # Stage visual switcher
│   │   │   │   └── WorkflowProgress.tsx                 # 12-step hero pipeline navigation
│   │   │   ├── Theme/                         # Dark / Light analyst mode toggle
│   │   │   └── VesselDrawer/                  # Slide-in live vessel intelligence drawer
│   │   ├── context/ThemeContext.tsx           # System-wide dark/light theme context
│   │   ├── data/                              # Case 0004 benchmark data & fleets
│   │   ├── services/simulationEngines/        # Hindcast, Attribution & Counterfactual engines
│   │   └── types/                             # Complete TypeScript data schemas
│   └── package.json                           # Frontend dependencies & Next.js config
└── ml/                                        # Machine Learning Training & Architecture
    └── classifier/                            # PyTorch ConvNeXt model architecture
```

---

## 🚀 Quickstart & Installation

### Prerequisites
- **Node.js**: `v18.18+` or `v20.x+`
- **Python**: `3.10` or higher
- **AISStream API Key**: Free registration at [aisstream.io](https://aisstream.io)
- **Copernicus CDSE Account** *(Optional)*: Free registration at [dataspace.copernicus.eu](https://dataspace.copernicus.eu)

---

### Step 1: Clone Repository & Configure Environment

```bash
git clone https://github.com/ParthMahadik33/Aqua-Trace.git
cd AquaTrace

# Copy example environment configuration
cp .env.example .env
```

Edit `.env` in the root directory:

```env
# AISStream Real-Time AIS WebSocket
AISSTREAM_API_KEY="your_aisstream_api_key"

# Copernicus Data Space Ecosystem (Optional for live STAC polling)
COPERNICUS_CLIENT_ID="your_cdse_client_id"
COPERNICUS_CLIENT_SECRET="your_cdse_client_secret"

# Service URLs
NEXT_PUBLIC_BACKEND_URL="http://localhost:5000"
FLASK_ENV="development"
```

---

### Step 2: Backend Setup (Flask Server)

```bash
cd backend

# Create and activate Python virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux / macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run automated backend & scientific verification
python verify_post_audit_fixes.py

# Start Flask server
python app.py
```
*Backend runs at `http://localhost:5000`.*

---

### Step 3: Frontend Setup (Next.js App)

Open a second terminal window:

```bash
cd frontend

# Install dependencies
npm install

# Verify production build compilation
npm run build

# Start Turbopack development server
npm run dev
```
*Frontend runs at `http://localhost:3000`.*

---

## 🧪 Automated Verification Suite

AquaTrace includes an automated test harness validating API health, ML classification, SAR quality checks, and hydrodynamic calculations:

```bash
python backend/verify_post_audit_fixes.py
```

Expected output:
```text
test_01_health_check ... ok
test_02_ml_classify_endpoint ... ok
test_03_quality_gate_endpoint ... ok
test_04_counterfactual_simulation ... ok
test_05_backward_lagrangian_hindcast ... ok
test_06_incidents_and_candidates ... ok

----------------------------------------------------------------------
Ran 6 tests in 0.011s — OK
```

To validate TypeScript compilation and static page generation:
```bash
cd frontend
npm run build
```

---

## 📡 API Reference

### Core REST Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service health, model status, and live AIS connection telemetry |
| `GET` | `/api/screening/zones` | Retrieve all 5 active AOI screening zones and status |
| `GET` | `/api/screening/acquisitions` | Query discovered Sentinel-1 SAR acquisitions with quality check results |
| `GET` | `/api/incidents` | List detected oil spill incidents with classification scores and triage data |
| `GET` | `/api/incidents/:id/candidates`| Query correlated AIS candidate vessels for a specific incident |
| `POST` | `/api/simulation/counterfactual` | Execute Lagrangian forward particle dispersion test for a candidate vessel |
| `POST` | `/api/ml/classify` | Submit a SAR image patch for ConvNeXt-Tiny inference |

### WebSocket Events (`Socket.IO`)

| Event Name | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `vessel_update` | Server $\to$ Client | `{ mmsi, name, lat, lon, cog, sog, type, timestamp }` | Throttled real-time AIS vessel telemetry broadcast |
| `connect` | Bidirectional | — | WebSocket connection established |
| `disconnect` | Bidirectional | — | WebSocket connection terminated |

---

## 🎨 Design System & Visual Hierarchy

AquaTrace is styled as a mission-critical government operations workstation. It avoids neon gamification, excessive borders, and sci-fi aesthetic clutter:

```
LIGHT ANALYST PALETTE               DARK OPERATIONS PALETTE
Surface:   #F8FAFC (Slate 50)       Surface:   #0B0F17 (Deep Navy Slate)
Panel:     #FFFFFF (Pure White)     Panel:     #111827 (Muted Charcoal)
Border:    #CBD5E1 (Slate 300)      Border:    #334155 (Slate 700)
Subtle:    #E2E8F0 (Slate 200)      Subtle:    #263241 (Dark Slate)
Divider:   #D8DEE7 (Divider Gray)   Divider:   #202A36 (Deep Divider)
Text:      #0F172A (Slate 900)      Text:      #F8FAFC (Slate 50)
Accent:    #0284C7 (Maritime Blue)  Accent:    #38BDF8 (Tactical Sky)
```

- **Proportional Typography (Inter)**: Applied to conclusions, analyst narratives, descriptions, and legal summaries.
- **Monospace Typography (JetBrains Mono)**: Reserved for coordinates, timestamps, MMSI/IMO identifiers, and mathematical metrics.
- **Map Camera Controls**: Interactive `FIT EVIDENCE`, `FIT SOURCE`, `FIT VESSEL`, `FIT SLICK`, and `FIT PLUME` controls dynamically re-frame geometry with zero screen clipping.

---

## 📜 Legal & Compliance Disclaimer

AquaTrace is an advanced decision-support and spatial analytics platform. All counterfactual simulations, trajectory hindcasts, and attribution scores represent deterministic numerical models based on available sensor data and hydrodynamic reanalysis. Outputs are intended to guide maritime enforcement investigations and do not constitute self-executing legal verdicts.

---

## 🤝 Contributors & Acknowledgments

- **European Space Agency (ESA) & Copernicus Open Access Hub**: Sentinel-1 SAR imagery and STAC metadata.
- **AISStream.io**: Global terrestrial and satellite AIS real-time data stream.
- **ECMWF & Copernicus Marine Environment Monitoring Service (CMEMS)**: ERA5 reanalysis and global ocean surface currents.
- **Esri & CARTO**: Basemap tile services.

Developed by **[Parth Mahadik](https://github.com/ParthMahadik33)**.

---

<div align="center">
  <sub>AquaTrace Maritime Domain Awareness & Oil Spill Investigation Platform • MIT License</sub>
</div>
