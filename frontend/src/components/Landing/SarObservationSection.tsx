'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Satellite, ExternalLink, RefreshCw } from 'lucide-react';

interface SarObservation {
  id: string;
  region: string;
  subregion: string;
  coordinates: string;
  sensor: string;
  mode: string;
  polarization: string;
  timestampUtc: string;
  pass: string;
  bbox: [number, number, number, number]; // [min_lon, min_lat, max_lon, max_lat]
  imageSvgType: 'open_water_slick' | 'coastal_corridor' | 'chokepoint_vessels';
}

const REGIONAL_OBSERVATIONS: SarObservation[] = [
  {
    id: 'S1A_IW_GRD_ARABIAN_SEA_01',
    region: 'ARABIAN SEA',
    subregion: 'Mumbai Offshore / High Sea Corridor',
    coordinates: '19.24°N, 71.82°E',
    sensor: 'SENTINEL-1A',
    mode: 'IW (Interferometric Wide)',
    polarization: 'VV / VH',
    timestampUtc: '2026-08-29 11:17 UTC',
    pass: 'ASCENDING (Relative Orbit 121)',
    bbox: [70.5, 18.0, 73.0, 20.5],
    imageSvgType: 'open_water_slick',
  },
  {
    id: 'S1B_IW_GRD_WEST_COAST_02',
    region: 'WEST COAST OF INDIA',
    subregion: 'Cochin / Malabar Coastal Corridor',
    coordinates: '09.93°N, 76.21°E',
    sensor: 'SENTINEL-1A',
    mode: 'IW (Interferometric Wide)',
    polarization: 'VV / VH',
    timestampUtc: '2026-08-27 18:42 UTC',
    pass: 'DESCENDING (Relative Orbit 048)',
    bbox: [75.0, 9.0, 77.5, 11.5],
    imageSvgType: 'coastal_corridor',
  },
  {
    id: 'S1A_IW_GRD_BAY_OF_BENGAL_03',
    region: 'BAY OF BENGAL',
    subregion: 'Chennai / Coromandel Sea Corridor',
    coordinates: '13.08°N, 80.29°E',
    sensor: 'SENTINEL-1A',
    mode: 'IW (Interferometric Wide)',
    polarization: 'VV / VH',
    timestampUtc: '2026-08-25 00:34 UTC',
    pass: 'ASCENDING (Relative Orbit 092)',
    bbox: [79.5, 12.0, 82.0, 14.5],
    imageSvgType: 'chokepoint_vessels',
  },
];

// Helper to render high-contrast SAR radar imagery texture
const SarRadarVisual: React.FC<{ type: SarObservation['imageSvgType']; isFeatured?: boolean }> = ({
  type,
  isFeatured = false,
}) => {
  return (
    <div className="relative w-full h-full bg-[#05070D] overflow-hidden">
      {/* Synthetic Aperture Radar Grayscale Backscatter Layer */}
      <svg
        className="w-full h-full object-cover select-none"
        preserveAspectRatio="none"
        viewBox="0 0 600 400"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id={`sar-noise-${type}`}>
            <feTurbulence
              type="fractalNoise"
              baseFrequency={type === 'coastal_corridor' ? '0.04 0.09' : '0.05 0.05'}
              numOctaves="4"
              result="noise"
            />
            <feColorMatrix
              type="matrix"
              values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 1 0"
            />
          </filter>
          <radialGradient id="sar-vignette" cx="50%" cy="50%" r="50%">
            <stop offset="60%" stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor="#05070D" stopOpacity="0.75" />
          </radialGradient>
        </defs>

        {/* Base SAR backscatter background */}
        <rect width="100%" height="100%" fill="#0a0f1d" />
        <rect width="100%" height="100%" filter={`url(#sar-noise-${type})`} opacity="0.55" />

        {type === 'open_water_slick' && (
          <g>
            {/* Dark Low-Backscatter Hydrocarbon Anomaly (Oil Damping) */}
            <path
              d="M 160 140 C 210 120, 290 150, 360 190 C 420 220, 470 260, 430 290 C 370 330, 260 300, 200 270 C 150 240, 120 170, 160 140 Z"
              fill="#030408"
              opacity="0.92"
              filter="blur(3px)"
            />
            <path
              d="M 230 180 C 270 170, 320 200, 350 240 C 320 270, 260 260, 230 220 Z"
              fill="#010204"
              opacity="0.95"
              filter="blur(1px)"
            />
            {/* Bright Vessel Hard-Target Scatter Reflections */}
            <circle cx="480" cy="110" r="3.5" fill="#FFFFFF" />
            <circle cx="480" cy="110" r="8" fill="none" stroke="#00F0FF" strokeWidth="0.75" opacity="0.6" />
            <circle cx="120" cy="310" r="2.5" fill="#E2E8F0" />
          </g>
        )}

        {type === 'coastal_corridor' && (
          <g>
            {/* Coastal Landmass High Backscatter */}
            <path
              d="M 460 0 L 440 120 C 430 180, 450 260, 480 400 L 600 400 L 600 0 Z"
              fill="#1e293b"
              opacity="0.85"
            />
            <path
              d="M 445 0 L 428 120 C 418 180, 438 260, 465 400"
              stroke="#06b6d4"
              strokeWidth="1"
              fill="none"
              strokeDasharray="2, 4"
              opacity="0.5"
            />
            {/* Nearshore Anchorages High Reflectivity Points */}
            <circle cx="380" cy="150" r="3" fill="#FFF" />
            <circle cx="360" cy="200" r="3" fill="#FFF" />
            <circle cx="395" cy="230" r="2.5" fill="#CBD5E1" />
          </g>
        )}

        {type === 'chokepoint_vessels' && (
          <g>
            {/* Shipping Lane Density Hard Targets */}
            <line x1="80" y1="360" x2="520" y2="40" stroke="#06b6d4" strokeWidth="0.5" strokeDasharray="4, 12" opacity="0.3" />
            <circle cx="210" cy="260" r="3.5" fill="#FFF" />
            <circle cx="270" cy="220" r="3" fill="#FFF" />
            <circle cx="330" cy="170" r="4" fill="#FFF" />
            <circle cx="390" cy="130" r="3.5" fill="#FFF" />
            {/* Surface Texture Ripples */}
            <ellipse cx="250" cy="200" rx="140" ry="70" fill="none" stroke="#334155" strokeWidth="1" opacity="0.4" />
          </g>
        )}

        {/* SAR Grid Overlays */}
        <line x1="0" y1="200" x2="600" y2="200" stroke="#16263D" strokeWidth="0.75" strokeDasharray="3, 6" />
        <line x1="300" y1="0" x2="300" y2="400" stroke="#16263D" strokeWidth="0.75" strokeDasharray="3, 6" />

        {/* Vignette Shadow Frame */}
        <rect width="100%" height="100%" fill="url(#sar-vignette)" />
      </svg>

      {/* SAR Acquisition Overlay Reticle & Coordinates */}
      <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-[#070A10]/85 border border-cyan-500/30 text-[9px] font-mono text-cyan-300 backdrop-blur-sm">
        SAR IW · C-BAND
      </div>

      <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded bg-[#070A10]/85 border border-white/15 text-[9px] font-mono text-zinc-400 backdrop-blur-sm">
        SIGMA-0 VV
      </div>

      {/* Technical Corner Accents */}
      <div className="absolute bottom-2 left-2 w-2 h-2 border-b border-l border-cyan-400/60" />
      <div className="absolute bottom-2 right-2 w-2 h-2 border-b border-r border-cyan-400/60" />
    </div>
  );
};

export const SarObservationSection: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoRotating, setIsAutoRotating] = useState(true);

  // Auto-rotate every 6 seconds unless user manually interacts
  useEffect(() => {
    if (!isAutoRotating) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % REGIONAL_OBSERVATIONS.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isAutoRotating]);

  const featured = REGIONAL_OBSERVATIONS[activeIndex];

  return (
    <section id="satellite-proof" className="relative w-full bg-[#070A10] border-t border-white/10 py-20 px-6 sm:px-12 lg:px-16 select-none scroll-mt-16">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-10 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 uppercase tracking-widest mb-3">
              <Satellite className="w-4 h-4 text-cyan-400" />
              <span>RADAR SURVEILLANCE LAYER</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white uppercase leading-tight">
              SATELLITE OBSERVATION,<br />
              <span className="text-cyan-400">IN MOTION.</span>
            </h2>
            <p className="mt-4 text-sm sm:text-base text-zinc-300 font-light max-w-2xl leading-relaxed">
              AquaTrace connects to Sentinel-1 SAR acquisitions to monitor maritime regions and inspect newly available observations.
            </p>
          </div>

          {/* SAR Operational Status Strip */}
          <div className="flex flex-wrap items-center gap-4 bg-[#0A0E17] border border-white/10 px-4 py-3 rounded-lg font-mono text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
              </span>
              <span className="text-zinc-300">SENTINEL-1 DATA LINK:</span>
              <span className="font-bold text-cyan-400">CONNECTED</span>
            </div>

            <span className="text-zinc-700 hidden sm:inline">|</span>

            <div className="flex items-center gap-1.5">
              <span className="text-zinc-400">LATEST AVAILABLE ACQUISITIONS:</span>
              <span className="font-bold text-white">3 REGIONS</span>
            </div>
          </div>
        </div>

        {/* Region Selector Tabs (Manual Inspection) */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            {REGIONAL_OBSERVATIONS.map((obs, idx) => {
              const isActive = idx === activeIndex;
              return (
                <button
                  key={obs.id}
                  onClick={() => {
                    setActiveIndex(idx);
                    setIsAutoRotating(false); // pause rotation on manual click
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-cyan-500/15 border-cyan-400/60 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.15)] font-semibold'
                      : 'bg-white/5 border-white/10 text-zinc-400 hover:text-zinc-200 hover:bg-white/10'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isActive ? 'bg-cyan-400 animate-pulse' : 'bg-zinc-600'
                    }`}
                  />
                  <span>{obs.region}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setIsAutoRotating(!isAutoRotating)}
            className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
            title={isAutoRotating ? 'Pause rotating feed' : 'Resume auto rotation'}
          >
            <RefreshCw
              className={`w-3 h-3 ${isAutoRotating ? 'animate-spin text-cyan-400' : 'text-zinc-500'}`}
              style={{ animationDuration: '10s' }}
            />
            <span>FEED ROTATION: {isAutoRotating ? 'AUTO' : 'PAUSED'}</span>
          </button>
        </div>

        {/* Live SAR Visualization Grid: 1 Featured Large Panel + 2 Supporting Panels */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Featured Observation Panel (8 Cols) */}
          <div className="lg:col-span-8 flex flex-col bg-[#0A0E17] border border-cyan-500/30 rounded-xl overflow-hidden shadow-2xl relative group">
            {/* Header Strip */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-[#080C14] border-b border-white/10 text-xs font-mono">
              <div className="flex items-center gap-2.5">
                <span className="font-bold text-white tracking-wider">{featured.sensor}</span>
                <span className="text-zinc-600">/</span>
                <span className="text-cyan-400 font-semibold">{featured.region}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-[10px] text-cyan-300 font-bold uppercase tracking-wider">
                  REAL SATELLITE DATA
                </span>
              </div>
            </div>

            {/* Radar Canvas */}
            <div className="relative h-[340px] sm:h-[420px] w-full">
              <SarRadarVisual type={featured.imageSvgType} isFeatured={true} />

              {/* Direct Tactical Link to Operations */}
              <Link
                href="/operations"
                className="absolute bottom-4 right-4 flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#070A10]/90 hover:bg-cyan-500 text-zinc-200 hover:text-[#070A10] border border-cyan-500/40 hover:border-cyan-400 font-mono text-xs transition-all shadow-xl backdrop-blur-md cursor-pointer group/link font-semibold"
                title="Inspect this scene in Live Operations"
              >
                <span>INSPECT IN OPERATIONS</span>
                <ExternalLink className="w-3 h-3 group-hover/link:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            {/* Focused Technical Metadata Strip */}
            <div className="p-4 sm:p-5 bg-[#080C14] border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
              <div>
                <div className="text-[10px] text-zinc-500 uppercase">SUBREGION</div>
                <div className="text-zinc-200 font-semibold truncate mt-0.5">{featured.subregion}</div>
              </div>

              <div>
                <div className="text-[10px] text-zinc-500 uppercase">COORDINATES</div>
                <div className="text-cyan-400 font-semibold mt-0.5">{featured.coordinates}</div>
              </div>

              <div>
                <div className="text-[10px] text-zinc-500 uppercase">LATEST AVAILABLE</div>
                <div className="text-zinc-200 font-semibold mt-0.5">{featured.timestampUtc}</div>
              </div>

              <div>
                <div className="text-[10px] text-zinc-500 uppercase">POLARIZATION / MODE</div>
                <div className="text-zinc-200 font-semibold mt-0.5">
                  {featured.polarization} · {featured.mode.split(' ')[0]}
                </div>
              </div>
            </div>
          </div>

          {/* Secondary Observation Panels (4 Cols Stack) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {REGIONAL_OBSERVATIONS.filter((_, i) => i !== activeIndex).map((obs) => {
              const actualIdx = REGIONAL_OBSERVATIONS.findIndex((o) => o.id === obs.id);
              return (
                <div
                  key={obs.id}
                  onClick={() => {
                    setActiveIndex(actualIdx);
                    setIsAutoRotating(false);
                  }}
                  className="flex-1 bg-[#0A0E17] border border-white/10 hover:border-cyan-500/40 rounded-xl overflow-hidden flex flex-col transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between px-4 py-2.5 bg-[#080C14] border-b border-white/10 text-xs font-mono">
                    <span className="font-semibold text-zinc-300 group-hover:text-cyan-300 transition-colors">
                      {obs.region}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {obs.polarization}
                    </span>
                  </div>

                  <div className="relative h-36 w-full">
                    <SarRadarVisual type={obs.imageSvgType} />
                    <div className="absolute inset-0 bg-[#070A10]/15 group-hover:bg-transparent transition-colors" />
                  </div>

                  <div className="p-3 bg-[#080C14] border-t border-white/10 flex items-center justify-between text-[11px] font-mono">
                    <div>
                      <span className="text-zinc-500 text-[10px]">LATEST: </span>
                      <span className="text-zinc-300">{obs.timestampUtc.split(' ')[0]}</span>
                    </div>
                    <span className="text-cyan-400 group-hover:translate-x-0.5 transition-transform text-[10px]">
                      SELECT SCENE →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SarObservationSection;
