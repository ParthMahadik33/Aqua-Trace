'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Polyline, CircleMarker, Polygon, Tooltip, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { CASE_0004_AIS_FLEET, AisFleetVessel } from '@/data/case0004AisFleet';
import { CandidateVessel } from '@/types/simulation';
import { Play, Pause, RotateCcw, Filter, ChevronRight, Navigation, Ship, Clock, AlertCircle } from 'lucide-react';

interface AisCorrelationMapLayerProps {
  onSelectCandidate: (candidate: CandidateVessel) => void;
  selectedCandidate: CandidateVessel | null;
}

export const AisCorrelationMapLayer: React.FC<AisCorrelationMapLayerProps> = ({
  onSelectCandidate,
  selectedCandidate,
}) => {
  const map = useMap();

  // Filter Step:
  // 0: Ingestion (47 total)
  // 1: Spatial Filter (8 remain)
  // 2: Temporal Filter (5 remain)
  // 3: Trajectory Filter (3 remain)
  // 4: Priority Candidates (2 remain)
  const [filterStep, setFilterStep] = useState<number>(0);
  const [vesselCount, setVesselCount] = useState<number>(0);

  // Time Scrubber state: hoursAgo from 48 down to 0 (NOW)
  const [hoursAgo, setHoursAgo] = useState<number>(5.5); // Default to release window (12:00 UTC)
  const [isPlayingTimeline, setIsPlayingTimeline] = useState<boolean>(false);

  const filterHudRef = useRef<HTMLDivElement>(null);
  const scrubberHudRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (filterHudRef.current) {
      L.DomEvent.disableClickPropagation(filterHudRef.current);
      L.DomEvent.disableScrollPropagation(filterHudRef.current);
    }
    if (scrubberHudRef.current) {
      L.DomEvent.disableClickPropagation(scrubberHudRef.current);
      L.DomEvent.disableScrollPropagation(scrubberHudRef.current);
    }
  }, []);

  // On mount: subtle camera transition into source region + animate 0 -> 47 vessels
  useEffect(() => {
    map.flyTo([55.20, 5.83], 10, { duration: 1.4 });

    // Animate count-up of vessels
    let current = 0;
    const interval = setInterval(() => {
      current += 3;
      if (current >= 47) {
        setVesselCount(47);
        clearInterval(interval);
      } else {
        setVesselCount(current);
      }
    }, 40);

    return () => clearInterval(interval);
  }, [map]);

  // Automated step progression when first loaded: gradually filters down over 6 seconds
  useEffect(() => {
    const timer1 = setTimeout(() => setFilterStep(1), 1800); // Step 1: Spatial
    const timer2 = setTimeout(() => setFilterStep(2), 3600); // Step 2: Temporal
    const timer3 = setTimeout(() => setFilterStep(3), 5400); // Step 3: Trajectory
    const timer4 = setTimeout(() => setFilterStep(4), 7200); // Step 4: Priority

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, []);

  // Timeline playback loop
  useEffect(() => {
    if (!isPlayingTimeline) return;

    const interval = setInterval(() => {
      setHoursAgo((prev) => {
        if (prev <= 0) return 48; // Loop back
        return Math.max(0, prev - 1.5);
      });
    }, 400);

    return () => clearInterval(interval);
  }, [isPlayingTimeline]);

  // Helper: interpolate vessel position at specific hoursAgo
  const getInterpolatedPosition = (vessel: AisFleetVessel, targetHoursAgo: number) => {
    const pts = vessel.waypoints;
    if (!pts || pts.length === 0) return { lat: 55.2, lon: 5.8, course: 54, speed: 12 };
    if (pts.length === 1) return { lat: pts[0].lat, lon: pts[0].lon, course: pts[0].courseDeg, speed: pts[0].speedKn };

    // Find two bounding waypoints
    // Waypoints are sorted by descending hoursAgo (e.g. 48 -> 24 -> 12 -> 5.5 -> 0)
    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];
      if (targetHoursAgo <= p1.hoursAgo && targetHoursAgo >= p2.hoursAgo) {
        const span = p1.hoursAgo - p2.hoursAgo;
        const factor = span === 0 ? 0 : (p1.hoursAgo - targetHoursAgo) / span;
        return {
          lat: p1.lat + (p2.lat - p1.lat) * factor,
          lon: p1.lon + (p2.lon - p1.lon) * factor,
          course: p1.courseDeg + (p2.courseDeg - p1.courseDeg) * factor,
          speed: p1.speedKn + (p2.speedKn - p1.speedKn) * factor,
        };
      }
    }

    if (targetHoursAgo > pts[0].hoursAgo) {
      return { lat: pts[0].lat, lon: pts[0].lon, course: pts[0].courseDeg, speed: pts[0].speedKn };
    }
    const last = pts[pts.length - 1];
    return { lat: last.lat, lon: last.lon, course: last.courseDeg, speed: last.speedKn };
  };

  // Determine visibility & styling of each vessel based on current filterStep
  const getVesselStyle = (vessel: AisFleetVessel) => {
    const isSelected = selectedCandidate?.mmsi === vessel.mmsi;
    const isLeadSuspect = vessel.mmsi === '244710000'; // MT NORDIC POLARIS
    const isSecondary = vessel.mmsi === '219018000'; // MT PACIFIC GEMINI

    // Check if vessel survives current filter step:
    // Step 0: all 47 visible
    // Step 1: vessels with stageEliminated >= 2 survive (8 remain)
    // Step 2: vessels with stageEliminated >= 3 survive (5 remain)
    // Step 3: vessels with stageEliminated >= 4 survive (3 remain)
    // Step 4: vessels with stageEliminated >= 5 survive (2 remain)
    const survives = vessel.stageEliminated > filterStep;

    if (!survives) {
      // Smoothly faded out
      return {
        visible: true,
        opacity: 0.1,
        weight: 1,
        color: '#475569',
        markerRadius: 3,
        isDimmed: true,
      };
    }

    // Surviving vessel styles
    if (isSelected || isLeadSuspect) {
      return {
        visible: true,
        opacity: 0.95,
        weight: 3.5,
        color: '#00F0FF', // Bright AquaTrace Cyan
        markerRadius: 6,
        isDimmed: false,
      };
    }

    if (isSecondary) {
      return {
        visible: true,
        opacity: 0.85,
        weight: 2.5,
        color: '#F59E0B', // Amber for Rank #2 priority
        markerRadius: 5,
        isDimmed: false,
      };
    }

    if (filterStep >= 3) {
      return {
        visible: true,
        opacity: 0.7,
        weight: 2,
        color: '#38BDF8', // Cyan/sky for trajectory compatible
        markerRadius: 4,
        isDimmed: false,
      };
    }

    if (filterStep >= 1) {
      return {
        visible: true,
        opacity: 0.55,
        weight: 1.5,
        color: '#94A3B8', // Slate for spatial matches
        markerRadius: 4,
        isDimmed: false,
      };
    }

    // Step 0 initial view
    return {
      visible: true,
      opacity: 0.35,
      weight: 1.2,
      color: '#64748B',
      markerRadius: 3.5,
      isDimmed: false,
    };
  };

  // Reconstructed Source Corridor Geographic Polygon (From Hindcast)
  // Restrained translucent ellipse/polygon: 55.08°N–55.24°N, 5.65°E–5.95°E
  const corridorPolygon: [number, number][] = [
    [55.15, 5.70],
    [55.17, 5.74],
    [55.21, 5.83],
    [55.23, 5.92],
    [55.21, 5.96],
    [55.18, 5.90],
    [55.15, 5.82],
    [55.13, 5.75],
  ];

  // Surviving count calculation
  const survivingCount = CASE_0004_AIS_FLEET.filter((v) => v.stageEliminated > filterStep).length;

  return (
    <>
      {/* 1. RECONSTRUCTED SOURCE CORRIDOR (Restrained Translucent Geographic Region) */}
      <Polygon
        positions={corridorPolygon}
        pathOptions={{
          color: '#F59E0B',
          weight: 1.5,
          dashArray: '4, 6',
          fillColor: '#F59E0B',
          fillOpacity: 0.12,
        }}
      >
        <Tooltip permanent direction="top" className="tactical-tooltip">
          <div className="px-2 py-0.5 rounded bg-[#0A0D14]/90 border border-amber-500/40 text-amber-300 font-mono text-[9px] shadow-lg">
            SOURCE CORRIDOR // 11:45–13:20 UTC
          </div>
        </Tooltip>
      </Polygon>

      {/* 2. AIS VESSEL TRACKS & INTERPOLATED POSITIONS */}
      {CASE_0004_AIS_FLEET.map((vessel) => {
        const style = getVesselStyle(vessel);
        const currentPos = getInterpolatedPosition(vessel, hoursAgo);
        const trackPositions: [number, number][] = vessel.waypoints.map((w) => [w.lat, w.lon]);

        return (
          <React.Fragment key={vessel.mmsi}>
            {/* Historical Track Polyline */}
            <Polyline
              positions={trackPositions}
              pathOptions={{
                color: style.color,
                weight: style.weight,
                opacity: style.opacity,
                dashArray: style.isDimmed ? '3, 6' : undefined,
              }}
            />

            {/* Current Interpolated Vessel Marker */}
            <CircleMarker
              center={[currentPos.lat, currentPos.lon]}
              radius={style.markerRadius}
              pathOptions={{
                color: style.color,
                fillColor: style.color,
                fillOpacity: style.isDimmed ? 0.2 : 0.9,
                weight: style.isDimmed ? 1 : 2,
              }}
              eventHandlers={{
                click: () => {
                  onSelectCandidate({
                    mmsi: vessel.mmsi,
                    imo: vessel.imo || 'N/A',
                    name: vessel.name,
                    vesselType: vessel.type,
                    flag: vessel.flag,
                    dwt: 37200,
                    lengthM: 182,
                    beamM: 27,
                    builtYear: 2012,
                    originPort: 'Rotterdam, NL',
                    destinationPort: 'Gothenburg, SE',
                    closestApproachDistanceNm: 0.38,
                    closestApproachTimeUtc: '2018-08-03T12:35:00Z',
                    speedAtClosestApproachKn: currentPos.speed,
                    courseAtClosestApproachDeg: currentPos.course,
                    speedAnomalyDipKn: 2.3,
                    attributionScore: vessel.score || 15,
                    isPrimarySuspect: vessel.isPrimarySuspect || false,
                    funnelStageSurvived: vessel.stageEliminated,
                    attributionFactors: [],
                    supportingEvidence: [],
                    limitations: [],
                    trackWaypoints: vessel.waypoints.map((w) => ({
                      timestamp: `T-${w.hoursAgo}h`,
                      lat: w.lat,
                      lon: w.lon,
                      speedKn: w.speedKn,
                      courseDeg: w.courseDeg,
                    })),
                  });
                },
              }}
            >
              {/* Tooltip on non-dimmed surviving vessels */}
              {!style.isDimmed && (
                <Tooltip direction="top" className="tactical-tooltip">
                  <div className="px-2 py-1 rounded bg-[#070A10]/95 border border-cyan-500/40 font-mono text-[10px] text-white shadow-xl">
                    <div className="font-bold text-cyan-300">{vessel.name}</div>
                    <div className="text-zinc-400 text-[9px]">
                      {vessel.type} · {currentPos.speed.toFixed(1)} kn · {Math.round(currentPos.course)}°
                    </div>
                  </div>
                </Tooltip>
              )}
            </CircleMarker>
          </React.Fragment>
        );
      })}

      {/* 3. INTERACTIVE HUD: MULTI-STAGE AIS FILTER CONTROLS (Top-Left) */}
      <div className="leaflet-bottom leaflet-left !bottom-24 !left-4 pointer-events-auto z-[500]">
        <div ref={filterHudRef} className="p-3 rounded-xl bg-[#080C14]/95 border border-white/15 backdrop-blur-md shadow-2xl font-mono text-xs max-w-md">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-bold text-white tracking-wider text-[11px]">
                AIS REASONING FILTER
              </span>
            </div>
            <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-bold border border-cyan-500/40">
              {survivingCount} / {vesselCount} ACTIVE
            </span>
          </div>

          {/* Interactive Step Buttons */}
          <div className="grid grid-cols-5 gap-1 mt-2.5">
            {[
              { step: 0, label: '0. INGEST', count: 47 },
              { step: 1, label: '1. SPATIAL', count: 8 },
              { step: 2, label: '2. TIME', count: 5 },
              { step: 3, label: '3. TRACK', count: 3 },
              { step: 4, label: '4. PRIORITY', count: 2 },
            ].map((st) => (
              <button
                key={st.step}
                onClick={() => setFilterStep(st.step)}
                className={`px-2 py-1.5 rounded text-center transition-all cursor-pointer border ${
                  filterStep === st.step
                    ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 font-bold shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                    : filterStep > st.step
                    ? 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                    : 'bg-transparent border-transparent text-zinc-600 hover:text-zinc-400'
                }`}
              >
                <div className="text-[9px] tracking-wider leading-none">{st.label}</div>
                <div className="text-[11px] font-bold mt-1 text-white">{st.count}</div>
              </button>
            ))}
          </div>

          <div className="mt-2 pt-2 border-t border-white/5 text-[10px] text-zinc-400 flex items-center justify-between">
            <span>
              {filterStep === 0 && 'Ingesting 47 German Bight Class-A vessels'}
              {filterStep === 1 && 'Spatial buffer: eliminated 39 peripheral tracks (>15 nm)'}
              {filterStep === 2 && 'Temporal window: eliminated 3 out-of-window transits'}
              {filterStep === 3 && 'Trajectory alignment: eliminated 2 opposing headings'}
              {filterStep === 4 && 'Priority candidates: 2 vessels intersect source corridor'}
            </span>
          </div>
        </div>
      </div>

      {/* 4. COMPACT TIME SCRUBBER BAR (Bottom-Center of Map) */}
      <div className="leaflet-bottom leaflet-left !bottom-4 !left-4 !right-4 pointer-events-auto z-[500] flex justify-center">
        <div ref={scrubberHudRef} className="px-4 py-2.5 rounded-xl bg-[#080C14]/95 border border-white/15 backdrop-blur-md shadow-2xl flex items-center gap-4 text-xs font-mono w-full max-w-2xl">
          {/* Play/Pause Button */}
          <button
            onClick={() => setIsPlayingTimeline(!isPlayingTimeline)}
            className="p-2 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 transition-all cursor-pointer"
            title={isPlayingTimeline ? 'Pause timeline playback' : 'Play historical vessel motion'}
          >
            {isPlayingTimeline ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          {/* Reset button */}
          <button
            onClick={() => setHoursAgo(5.5)}
            className="p-1.5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Reset to release window (T-5.5h / 12:00 UTC)"
          >
            <RotateCcw className="w-3 h-3" />
          </button>

          {/* Scrubber slider */}
          <div className="flex-1 flex flex-col gap-1">
            <div className="flex justify-between text-[10px] text-zinc-400">
              <span className={hoursAgo > 36 ? 'text-cyan-300 font-bold' : ''}>T - 48h</span>
              <span className={hoursAgo <= 36 && hoursAgo > 24 ? 'text-cyan-300 font-bold' : ''}>T - 36h</span>
              <span className={hoursAgo <= 24 && hoursAgo > 12 ? 'text-cyan-300 font-bold' : ''}>T - 24h</span>
              <span className={hoursAgo <= 12 && hoursAgo > 4 ? 'text-amber-400 font-bold' : ''}>
                T - 5.5h (RELEASE)
              </span>
              <span className={hoursAgo <= 2 ? 'text-cyan-300 font-bold' : ''}>NOW (T0)</span>
            </div>
            <input
              type="range"
              min="0"
              max="48"
              step="0.5"
              value={48 - hoursAgo}
              onChange={(e) => setHoursAgo(48 - parseFloat(e.target.value))}
              className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>

          {/* Time Readout */}
          <div className="text-right min-w-[110px]">
            <div className="text-[11px] font-bold text-white">
              T - {hoursAgo.toFixed(1)}h
            </div>
            <div className="text-[9px] text-zinc-500">
              {hoursAgo >= 4 && hoursAgo <= 6 ? (
                <span className="text-amber-400 font-bold">RELEASE CORRIDOR</span>
              ) : (
                'HISTORICAL TRACK'
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AisCorrelationMapLayer;
