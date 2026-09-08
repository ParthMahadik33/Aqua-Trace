'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Radio,
  Search,
  Crosshair,
  Compass,
  RotateCcw,
  WifiOff,
  X,
  ChevronDown,
  Check,
  Globe2,
  Anchor,
  Satellite,
  Crop,
} from 'lucide-react';


import { Vessel, ConnectionStatus, SHIP_CATEGORY_COLORS } from '@/types/vessel';

export interface SectorPresetOption {
  key: string;
  name: string;
  description: string;
  coordinates: string;
}

export const SECTOR_PRESETS: SectorPresetOption[] = [
  {
    key: 'ALL_INDIA',
    name: 'All India Coastline',
    description: 'Arabian Sea, Bay of Bengal, and Indian Peninsula',
    coordinates: '06°N–24°N / 68°E–90°E',
  },
  {
    key: 'MUMBAI_GUJARAT',
    name: 'Mumbai / Gujarat Corridor',
    description: 'JNPT, Mumbai Port, Gulf of Khambhat, Hazira',
    coordinates: '18°N–23.5°N / 68°E–74°E',
  },
  {
    key: 'CHENNAI_VIZAG',
    name: 'Chennai / Vizag Corridor',
    description: 'Chennai, Ennore, Kakinada, Visakhapatnam',
    coordinates: '12°N–18.5°N / 79.5°E–85°E',
  },
  {
    key: 'KANDLA_MUNDRA',
    name: 'Kandla / Mundra Corridor',
    description: 'Gulf of Kutch, Deendayal/Kandla & Mundra Ports',
    coordinates: '21.5°N–23.8°N / 68°E–71°E',
  },
  {
    key: 'STRAIT_OF_HORMUZ',
    name: 'Gulf / Strait of Hormuz',
    description: 'Persian Gulf & Gulf of Oman Strategic Energy Chokepoint',
    coordinates: '23.5°N–27.5°N / 54°E–59.5°E',
  },
  {
    key: 'MALACCA_STRAIT',
    name: 'Malacca Strait',
    description: 'Singapore & Malacca Major Global Shipping Lane',
    coordinates: '01°N–06°N / 99°E–104.5°E',
  },
];

interface HeaderBarProps {
  connectionStatus: ConnectionStatus;
  vessels: Vessel[];
  onSelectVessel: (vessel: Vessel) => void;
  onRecenterSector: () => void;
  lastUpdateTime: Date | null;
  activePresetKey: string;
  onChangeSector: (presetKey: string) => void;
  isSarPanelOpen?: boolean;
  onToggleSarPanel?: () => void;
  isSelectingAoi?: boolean;
  onToggleSelectAoi?: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  connectionStatus,
  vessels,
  onSelectVessel,
  onRecenterSector,
  lastUpdateTime,
  activePresetKey = 'ALL_INDIA',
  onChangeSector,
  isSarPanelOpen = false,
  onToggleSarPanel,
  isSelectingAoi = false,
  onToggleSelectAoi,
}) => {


  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSectorDropdownOpen, setIsSectorDropdownOpen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const sectorDropdownRef = useRef<HTMLDivElement>(null);

  // Close search and sector dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
      if (sectorDropdownRef.current && !sectorDropdownRef.current.contains(event.target as Node)) {
        setIsSectorDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredVessels = searchQuery.trim()
    ? vessels.filter(
        (v) =>
          v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.mmsi.includes(searchQuery) ||
          v.destination.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 8)
    : [];

  const handleSelectSearchResult = (v: Vessel) => {
    onSelectVessel(v);
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const currentSector =
    SECTOR_PRESETS.find((s) => s.key === activePresetKey.toUpperCase()) || SECTOR_PRESETS[0];

  const handleSelectSector = (presetKey: string) => {
    onChangeSector(presetKey);
    setIsSectorDropdownOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-[#080C14]/95 border-b border-white/10 z-[700] flex items-center justify-between px-4 backdrop-blur-md text-zinc-200">
      {/* Left: Branding & Dynamic Sector Dropdown */}
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2.5 group cursor-pointer" title="Return to AquaTrace Overview">
          <div className="w-8 h-8 rounded-lg bg-cyan-950/40 border border-cyan-500/40 flex items-center justify-center shadow-lg shadow-cyan-500/10 group-hover:border-cyan-400 transition-colors overflow-hidden p-0.5">
            <img src="/logo.png" alt="AquaTrace" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-white text-base tracking-wider group-hover:text-cyan-300 transition-colors">
                AQUATRACE
              </span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 tracking-widest uppercase">
                OPS-1
              </span>
            </div>
            <div className="text-[10px] font-mono text-zinc-400 tracking-wider">
              MARITIME DOMAIN AWARENESS // LIVE AIS
            </div>
          </div>
        </Link>

        {/* Tactical Navigation: LIVE OPERATIONS vs INCIDENT SIMULATION */}
        <nav className="flex items-center p-0.5 rounded-lg bg-[#0E1524] border border-white/10 font-mono text-xs shadow-inner">
          <Link
            href="/operations"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm font-semibold tracking-wider text-[11px]"
            title="Live Operational Feed: Real AIS Tracking & Sentinel-1 SAR Integration"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>LIVE OPERATIONS</span>
          </Link>
          <Link
            href="/simulation"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-zinc-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors font-medium tracking-wider text-[11px] group"
            title="Incident Simulation: Dedicated Case 0004 Prototype Investigation"
          >
            <div className="w-2 h-2 rounded-full bg-amber-400/60 group-hover:bg-amber-400 group-hover:shadow-[0_0_8px_rgba(245,158,11,0.8)] transition-all" />
            <span>INCIDENT SIMULATION</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              CASE 0004
            </span>
          </Link>
        </nav>

        {/* Sector Selector Dropdown */}
        <div className="relative hidden md:block" ref={sectorDropdownRef}>
          <button
            onClick={() => setIsSectorDropdownOpen(!isSectorDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-zinc-300 hover:text-white transition-all cursor-pointer shadow-sm"
          >
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold text-cyan-300">{currentSector.name}</span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${
                isSectorDropdownOpen ? 'rotate-180 text-cyan-400' : ''
              }`}
            />
          </button>

          {/* Dropdown Menu */}
          {isSectorDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-80 bg-[#0C121E] border border-white/15 rounded-xl shadow-2xl overflow-hidden z-[800] divide-y divide-white/5 font-sans animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3.5 py-2 bg-[#080C14] text-[10px] font-mono uppercase tracking-widest text-zinc-400 flex items-center justify-between">
                <span>Select Maritime Corridor</span>
                <Globe2 className="w-3 h-3 text-cyan-400" />
              </div>

              <div className="p-1.5 space-y-1">
                {SECTOR_PRESETS.map((preset) => {
                  const isSelected = preset.key === activePresetKey.toUpperCase();
                  return (
                    <button
                      key={preset.key}
                      onClick={() => handleSelectSector(preset.key)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-start justify-between group cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-500/15 border border-cyan-500/30 text-white'
                          : 'hover:bg-white/5 border border-transparent text-zinc-300'
                      }`}
                    >
                      <div className="flex-1 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-xs font-bold ${
                              isSelected ? 'text-cyan-300' : 'group-hover:text-white'
                            }`}
                          >
                            {preset.name}
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">
                          {preset.description}
                        </div>
                        <div className="text-[9px] font-mono text-zinc-500 mt-0.5">
                          {preset.coordinates}
                        </div>
                      </div>

                      {isSelected && (
                        <Check className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Center: Search Bar */}
      <div className="relative flex-1 max-w-md mx-4" ref={searchRef}>
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
            placeholder="Search vessel by Name, MMSI, or Port..."
            className="w-full bg-[#101726] border border-white/10 focus:border-cyan-500/60 rounded-lg pl-9 pr-8 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {isSearchOpen && filteredVessels.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#0C121E] border border-white/15 rounded-lg shadow-2xl overflow-hidden z-50 divide-y divide-white/5 font-sans">
            {filteredVessels.map((v) => {
              const colorInfo = SHIP_CATEGORY_COLORS[v.ship_type] || SHIP_CATEGORY_COLORS.Other;
              return (
                <button
                  key={v.mmsi}
                  onClick={() => handleSelectSearchResult(v)}
                  className="w-full px-3 py-2 text-left hover:bg-white/10 flex items-center justify-between transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: colorInfo.hex }}
                    ></span>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                        {v.name || `VESSEL [${v.mmsi}]`}
                      </div>
                      <div className="text-[10px] font-mono text-zinc-400">
                        MMSI: {v.mmsi} • {v.ship_type} • Dest: {v.destination || 'N/A'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right font-mono text-[11px] text-zinc-300">
                    <div>{v.sog.toFixed(1)} kn</div>
                    <div className="text-[10px] text-zinc-500">{Math.round(v.cog)}°</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Right: Controls & Connection Status */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Interactive AOI Bounding Box Selector Button */}
        {onToggleSelectAoi && (
          <button
            onClick={onToggleSelectAoi}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer border ${
              isSelectingAoi
                ? 'bg-amber-500/25 border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.4)] animate-pulse'
                : 'bg-white/5 hover:bg-cyan-500/15 border-white/10 hover:border-cyan-500/40 text-zinc-300 hover:text-cyan-300'
            }`}
            title="Click and drag on map to select an Area of Interest (AOI) for Sentinel-1 SAR analysis"
          >
            <Crop className={`w-3.5 h-3.5 ${isSelectingAoi ? 'text-amber-400 animate-spin' : 'text-cyan-400'}`} />
            <span className="hidden sm:inline">
              {isSelectingAoi ? 'DRAWING AOI...' : 'SELECT AREA'}
            </span>
          </button>
        )}

        {/* Satellite Surveillance Panel Toggle Button */}
        {onToggleSarPanel && (
          <button
            onClick={onToggleSarPanel}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer border ${
              isSarPanelOpen
                ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300 hover:text-white'
            }`}
            title="Toggle Copernicus Sentinel-1 SAR Satellite Surveillance"
          >
            <Satellite className={`w-3.5 h-3.5 ${isSarPanelOpen ? 'text-cyan-300 animate-pulse' : 'text-cyan-400'}`} />
            <span className="hidden sm:inline">SAR RECON</span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          </button>
        )}

        {/* Recenter Map Button */}
        <button
          onClick={onRecenterSector}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-mono text-zinc-300 hover:text-white transition-colors cursor-pointer"
          title="Recenter Map to Active Sector"
        >
          <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">SECTOR VIEW</span>
        </button>



        {/* Live Status Indicator Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0E1524] border border-white/10 font-mono text-xs">
          {connectionStatus === 'LIVE' && (
            <div className="flex items-center gap-2 text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-semibold tracking-wider text-[11px]">LIVE AIS</span>
            </div>
          )}

          {connectionStatus === 'RECONNECTING' && (
            <div className="flex items-center gap-2 text-amber-400">
              <RotateCcw className="w-3 h-3 animate-spin text-amber-400" />
              <span className="font-semibold tracking-wider text-[11px]">RECONNECTING</span>
            </div>
          )}

          {connectionStatus === 'CONNECTING' && (
            <div className="flex items-center gap-2 text-cyan-400">
              <Radio className="w-3 h-3 animate-pulse text-cyan-400" />
              <span className="font-semibold tracking-wider text-[11px]">SYNCING...</span>
            </div>
          )}

          {connectionStatus === 'OFFLINE' && (
            <div className="flex items-center gap-2 text-red-400">
              <WifiOff className="w-3 h-3 text-red-400" />
              <span className="font-semibold tracking-wider text-[11px]">OFFLINE</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default HeaderBar;
