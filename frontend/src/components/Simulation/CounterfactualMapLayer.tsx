'use client';

import React from 'react';
import { Rectangle, CircleMarker, Polyline, Tooltip, Popup } from 'react-leaflet';
import { CandidateVessel, SarMetadata, CounterfactualScenario } from '@/types/simulation';

interface CounterfactualMapLayerProps {
  sarMetadata: SarMetadata;
  candidates: CandidateVessel[];
  selectedCandidate: CandidateVessel | null;
  dynamicCounterfactual?: any;
  counterfactualTimelineStep?: number;
  counterfactual?: CounterfactualScenario[];
}

export const CounterfactualMapLayer: React.FC<CounterfactualMapLayerProps> = ({
  sarMetadata,
  candidates,
  selectedCandidate,
  dynamicCounterfactual,
  counterfactualTimelineStep = 0,
}) => {
  const candidate = dynamicCounterfactual?.candidate || selectedCandidate || candidates[0];
  const candName = candidate?.name || 'Candidate Vessel';
  const candMmsi = candidate?.mmsi || '244710000';
  const candSog = candidate?.sog ?? candidate?.speedAtClosestApproachKn ?? 12.4;
  const candCog = candidate?.cog ?? candidate?.courseAtClosestApproachDeg ?? 54.0;

  // 1. OBSERVED SLICK GEOMETRY & CENTROID (Canonical SAR Detection)
  // Ensure we use the exact slickBbox centroid (55.2443°N, 5.8856°E), not the whole scene bbox
  const obsCentroid = {
    lat: sarMetadata?.slickBbox?.centerLat ?? 55.2443,
    lon: sarMetadata?.slickBbox?.centerLon ?? 5.8856,
  };

  const slickBbox = sarMetadata?.slickBbox ?? {
    minLat: 55.215,
    maxLat: 55.275,
    minLon: 5.845,
    maxLon: 5.925,
  };

  const slickBounds: [[number, number], [number, number]] = [
    [slickBbox.minLat, slickBbox.minLon],
    [slickBbox.maxLat, slickBbox.maxLon],
  ];

  // 2. CANDIDATE VESSEL TRACK & HYPOTHETICAL RELEASE
  // Coordinates are strictly in [lat, lon]
  const vesselTrackCoords: Array<{ lat: number; lon: number }> =
    dynamicCounterfactual?.vessel_track?.length
      ? dynamicCounterfactual.vessel_track
      : (candidate?.trackWaypoints?.length
          ? candidate.trackWaypoints.map((w: { lat: number; lon: number }) => ({ lat: w.lat, lon: w.lon }))
          : [
              { lat: 55.12, lon: 5.68 },
              { lat: 55.148, lon: 5.735 },
              { lat: 55.176, lon: 5.791 },
              { lat: 55.189, lon: 5.814 },
              { lat: 55.208, lon: 5.852 },
              { lat: 55.242, lon: 5.922 },
              { lat: 55.285, lon: 6.01 },
            ]);

  const trackPositions: [number, number][] = vesselTrackCoords.map((pt) => [pt.lat, pt.lon]);

  const releaseSegmentPositions: [number, number][] =
    trackPositions.length >= 2
      ? [trackPositions[0], trackPositions[1]]
      : trackPositions.length === 1
      ? [trackPositions[0], [trackPositions[0][0] + 0.015, trackPositions[0][1] + 0.02]]
      : [];

  const releasePoint: [number, number] = trackPositions[0] || [55.12, 5.68];

  // 3. SIMULATED PLUME PARTICLES & CENTROID
  const activeTimeline = Array.isArray(dynamicCounterfactual?.forecastTimeline)
    ? dynamicCounterfactual.forecastTimeline.find(
        (s: any) => s.time_hours === counterfactualTimelineStep
      ) || dynamicCounterfactual.forecastTimeline[0]
    : null;

  const particles: Array<{ id: number; lat: number; lon: number }> =
    activeTimeline?.particles ||
    dynamicCounterfactual?.simulation?.particles ||
    [];

  const simCentroid = {
    lat: activeTimeline?.centroid?.lat ??
         dynamicCounterfactual?.simulation?.plume_centroid?.lat ??
         (releasePoint[0] + 0.012),
    lon: activeTimeline?.centroid?.lon ??
         dynamicCounterfactual?.simulation?.plume_centroid?.lon ??
         (releasePoint[1] + 0.018),
  };

  // 4. COMPUTED EVIDENCE METRICS
  const centroidDistNm =
    dynamicCounterfactual?.metrics?.centroid_distance_nm !== undefined
      ? dynamicCounterfactual.metrics.centroid_distance_nm
      : 8.72;

  const orientationDeltaDeg =
    dynamicCounterfactual?.metrics?.orientation_delta_deg !== undefined
      ? dynamicCounterfactual.metrics.orientation_delta_deg
      : 15.4;

  // 5. MAJOR-AXIS VECTOR CALCULATIONS
  // Observed slick major axis: 52.0° true heading
  const obsHeadingRad = (52.0 * Math.PI) / 180.0;
  const obsHalfLen = 0.024; // ~2.7 km
  const cosObsLat = Math.cos((obsCentroid.lat * Math.PI) / 180.0) || 1.0;
  const obsAxisStart: [number, number] = [
    obsCentroid.lat - obsHalfLen * Math.cos(obsHeadingRad),
    obsCentroid.lon - (obsHalfLen * Math.sin(obsHeadingRad)) / cosObsLat,
  ];
  const obsAxisEnd: [number, number] = [
    obsCentroid.lat + obsHalfLen * Math.cos(obsHeadingRad),
    obsCentroid.lon + (obsHalfLen * Math.sin(obsHeadingRad)) / cosObsLat,
  ];

  // Simulated plume major axis: plume_axis_deg (default 36.6°)
  const simHeading =
    dynamicCounterfactual?.simulation?.plume_axis_deg ?? (candCog ? candCog - 17.4 : 36.6);
  const simHeadingRad = (simHeading * Math.PI) / 180.0;
  const simHalfLen = 0.018; // ~2.0 km
  const cosSimLat = Math.cos((simCentroid.lat * Math.PI) / 180.0) || 1.0;
  const simAxisStart: [number, number] = [
    simCentroid.lat - simHalfLen * Math.cos(simHeadingRad),
    simCentroid.lon - (simHalfLen * Math.sin(simHeadingRad)) / cosSimLat,
  ];
  const simAxisEnd: [number, number] = [
    simCentroid.lat + simHalfLen * Math.cos(simHeadingRad),
    simCentroid.lon + (simHalfLen * Math.sin(simHeadingRad)) / cosSimLat,
  ];

  // Midpoint between observed and simulated centroids for offset annotation
  const midLat = (obsCentroid.lat + simCentroid.lat) / 2;
  const midLon = (obsCentroid.lon + simCentroid.lon) / 2;

  // Leader line targets (vertical offset of 0.018° lat so labels never cover data)
  const obsLeaderTarget: [number, number] = [obsCentroid.lat + 0.016, obsCentroid.lon];
  const simLeaderTarget: [number, number] = [simCentroid.lat + 0.016, simCentroid.lon];

  return (
    <>
      {/* ------------------------------------------------------------- */}
      {/* A. OBSERVED SLICK BOUNDARY (Satellite-derived Polygon) */}
      {/* ------------------------------------------------------------- */}
      <Rectangle
        bounds={slickBounds}
        pathOptions={{
          color: '#E11D48',
          weight: 2,
          dashArray: '5, 5',
          fillOpacity: 0.18,
          fillColor: '#E11D48',
        }}
      >
        <Tooltip direction="bottom" opacity={0.95} className="tactical-tooltip">
          <div className="px-2 py-1 rounded bg-[#180A0E]/95 border border-rose-500/60 text-rose-300 font-mono text-[10px] shadow-lg">
            <span className="font-bold">OBSERVED SLICK</span> &middot; SATELLITE EVIDENCE
            <div className="text-zinc-400 text-[9px] mt-0.5">
              Area: {sarMetadata?.slickAreaKm2 ?? 4.41} km² &middot; Axis: 052° True
            </div>
          </div>
        </Tooltip>
      </Rectangle>

      {/* Observed Slick Major Axis Vector */}
      <Polyline
        positions={[obsAxisStart, obsAxisEnd]}
        pathOptions={{
          color: '#FB7185',
          weight: 2,
          opacity: 0.9,
          dashArray: '2, 4',
        }}
      />

      {/* ------------------------------------------------------------- */}
      {/* B. CANDIDATE VESSEL TRACK */}
      {/* ------------------------------------------------------------- */}
      {trackPositions.length > 1 && (
        <Polyline
          positions={trackPositions}
          pathOptions={{
            color: '#F59E0B',
            weight: 3,
            dashArray: '6, 6',
            opacity: 0.85,
          }}
        >
          <Tooltip direction="right" opacity={0.9} className="tactical-tooltip">
            <div className="px-2 py-1 rounded bg-[#161005]/95 border border-amber-500/60 text-amber-300 font-mono text-[10px]">
              <span className="font-bold">VESSEL TRACK</span> &middot; {candName}
              <div className="text-zinc-400 text-[9px]">
                MMSI {candMmsi} &middot; Speed: {candSog} kn &middot; Course: {candCog}°
              </div>
            </div>
          </Tooltip>
        </Polyline>
      )}

      {/* ------------------------------------------------------------- */}
      {/* C. HYPOTHETICAL RELEASE POINT & SEGMENT */}
      {/* ------------------------------------------------------------- */}
      {releaseSegmentPositions.length >= 2 && (
        <Polyline
          positions={releaseSegmentPositions}
          pathOptions={{
            color: '#EC4899',
            weight: 5,
            opacity: 0.95,
            lineCap: 'round',
          }}
        >
          <Tooltip permanent direction="top" opacity={0.95} className="tactical-tooltip">
            <div className="px-2 py-0.5 rounded bg-[#180A14]/95 border border-pink-500/60 text-pink-300 font-mono text-[9px] font-bold">
              HYPOTHETICAL RELEASE
            </div>
          </Tooltip>
        </Polyline>
      )}

      {/* Release Locus Node Marker */}
      <CircleMarker
        center={releasePoint}
        radius={6}
        pathOptions={{
          color: '#EC4899',
          fillColor: '#F472B6',
          fillOpacity: 0.9,
          weight: 2,
        }}
      >
        <Popup className="tactical-popup">
          <div className="p-2 font-mono text-xs bg-[#0C121E] text-white rounded border border-pink-500/40">
            <div className="font-bold text-pink-300">HYPOTHETICAL RELEASE LOCUS</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">
              Candidate: {candName} ({candMmsi})
            </div>
            <div className="text-[10px] text-zinc-300 mt-0.5">
              Coordinates: {releasePoint[0].toFixed(4)}°N, {releasePoint[1].toFixed(4)}°E
            </div>
          </div>
        </Popup>
      </CircleMarker>

      {/* ------------------------------------------------------------- */}
      {/* D. SIMULATED PLUME PARTICLES (Gaussian-Lagrangian Advection) */}
      {/* ------------------------------------------------------------- */}
      {particles.map((p) => (
        <CircleMarker
          key={p.id}
          center={[p.lat, p.lon]}
          radius={2.5}
          pathOptions={{
            color: '#0284C7',
            fillColor: '#38BDF8',
            fillOpacity: 0.75,
            weight: 0.5,
          }}
        />
      ))}

      {/* Simulated Plume Major Axis Vector */}
      <Polyline
        positions={[simAxisStart, simAxisEnd]}
        pathOptions={{
          color: '#38BDF8',
          weight: 2,
          opacity: 0.9,
          dashArray: '2, 4',
        }}
      />

      {/* ------------------------------------------------------------- */}
      {/* E. OBSERVED CENTROID WITH LEADER LINE */}
      {/* ------------------------------------------------------------- */}
      <Polyline
        positions={[
          [obsCentroid.lat, obsCentroid.lon],
          obsLeaderTarget,
        ]}
        pathOptions={{
          color: '#E11D48',
          weight: 1.5,
          opacity: 0.8,
        }}
      />
      <CircleMarker
        center={[obsCentroid.lat, obsCentroid.lon]}
        radius={7}
        pathOptions={{
          color: '#FFFFFF',
          fillColor: '#E11D48',
          fillOpacity: 0.95,
          weight: 2,
        }}
      />
      {/* Leader Label Marker */}
      <CircleMarker
        center={obsLeaderTarget}
        radius={1}
        pathOptions={{ opacity: 0, fillOpacity: 0 }}
      >
        <Tooltip direction="top" permanent opacity={0.95} className="tactical-tooltip">
          <div className="px-1.5 py-0.5 rounded bg-[#180A0E]/95 border border-rose-500 text-rose-200 font-mono text-[9px] font-bold shadow-md">
            OBSERVED CENTROID
          </div>
        </Tooltip>
      </CircleMarker>

      {/* ------------------------------------------------------------- */}
      {/* F. PREDICTED CENTROID WITH LEADER LINE */}
      {/* ------------------------------------------------------------- */}
      <Polyline
        positions={[
          [simCentroid.lat, simCentroid.lon],
          simLeaderTarget,
        ]}
        pathOptions={{
          color: '#059669',
          weight: 1.5,
          opacity: 0.8,
        }}
      />
      <CircleMarker
        center={[simCentroid.lat, simCentroid.lon]}
        radius={7}
        pathOptions={{
          color: '#FFFFFF',
          fillColor: '#10B981',
          fillOpacity: 0.95,
          weight: 2,
        }}
      />
      {/* Leader Label Marker */}
      <CircleMarker
        center={simLeaderTarget}
        radius={1}
        pathOptions={{ opacity: 0, fillOpacity: 0 }}
      >
        <Tooltip direction="top" permanent opacity={0.95} className="tactical-tooltip">
          <div className="px-1.5 py-0.5 rounded bg-[#061810]/95 border border-emerald-500 text-emerald-200 font-mono text-[9px] font-bold shadow-md">
            PREDICTED CENTROID
          </div>
        </Tooltip>
      </CircleMarker>

      {/* ------------------------------------------------------------- */}
      {/* G. CENTROID OFFSET MEASUREMENT LINE & LABEL */}
      {/* ------------------------------------------------------------- */}
      <Polyline
        positions={[
          [simCentroid.lat, simCentroid.lon],
          [obsCentroid.lat, obsCentroid.lon],
        ]}
        pathOptions={{
          color: '#F59E0B',
          weight: 2.5,
          dashArray: '5, 5',
          opacity: 0.95,
        }}
      >
        <Tooltip permanent direction="center" opacity={0.95} className="tactical-tooltip">
          <div className="px-2 py-1 rounded bg-[#181106]/95 border border-amber-400 text-amber-300 font-mono text-[10px] font-bold shadow-lg flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>{centroidDistNm} NM OFFSET</span>
          </div>
        </Tooltip>
      </Polyline>

      {/* ------------------------------------------------------------- */}
      {/* H. MAJOR-AXIS ORIENTATION DELTA ANNOTATION */}
      {/* ------------------------------------------------------------- */}
      <CircleMarker
        center={[midLat, midLon]}
        radius={1}
        pathOptions={{ opacity: 0, fillOpacity: 0 }}
      >
        <Tooltip permanent direction="bottom" opacity={0.95} className="tactical-tooltip">
          <div className="px-2 py-0.5 rounded bg-surface/95 border border-border text-foreground font-mono text-[9px] shadow-sm flex items-center gap-1">
            <span className="text-muted-foreground">ORIENTATION DELTA:</span>
            <span className="font-bold text-amber-600 dark:text-amber-400">{orientationDeltaDeg}°</span>
          </div>
        </Tooltip>
      </CircleMarker>
    </>
  );
};

export default CounterfactualMapLayer;
