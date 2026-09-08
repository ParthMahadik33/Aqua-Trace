---
title: AquaTrace Backend
emoji: 🌊
colorFrom: blue
colorTo: cyan
sdk: docker
app_port: 7860
pinned: false
license: mit
---

# AquaTrace — Maritime Intelligence & AIS Relay Backend

Real-time AIS vessel telemetry relay and Copernicus Sentinel-1 SAR acquisition services for AquaTrace.

## Capabilities
- **Live AIS Relay**: Connects to `wss://stream.aisstream.io` and broadcasts filtered vessel positions via Socket.IO.
- **Copernicus Sentinel-1 SAR Hub**: Authenticates via CDSE OAuth2 to search radar catalogue and render IW GRD VV composites.
- **REST Telemetry API**: Serves snapshots at `/api/ships`, `/api/health`, and `/`.

## Deployment
This service is containerized for Hugging Face Spaces (Port 7860).

### Environment Variables
Configure the following in your Hugging Face Space Settings > **Repository secrets**:
- `AISSTREAM_API_KEY`: Your AISStream.io API token
- `COPERNICUS_CLIENT_ID`: Copernicus CDSE OAuth client ID
- `COPERNICUS_CLIENT_SECRET`: Copernicus CDSE OAuth client secret
- `CORS_ALLOWED_ORIGINS`: `*` (or your Vercel deployment URL, e.g. `https://aquatrace.vercel.app`)
