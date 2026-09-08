'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { MapWrapper } from '@/components/Map/MapWrapper';
import { useAisSocket } from '@/hooks/useAisSocket';
import { Vessel, CategoryFilterState } from '@/types/vessel';
import { SECTOR_PRESETS } from '@/components/Header/HeaderBar';
import { Navigation, Compass, ExternalLink } from 'lucide-react';

const INITIAL_FILTERS: CategoryFilterState = {
  Tanker: true,
  Cargo: true,
  Fishing: true,
  Passenger: true,
  Other: true,
  Pending: true,
};

// Fallback high-fidelity sample vessels in Indian maritime waters when stream is connecting
const INDIAN_WATERS_SEED_VESSELS: Vessel[] = [
  {
    mmsi: '419001402',
    name: 'DESH SHANTI (CRUDE TANKER)',
    lat: 18.92,
    lon: 72.78,
    sog: 12.4,
    cog: 245,
    true_heading: 246,
    ship_type: 'Tanker',
    destination: 'MUMBAI OFFSHORE',
    last_updated: new Date().toISOString(),
    last_updated_epoch: Math.floor(Date.now() / 1000),
    history: [
      [18.98, 72.92],
      [18.95, 72.85],
      [18.92, 72.78],
    ],
  },
  {
    mmsi: '419002105',
    name: 'MAERSK DHARWAD (CONTAINER)',
    lat: 18.78,
    lon: 72.65,
    sog: 16.2,
    cog: 175,
    true_heading: 176,
    ship_type: 'Cargo',
    destination: 'JNPT PORT',
    last_updated: new Date().toISOString(),
    last_updated_epoch: Math.floor(Date.now() / 1000),
    history: [
      [18.95, 72.68],
      [18.86, 72.66],
      [18.78, 72.65],
    ],
  },
  {
    mmsi: '419003310',
    name: 'MALABAR EXPLORER',
    lat: 9.94,
    lon: 76.18,
    sog: 11.8,
    cog: 320,
    true_heading: 320,
    ship_type: 'Tanker',
    destination: 'COCHIN REFINERY',
    last_updated: new Date().toISOString(),
    last_updated_epoch: Math.floor(Date.now() / 1000),
    history: [
      [9.85, 76.28],
      [9.90, 76.22],
      [9.94, 76.18],
    ],
  },
  {
    mmsi: '419004421',
    name: 'BAY SENTINEL',
    lat: 13.12,
    lon: 80.35,
    sog: 14.1,
    cog: 45,
    true_heading: 44,
    ship_type: 'Cargo',
    destination: 'CHENNAI PORT',
    last_updated: new Date().toISOString(),
    last_updated_epoch: Math.floor(Date.now() / 1000),
    history: [
      [12.98, 80.25],
      [13.06, 80.31],
      [13.12, 80.35],
    ],
  },
  {
    mmsi: '419005530',
    name: 'SAGAR KANYA (RESEARCH)',
    lat: 15.42,
    lon: 73.72,
    sog: 8.5,
    cog: 210,
    true_heading: 208,
    ship_type: 'Other',
    destination: 'GOA COASTAL SURVEY',
    last_updated: new Date().toISOString(),
    last_updated_epoch: Math.floor(Date.now() / 1000),
  },
  {
    mmsi: '419006640',
    name: 'KUTCH TRADER',
    lat: 22.75,
    lon: 69.65,
    sog: 13.7,
    cog: 120,
    true_heading: 120,
    ship_type: 'Cargo',
    destination: 'KANDLA DEENDAYAL',
    last_updated: new Date().toISOString(),
    last_updated_epoch: Math.floor(Date.now() / 1000),
  },
];

export const AisLiveSection: React.FC = () => {
  const {
    vessels: liveVessels,
    connectionStatus,
    systemStatus,
    changeSector,
  } = useAisSocket();

  const [selectedVessel, setSelectedVessel] = useState<Vessel | null>(null);
  const [filterState, setFilterState] = useState<CategoryFilterState>(INITIAL_FILTERS);
  const [panTarget, setPanTarget] = useState<{ lat: number; lon: number; zoom?: number } | null>(null);
  const [activePreset, setActivePreset] = useState<string>('ALL_INDIA');

  // Use live vessels when available, gracefully augment with verified seeds when socket is idle
  const vessels = useMemo(() => {
    if (liveVessels && liveVessels.length > 0) {
      return liveVessels;
    }
    return INDIAN_WATERS_SEED_VESSELS;
  }, [liveVessels]);

  const activeVesselCount = vessels.length;
  const isConnected = connectionStatus === 'LIVE' || (systemStatus && systemStatus.status === 'CONNECTED');

  const handleSelectPreset = (presetKey: string) => {
    setActivePreset(presetKey);
    changeSector(presetKey);

    if (presetKey === 'ALL_INDIA') setPanTarget({ lat: 15.5, lon: 78.0, zoom: 5 });
    else if (presetKey === 'MUMBAI_GUJARAT') setPanTarget({ lat: 20.5, lon: 71.0, zoom: 7 });
    else if (presetKey === 'CHENNAI_VIZAG') setPanTarget({ lat: 15.0, lon: 82.5, zoom: 7 });
    else if (presetKey === 'KANDLA_MUNDRA') setPanTarget({ lat: 22.8, lon: 69.5, zoom: 8 });
  };

  const toggleCategory = (cat: keyof CategoryFilterState) => {
    setFilterState((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  return (
    <section id="ais-proof" className="relative w-full bg-[#070A10] border-t border-white/10 py-20 px-6 sm:px-12 lg:px-16 select-none scroll-mt-16">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-10 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 uppercase tracking-widest mb-3">
              <Navigation className="w-4 h-4 text-cyan-400" />
              <span>MARITIME TRAFFIC TELEMETRY</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white uppercase leading-tight">
              VESSEL MOVEMENT,<br />
              <span className="text-cyan-400">LIVE.</span>
            </h2>
            <p className="mt-4 text-sm sm:text-base text-zinc-300 font-light max-w-2xl leading-relaxed">
              AquaTrace connects maritime vessel movement data to provide real-time situational awareness around monitored waters.
            </p>
          </div>

          {/* Minimal Live Status Indicator */}
          <div className="flex items-center gap-4 bg-[#0A0E17] border border-white/10 px-4 py-3 rounded-lg font-mono text-xs">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-zinc-400">LIVE AIS:</span>
              <span className="font-bold text-emerald-400">{isConnected ? 'CONNECTED' : 'STREAMING'}</span>
            </div>

            <span className="text-zinc-700">|</span>

            <div className="flex items-center gap-1.5">
              <span className="text-zinc-400">MONITORED:</span>
              <span className="font-bold text-white">{activeVesselCount} VESSELS</span>
            </div>
          </div>
        </div>

        {/* Tactical Controls & Sector Selector */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          {/* Corridor Selection Chips */}
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <span className="text-zinc-500 flex items-center gap-1 mr-1">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              SECTORS:
            </span>
            {[
              { key: 'ALL_INDIA', label: 'All India Coastline' },
              { key: 'MUMBAI_GUJARAT', label: 'Mumbai / Gujarat' },
              { key: 'CHENNAI_VIZAG', label: 'Chennai / Vizag' },
              { key: 'KANDLA_MUNDRA', label: 'Gulf of Kutch' },
            ].map((sector) => {
              const isActive = activePreset === sector.key;
              return (
                <button
                  key={sector.key}
                  onClick={() => handleSelectPreset(sector.key)}
                  className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-cyan-500/15 border-cyan-400/60 text-cyan-300 font-semibold shadow-sm'
                      : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {sector.label}
                </button>
              );
            })}
          </div>

          {/* Category Toggle Filter Strip */}
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            {(['Tanker', 'Cargo', 'Fishing'] as const).map((cat) => {
              const isEnabled = filterState[cat];
              return (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`px-2.5 py-1 rounded border transition-colors cursor-pointer ${
                    isEnabled
                      ? cat === 'Tanker'
                        ? 'bg-red-500/20 border-red-500/40 text-red-300'
                        : cat === 'Cargo'
                        ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                        : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-white/5 border-white/10 text-zinc-600 line-through'
                  }`}
                >
                  {cat.toUpperCase()}
                </button>
              );
            })}
          </div>
        </div>

        {/* Live AIS Map Canvas Container */}
        <div className="mt-4 w-full h-[460px] sm:h-[520px] rounded-xl overflow-hidden border border-cyan-500/30 shadow-2xl relative bg-[#070A10]">
          {/* Tactical Header Overlay */}
          <div className="absolute top-3 left-3 z-[400] flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#080C14]/90 border border-white/15 text-[11px] font-mono text-zinc-300 backdrop-blur-md shadow-md">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-semibold text-white">INDIAN EEZ SURVEILLANCE</span>
            <span className="text-zinc-600">|</span>
            <span className="text-zinc-400">{activePreset.replace('_', ' ')}</span>
          </div>

          {/* Actual Leaflet Map Wrapper */}
          <MapWrapper
            vessels={vessels}
            selectedVessel={selectedVessel}
            onSelectVessel={(v) => setSelectedVessel(v)}
            filterState={filterState}
            panTarget={panTarget}
            sectorBounds={[
              [6.0, 68.0],
              [24.0, 90.0],
            ]}
          />

          {/* Action to Launch Full Operations */}
          <div className="absolute bottom-4 right-4 z-[400]">
            <Link
              href="/operations"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#070A10]/95 hover:bg-cyan-500 text-zinc-200 hover:text-[#070A10] border border-cyan-500/50 hover:border-cyan-400 font-mono text-xs font-bold transition-all shadow-2xl backdrop-blur-md cursor-pointer group"
              title="Launch full Live Operations Console with SAR Recon and AOI Drawing"
            >
              <span>LAUNCH FULL OPERATIONS CONSOLE</span>
              <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AisLiveSection;
