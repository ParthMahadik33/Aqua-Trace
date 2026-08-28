'use client';

import React, { useMemo } from 'react';
import { Polyline, CircleMarker, Tooltip, Marker } from 'react-leaflet';
import L from 'leaflet';
import { Vessel, SHIP_CATEGORY_COLORS } from '@/types/vessel';

interface VesselTrackLayerProps {
  vessel: Vessel | null;
}

/**
 * Calculates dead-reckoning projection points given current position, SOG, COG, and elapsed minutes.
 * 1 knot = 1 nautical mile per hour.
 * 1 nautical mile = 1 minute of arc (1/60 degree latitude).
 */
function calculateDeadReckoningTrack(
  lat: number,
  lon: number,
  sogKnots: number,
  cogDegrees: number,
  minutesAhead: number = 15,
  steps: number = 3
): [number, number][] {
  const points: [number, number][] = [[lat, lon]];
  if (sogKnots <= 0.2) {
    return points;
  }

  const cogRad = (cogDegrees * Math.PI) / 180;
  const cosLat = Math.cos((lat * Math.PI) / 180);

  for (let i = 1; i <= steps; i++) {
    const tHours = (minutesAhead * (i / steps)) / 60;
    const distNm = sogKnots * tHours; // Nautical miles traveled

    const deltaLat = (distNm * Math.cos(cogRad)) / 60;
    const deltaLon = cosLat !== 0 ? (distNm * Math.sin(cogRad)) / (60 * cosLat) : 0;

    points.push([lat + deltaLat, lon + deltaLon]);
  }

  return points;
}

export const VesselTrackLayer: React.FC<VesselTrackLayerProps> = ({ vessel }) => {
  if (!vessel) return null;

  const colorInfo = SHIP_CATEGORY_COLORS[vessel.ship_type] || SHIP_CATEGORY_COLORS.Other;
  const hexColor = colorInfo.hex;

  // 1. Build Historical Path (Solid Polyline connecting up to 20 recorded positions)
  const historyPoints: [number, number][] = useMemo(() => {
    const pts: [number, number][] = [];
    if (Array.isArray(vessel.history) && vessel.history.length > 0) {
      vessel.history.forEach(([lat, lon]) => {
        if (typeof lat === 'number' && typeof lon === 'number' && !isNaN(lat) && !isNaN(lon)) {
          pts.push([lat, lon]);
        }
      });
    }
    // Ensure current position is the tail of the historical trail
    if (pts.length === 0 || pts[pts.length - 1][0] !== vessel.lat || pts[pts.length - 1][1] !== vessel.lon) {
      pts.push([vessel.lat, vessel.lon]);
    }
    return pts;
  }, [vessel]);

  // 2. Build 15-Minute Projected Dead-Reckoning Vector (Dashed Polyline)
  const projectedPoints: [number, number][] = useMemo(() => {
    return calculateDeadReckoningTrack(vessel.lat, vessel.lon, vessel.sog, vessel.cog, 15, 3);
  }, [vessel.lat, vessel.lon, vessel.sog, vessel.cog]);

  const endpoint = projectedPoints.length > 1 ? projectedPoints[projectedPoints.length - 1] : null;

  const endpointIcon = useMemo(() => {
    const iconHtml = `
      <div class="relative flex items-center justify-center select-none" style="width: 24px; height: 24px;">
        <div class="absolute inset-0 rounded-full border border-cyan-400 border-dashed animate-spin" style="animation-duration: 8s;"></div>
        <div class="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#00F0FF]"></div>
      </div>
    `;
    return L.divIcon({
      html: iconHtml,
      className: 'projected-endpoint-icon',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  }, []);

  return (
    <>
      {/* 1. ACTUAL HISTORICAL TRACK (Solid Polyline) */}
      {historyPoints.length >= 2 && (
        <>
          <Polyline
            positions={historyPoints}
            pathOptions={{
              color: hexColor,
              weight: 3.5,
              opacity: 0.9,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
          {/* Waypoint Nodes along historical track */}
          {historyPoints.slice(0, -1).map((pt, idx) => (
            <CircleMarker
              key={`hist-${idx}-${pt[0]}-${pt[1]}`}
              center={pt}
              radius={3}
              pathOptions={{
                color: hexColor,
                fillColor: '#0E131F',
                fillOpacity: 0.9,
                weight: 1.5,
              }}
            >
              <Tooltip direction="top" offset={[0, -5]} opacity={0.9} className="tactical-tooltip">
                <div className="bg-[#0B0F17]/95 border border-white/20 px-2 py-1 rounded text-[10px] font-mono text-zinc-300">
                  Track Point #{idx + 1} ({pt[0].toFixed(4)}°, {pt[1].toFixed(4)}°)
                </div>
              </Tooltip>
            </CircleMarker>
          ))}
        </>
      )}

      {/* 2. PROJECTED DEAD-RECKONING VECTOR (~15 min forward, Dashed Polyline) */}
      {projectedPoints.length >= 2 && vessel.sog > 0.2 && (
        <>
          <Polyline
            positions={projectedPoints}
            pathOptions={{
              color: '#00F0FF',
              weight: 2.5,
              opacity: 0.75,
              dashArray: '6, 8',
              lineCap: 'round',
            }}
          />

          {/* Projected 15-min Destination Waypoint */}
          {endpoint && (
            <Marker position={endpoint} icon={endpointIcon}>
              <Tooltip direction="right" offset={[10, 0]} opacity={0.95} permanent={false} className="tactical-tooltip">
                <div className="bg-[#0B0F17]/95 border border-cyan-500/40 px-2.5 py-1.5 rounded shadow-xl text-xs font-mono backdrop-blur">
                  <div className="text-cyan-400 font-bold tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                    PROJECTED (+15 MIN)
                  </div>
                  <div className="text-zinc-300 text-[11px] mt-0.5">
                    Speed: {vessel.sog.toFixed(1)} kn • Course: {Math.round(vessel.cog)}°
                  </div>
                  <div className="text-zinc-400 text-[10px]">
                    Est: {endpoint[0].toFixed(4)}°N, {endpoint[1].toFixed(4)}°E
                  </div>
                </div>
              </Tooltip>
            </Marker>
          )}
        </>
      )}
    </>
  );
};

export default VesselTrackLayer;
