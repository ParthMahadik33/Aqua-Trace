'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  X,
  Navigation,
  Compass,
  Gauge,
  MapPin,
  Radio,
  Anchor,
  Copy,
  Check,
  Crosshair,
  Clock,
  AlertTriangle,
  Route,
  Loader2,
} from 'lucide-react';
import { Vessel, SHIP_CATEGORY_COLORS } from '@/types/vessel';

interface VesselDetailDrawerProps {
  vessel: Vessel | null;
  onClose: () => void;
  onFocusVessel: (vessel: Vessel) => void;
}

// Convert decimal degree to DMS format
function toDMS(val: number, isLat: boolean): string {
  const absolute = Math.abs(val);
  const degrees = Math.floor(absolute);
  const minutesNotTruncated = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesNotTruncated);
  const seconds = Math.floor((minutesNotTruncated - minutes) * 60);
  const direction = isLat ? (val >= 0 ? 'N' : 'S') : val >= 0 ? 'E' : 'W';
  return `${degrees}°${minutes}'${seconds}" ${direction}`;
}

// Convert degrees to cardinal direction
function degreesToCardinal(deg: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round((deg % 360) / 22.5) % 16;
  return directions[index];
}

// AIS static data broadcasts every ~6 minutes (360 seconds) per ITU-R M.1371
const AIS_STATIC_CYCLE_SECONDS = 360;

interface PendingClassificationCardProps {
  elapsedTrackedStr: string;
  firstTrackedEpoch?: number;
}

const PendingClassificationCard: React.FC<PendingClassificationCardProps> = ({
  elapsedTrackedStr,
  firstTrackedEpoch,
}) => {
  const [cycleProgress, setCycleProgress] = useState(0); // 0–1 within current 6-min cycle
  const [etaStr, setEtaStr] = useState<string>('~6 min');
  const [cycleNum, setCycleNum] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const update = () => {
      const nowEpoch = Date.now() / 1000;
      const startEpoch = firstTrackedEpoch || nowEpoch;
      const totalElapsed = Math.max(0, nowEpoch - startEpoch);
      const withinCycle = totalElapsed % AIS_STATIC_CYCLE_SECONDS;
      const progress = withinCycle / AIS_STATIC_CYCLE_SECONDS;
      const remainingSec = Math.ceil(AIS_STATIC_CYCLE_SECONDS - withinCycle);
      const cycle = Math.floor(totalElapsed / AIS_STATIC_CYCLE_SECONDS);

      setCycleProgress(progress);
      setCycleNum(cycle);

      if (remainingSec <= 10) {
        setEtaStr('imminent');
      } else if (remainingSec < 60) {
        setEtaStr(`~${remainingSec}s`);
      } else {
        const m = Math.floor(remainingSec / 60);
        const s = remainingSec % 60;
        setEtaStr(`~${m}m ${s}s`);
      }
    };

    update();
    intervalRef.current = setInterval(update, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [firstTrackedEpoch]);

  // SVG ring params
  const RADIUS = 22;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const strokeDashoffset = CIRCUMFERENCE * (1 - cycleProgress);
  const isImminent = cycleProgress > 0.9;

  return (
    <div className="bg-[#0D1520]/90 border border-slate-500/30 rounded-xl p-4 space-y-3.5 relative overflow-hidden">
      {/* Background shimmer effect */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          background: `linear-gradient(135deg, #60A5FA 0%, transparent 60%)`,
        }}
      />

      {/* Header row */}
      <div className="flex items-center justify-between text-xs font-mono relative">
        <span className="flex items-center gap-2 font-bold text-slate-100">
          <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin flex-shrink-0" />
          SYNCING AIS SPECIFICATIONS
        </span>
        <div className="flex items-center gap-1.5">
          {cycleNum > 0 && (
            <span className="text-[9px] bg-blue-500/15 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/30 font-mono">
              CYCLE {cycleNum + 1}
            </span>
          )}
          <span className="text-[10px] bg-slate-500/15 text-slate-300 px-2 py-0.5 rounded border border-slate-500/30">
            {elapsedTrackedStr}
          </span>
        </div>
      </div>

      {/* Progress section: ring + bar */}
      <div className="flex items-center gap-4 relative">
        {/* Radial SVG progress ring */}
        <div className="relative flex-shrink-0" title={`${Math.round(cycleProgress * 100)}% into current cycle`}>
          <svg width="56" height="56" className="transform -rotate-90">
            {/* Track ring */}
            <circle
              cx="28" cy="28" r={RADIUS}
              fill="none"
              stroke="rgba(100,116,139,0.2)"
              strokeWidth="4"
            />
            {/* Progress arc */}
            <circle
              cx="28" cy="28" r={RADIUS}
              fill="none"
              stroke={isImminent ? '#34D399' : '#60A5FA'}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.5s ease' }}
            />
          </svg>
          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="text-[11px] font-bold font-mono leading-none"
              style={{ color: isImminent ? '#34D399' : '#60A5FA' }}
            >
              {Math.round(cycleProgress * 100)}%
            </span>
            <span className="text-[8px] text-zinc-500 font-mono mt-0.5">cycle</span>
          </div>
        </div>

        {/* Right column: bar + ETA */}
        <div className="flex-1 space-y-2.5">
          {/* Linear progress bar */}
          <div>
            <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400 mb-1.5">
              <span>Next broadcast window</span>
              <span
                className={`font-semibold ${isImminent ? 'text-emerald-400 animate-pulse' : 'text-slate-300'}`}
              >
                {isImminent ? '⚡ IMMINENT' : etaStr}
              </span>
            </div>
            <div className="w-full bg-zinc-800/80 h-2 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${cycleProgress * 100}%`,
                  background: isImminent
                    ? 'linear-gradient(90deg, #059669, #34D399)'
                    : 'linear-gradient(90deg, #1D4ED8, #60A5FA)',
                }}
              />
            </div>
            <div className="flex justify-between text-[9px] font-mono text-zinc-600 mt-1">
              <span>0s</span>
              <span>6 min (AIS cycle)</span>
            </div>
          </div>

          {/* Status pills row */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="flex items-center gap-1 text-[9px] font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.5 rounded">
              <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse inline-block" />
              POS LIVE
            </span>
            <span className="flex items-center gap-1 text-[9px] font-mono text-slate-400 bg-slate-500/10 border border-slate-500/25 px-1.5 py-0.5 rounded">
              <Loader2 className="w-2.5 h-2.5 animate-spin" />
              TYPE 5/24 PENDING
            </span>
          </div>
        </div>
      </div>

      {/* Explanation text */}
      <p className="text-[11px] text-zinc-500 leading-relaxed relative border-t border-white/5 pt-2.5">
        Position, SOG &amp; heading are tracked live. Ship classification requires an AIS Type 5/24 static broadcast (approx. every 6 minutes) — resolution is automatic.
      </p>
    </div>
  );
};

export const VesselDetailDrawer: React.FC<VesselDetailDrawerProps> = ({
  vessel,
  onClose,
  onFocusVessel,
}) => {
  const [relativeTimeStr, setRelativeTimeStr] = useState<string>('just now');
  const [elapsedTrackedStr, setElapsedTrackedStr] = useState<string>('0s');
  const [copiedMMSI, setCopiedMMSI] = useState(false);
  const [copiedCoord, setCopiedCoord] = useState(false);

  // Live updating relative time counter (ticking every 1 second)
  useEffect(() => {
    if (!vessel) return;

    const updateTimer = () => {
      const vesselEpoch = vessel.last_updated_epoch || (new Date(vessel.last_updated).getTime() / 1000);
      const nowEpoch = Date.now() / 1000;
      const diffSec = Math.max(0, Math.floor(nowEpoch - vesselEpoch));

      if (diffSec < 5) {
        setRelativeTimeStr('just now');
      } else if (diffSec < 60) {
        setRelativeTimeStr(`${diffSec}s ago`);
      } else if (diffSec < 3600) {
        const mins = Math.floor(diffSec / 60);
        const secs = diffSec % 60;
        setRelativeTimeStr(`${mins}m ${secs}s ago`);
      } else {
        const hrs = Math.floor(diffSec / 3600);
        const mins = Math.floor((diffSec % 3600) / 60);
        setRelativeTimeStr(`${hrs}h ${mins}m ago`);
      }

      // Calculate elapsed tracking time for pending vessels
      const firstEpoch = vessel.first_tracked_epoch || vesselEpoch;
      const trackedSec = Math.max(0, Math.floor(nowEpoch - firstEpoch));
      if (trackedSec < 60) {
        setElapsedTrackedStr(`${trackedSec}s`);
      } else {
        const mins = Math.floor(trackedSec / 60);
        const secs = trackedSec % 60;
        setElapsedTrackedStr(`${mins}m ${secs}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [vessel]);

  if (!vessel) return null;

  const isPending = vessel.ship_type === 'Pending' || vessel.raw_type === null || vessel.raw_type === undefined;
  const colorInfo = SHIP_CATEGORY_COLORS[vessel.ship_type] || SHIP_CATEGORY_COLORS.Pending;
  const speedKnots = typeof vessel.sog === 'number' ? vessel.sog : 0;
  const speedKmh = (speedKnots * 1.852).toFixed(1);
  const courseDeg = typeof vessel.cog === 'number' ? vessel.cog : 0;
  const cardinalDir = degreesToCardinal(courseDeg);
  const isDemo = Boolean(vessel.is_demo);
  const historyCount = Array.isArray(vessel.history) ? vessel.history.length : 1;
  const projectedDistanceNm = ((speedKnots * 15) / 60).toFixed(2); // Nautical miles in 15 mins

  const handleCopyMMSI = () => {
    navigator.clipboard.writeText(vessel.mmsi);
    setCopiedMMSI(true);
    setTimeout(() => setCopiedMMSI(false), 2000);
  };

  const handleCopyCoordinates = () => {
    navigator.clipboard.writeText(`${vessel.lat.toFixed(5)}, ${vessel.lon.toFixed(5)}`);
    setCopiedCoord(true);
    setTimeout(() => setCopiedCoord(false), 2000);
  };

  return (
    <div className="fixed top-14 right-0 bottom-0 w-[420px] max-w-[92vw] bg-[#0A0E17]/95 border-l border-white/10 z-[600] shadow-2xl flex flex-col backdrop-blur-md transition-transform duration-300 ease-out text-zinc-200">
      {/* Top Header Bar */}
      <div className="p-4 border-b border-white/10 flex items-start justify-between bg-[#0E1422]/90">
        <div className="flex-1 pr-3">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold tracking-wider uppercase border ${
                isPending ? 'border-dashed' : ''
              }`}
              style={{
                backgroundColor: `${colorInfo.hex}18`,
                borderColor: `${colorInfo.hex}50`,
                color: colorInfo.hex,
              }}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isPending ? 'animate-ping' : ''}`}
                style={{ backgroundColor: colorInfo.hex }}
              ></span>
              {isPending ? 'Pending Static' : vessel.ship_type}
            </span>
            <span className="text-zinc-400 font-mono text-xs">MMSI {vessel.mmsi}</span>
            {isDemo && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/50">
                DEMO DATA
              </span>
            )}
          </div>
          <h2 className="text-lg font-bold text-white tracking-wide truncate">
            {vessel.name || `VESSEL [${vessel.mmsi}]`}
          </h2>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-md transition-colors cursor-pointer"
          title="Close Panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Demo Warning Banner if Simulated */}
      {isDemo && (
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/30 flex items-center gap-2 text-xs font-mono text-amber-300">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>OFFLINE FALLBACK // SIMULATED DEMO VESSEL</span>
        </div>
      )}

      {/* Live Status & Freshness Banner */}
      <div className="px-4 py-2.5 bg-[#070A10] border-b border-white/5 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2 text-emerald-400">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-medium tracking-wide">
            {isDemo ? 'SIMULATED TELEMETRY' : 'ACTIVE LIVE AIS TELEMETRY'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-zinc-400">
          <Clock className="w-3.5 h-3.5 text-zinc-500" />
          <span>Updated {relativeTimeStr}</span>
        </div>
      </div>

      {/* Main Dossier Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans custom-scrollbar">
        {/* Pending Static Classification Info Card if awaiting static data */}
        {isPending && (
          <PendingClassificationCard
            elapsedTrackedStr={elapsedTrackedStr}
            firstTrackedEpoch={vessel.first_tracked_epoch}
          />
        )}

        {/* Navigation & Telemetry Readouts */}
        <div className="grid grid-cols-2 gap-3">
          {/* SOG Card */}
          <div className="bg-[#111726] border border-white/10 rounded-lg p-3 relative overflow-hidden">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-mono mb-1">
              <span className="flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                SPEED (SOG)
              </span>
              <span className="text-[10px] text-zinc-500">KNOTS</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-white tracking-tight">
                {speedKnots.toFixed(1)}
              </span>
              <span className="text-xs font-mono text-zinc-400">kn</span>
            </div>
            <div className="text-[11px] font-mono text-zinc-400 mt-1">
              ≈ {speedKmh} km/h
            </div>
            {/* Speed visual bar */}
            <div className="w-full bg-zinc-800 h-1 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-cyan-400 transition-all duration-500"
                style={{ width: `${Math.min(100, (speedKnots / 25) * 100)}%` }}
              ></div>
            </div>
          </div>

          {/* COG Card */}
          <div className="bg-[#111726] border border-white/10 rounded-lg p-3 relative overflow-hidden">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-mono mb-1">
              <span className="flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-amber-400" />
                COURSE (COG)
              </span>
              <span className="text-[10px] text-zinc-500">{cardinalDir}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-white tracking-tight">
                {Math.round(courseDeg)}°
              </span>
              <span className="text-xs font-mono text-zinc-400">{courseDeg.toFixed(1)}°</span>
            </div>
            <div className="text-[11px] font-mono text-zinc-400 mt-1 flex items-center gap-1">
              <Navigation
                className="w-3 h-3 text-amber-400 transition-transform duration-300"
                style={{ transform: `rotate(${courseDeg}deg)` }}
              />
              <span>Heading Vector</span>
            </div>
          </div>
        </div>

        {/* Tactical Track & Projection Analysis */}
        <div className="bg-[#111726] border border-cyan-500/20 rounded-lg p-3.5 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-mono text-cyan-400 font-semibold">
            <span className="flex items-center gap-1.5">
              <Route className="w-3.5 h-3.5" />
              TRACK & DEAD-RECKONING
            </span>
            <span className="text-[10px] text-zinc-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
              ACTIVE ON MAP
            </span>
          </div>

          <div className="space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between py-1 border-b border-white/5">
              <div className="flex items-center gap-2">
                <span className="w-3 h-1 rounded-full" style={{ backgroundColor: colorInfo.hex }}></span>
                <span className="text-zinc-300">Historical Trail:</span>
              </div>
              <span className="text-white font-medium">{historyCount} points (solid)</span>
            </div>

            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <span className="w-3 h-1 border-b-2 border-dashed border-cyan-400"></span>
                <span className="text-zinc-300">15-min DR Projected:</span>
              </div>
              <span className="text-cyan-300 font-medium">
                {speedKnots > 0.2 ? `+${projectedDistanceNm} nm (dashed)` : 'Stationary'}
              </span>
            </div>
          </div>
        </div>

        {/* Position & Coordinates */}
        <div className="bg-[#111726] border border-white/10 rounded-lg p-3.5 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
            <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
              <MapPin className="w-3.5 h-3.5" />
              GEOGRAPHIC POSITION
            </span>
            <button
              onClick={handleCopyCoordinates}
              className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
            >
              {copiedCoord ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          <div className="space-y-1.5 font-mono text-xs">
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-zinc-400">Decimal:</span>
              <span className="text-white font-medium">
                {vessel.lat.toFixed(5)}°, {vessel.lon.toFixed(5)}°
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-zinc-400">Latitude (DMS):</span>
              <span className="text-zinc-300">{toDMS(vessel.lat, true)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-zinc-400">Longitude (DMS):</span>
              <span className="text-zinc-300">{toDMS(vessel.lon, false)}</span>
            </div>
          </div>
        </div>

        {/* Voyage & Destination */}
        <div className="bg-[#111726] border border-white/10 rounded-lg p-3.5 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-400 font-semibold">
            <Anchor className="w-3.5 h-3.5 text-blue-400" />
            VOYAGE INTEL
          </div>
          <div className="font-mono text-xs space-y-2">
            <div>
              <div className="text-[11px] text-zinc-400">DESTINATION</div>
              <div className="text-sm font-bold text-cyan-300 tracking-wide mt-0.5">
                {vessel.destination && vessel.destination !== 'UNSPECIFIED'
                  ? vessel.destination
                  : isPending
                  ? 'Awaiting Static Report'
                  : 'UNSPECIFIED / OFFSHORE'}
              </div>
            </div>
          </div>
        </div>

        {/* Vessel Specifications & AIS Static */}
        <div className="bg-[#111726] border border-white/10 rounded-lg p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400 font-semibold">
            <span className="flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-purple-400" />
              STATIC AIS IDENTIFIERS
            </span>
          </div>

          <div className="space-y-1.5 font-mono text-xs">
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-zinc-400">MMSI:</span>
              <div className="flex items-center gap-2">
                <span className="text-white font-medium">{vessel.mmsi}</span>
                <button
                  onClick={handleCopyMMSI}
                  className="p-1 text-zinc-400 hover:text-white rounded hover:bg-white/10 cursor-pointer"
                  title="Copy MMSI"
                >
                  {copiedMMSI ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>

            {vessel.callsign && (
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-zinc-400">Call Sign:</span>
                <span className="text-zinc-300 uppercase">{vessel.callsign}</span>
              </div>
            )}

            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-zinc-400">AIS Ship Type:</span>
              <span className="text-zinc-300">
                {isPending
                  ? 'Pending Transponder Broadcast'
                  : `${vessel.ship_type} ${vessel.raw_type !== null && vessel.raw_type !== undefined ? `(Code ${vessel.raw_type})` : ''}`}
              </span>
            </div>

            {vessel.dimension && (
              <div className="flex justify-between py-1">
                <span className="text-zinc-400">Dimensions:</span>
                <span className="text-zinc-300">
                  {((vessel.dimension.A || 0) + (vessel.dimension.B || 0))}m × {((vessel.dimension.C || 0) + (vessel.dimension.D || 0))}m
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Action Footer */}
      <div className="p-4 border-t border-white/10 bg-[#0E1422]/90 flex items-center gap-2">
        <button
          onClick={() => onFocusVessel(vessel)}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 rounded-lg text-xs font-mono font-semibold tracking-wider transition-colors shadow-lg cursor-pointer"
        >
          <Crosshair className="w-4 h-4" />
          LOCK & RECENTER MAP
        </button>
      </div>
    </div>
  );
};

export default VesselDetailDrawer;
