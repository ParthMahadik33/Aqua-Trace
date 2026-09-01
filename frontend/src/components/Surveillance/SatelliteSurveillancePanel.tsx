'use client';

import React, { useState } from 'react';
import {
  Satellite,
  RefreshCw,
  X,
  Maximize2,
  Minimize2,
  Radio,
  Layers,
  Clock,
  Compass,
  Zap,
  Info,
  AlertTriangle,
  Copy,
  Check,
  Eye,
  Sliders,
  Crosshair,
  MapPin,
  Crop,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { UseSentinelSarReturn } from '@/hooks/useSentinelSar';

interface SatelliteSurveillancePanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeSectorName?: string;
  sarState: UseSentinelSarReturn;
  onFocusCoverage?: (bounds: [[number, number], [number, number]]) => void;
  onStartAoiSelect?: () => void;
}

type FilterPreset = 'normal' | 'high-contrast' | 'oceanic' | 'invert';

export const SatelliteSurveillancePanel: React.FC<SatelliteSurveillancePanelProps> = ({
  isOpen,
  onClose,
  activeSectorName = 'All India Coastline',
  sarState,
  onFocusCoverage,
  onStartAoiSelect,
}) => {
  const {
    imageUrl,
    metadata,
    imageHeaders,
    activeAoiBbox,
    processedBbox,
    leafletBounds,
    identifiedSector,
    formattedAcquisitionTime,
    isLoading,
    isImageLoading,
    coverageStatus,
    coverageMessage,
    error,
    lastUpdated,
    fetchSarImage,
    resetToDefaultCoverage,
    refetch,
  } = sarState;

  const [filterPreset, setFilterPreset] = useState<FilterPreset>('normal');
  const [isCopiedId, setIsCopiedId] = useState(false);
  const [isExpandedModal, setIsExpandedModal] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isOpen) return null;

  const handleCopyId = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopiedId(true);
    setTimeout(() => setIsCopiedId(false), 2000);
  };

  const getFilterStyle = (): React.CSSProperties => {
    switch (filterPreset) {
      case 'high-contrast':
        return { filter: 'contrast(1.6) brightness(1.1)' };
      case 'oceanic':
        return { filter: 'contrast(1.3) brightness(1.05) sepia(0.3) hue-rotate(170deg) saturate(1.8)' };
      case 'invert':
        return { filter: 'invert(1) contrast(1.2)' };
      default:
        return {};
    }
  };

  const handleFocusFootprint = () => {
    if (leafletBounds && onFocusCoverage) {
      onFocusCoverage(leafletBounds);
    }
  };

  const polarizationText = Array.isArray(metadata?.polarization)
    ? metadata.polarization.join(' + ')
    : metadata?.polarization || 'VV';

  const processedBboxStr = processedBbox
    ? `[${processedBbox.map((n) => n.toFixed(3)).join(', ')}]`
    : 'Pending geometry query...';

  const isAoiActive = Boolean(activeAoiBbox);

  return (
    <>
      {/* Main Tactical Satellite Surveillance Panel */}
      <div
        className={`fixed z-[550] transition-all duration-300 ease-out flex flex-col shadow-2xl backdrop-blur-2xl bg-[#080C14]/95 border border-cyan-500/30 rounded-2xl overflow-hidden ${
          isMinimized
            ? 'bottom-6 right-6 w-96 max-w-[calc(100vw-3rem)] h-16'
            : 'top-16 right-4 bottom-6 md:top-18 md:right-6 md:bottom-8 w-[95vw] md:w-[490px] lg:w-[530px]'
        }`}
        style={{
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(6, 182, 212, 0.12)',
        }}
      >
        {/* Tactical Corner HUD Accents */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-400 z-20 pointer-events-none" />
        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-400 z-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyan-400 z-20 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-400 z-20 pointer-events-none" />

        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#0c121e]/90 border-b border-cyan-500/20 select-none shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)]">
              <Satellite className="w-4 h-4 animate-pulse" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold font-mono tracking-wider text-cyan-300 uppercase">
                  COPERNICUS SENTINEL-1
                </h2>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-emerald-500/15 border border-emerald-500/40 text-emerald-400">
                  <Zap className="w-2.5 h-2.5" /> REAL SATELLITE DATA
                </span>
              </div>
              <p className="text-[10px] font-mono text-zinc-400 truncate max-w-[200px] md:max-w-[260px]">
                {isAoiActive ? 'CUSTOM AOI RECON' : 'LATEST SENTINEL-1 ACQUISITION'}
              </p>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-1">
            {onStartAoiSelect && (
              <button
                onClick={onStartAoiSelect}
                title="Select new Area of Interest (AOI) on map"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-300 hover:bg-amber-500/15 border border-transparent hover:border-amber-500/30 transition-all cursor-pointer"
              >
                <Crop className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => refetch()}
              disabled={isLoading || isImageLoading}
              title="Check for newer Copernicus Sentinel-1 acquisition"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-cyan-300 hover:bg-cyan-500/15 border border-transparent hover:border-cyan-500/30 transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading || isImageLoading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              title={isMinimized ? 'Expand panel' : 'Minimize panel'}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-cyan-300 hover:bg-cyan-500/15 border border-transparent hover:border-cyan-500/30 transition-all cursor-pointer"
            >
              {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onClose}
              title="Close panel"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/15 border border-transparent hover:border-red-500/30 transition-all cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Panel Content (Hidden if Minimized) */}
        {!isMinimized && (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3.5">
            {/* 1. Monitoring Region vs SAR Coverage Differentiation Banner */}
            <div className="p-2.5 rounded-xl bg-[#0b111e] border border-cyan-500/20 text-xs font-mono space-y-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-zinc-400 uppercase tracking-wide">MONITORING REGION:</span>
                <span className="font-bold text-white bg-white/5 px-2 py-0.5 rounded border border-white/10">
                  {activeSectorName}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] pt-1 border-t border-white/5">
                <span className="text-cyan-400 uppercase tracking-wide flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-cyan-400" /> CURRENT SAR COVERAGE:
                </span>
                <span className="font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">
                  {identifiedSector.name}
                </span>
              </div>
            </div>

            {/* 2. Custom AOI Banner & Quick Action (If AOI is selected) */}
            {isAoiActive && (
              <div className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-500/30 text-xs font-mono space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-amber-300 font-bold text-[10px] uppercase tracking-wider">
                    <Crop className="w-3.5 h-3.5 text-amber-400" /> SELECTED AREA OF INTEREST (AOI)
                  </div>
                  <button
                    onClick={resetToDefaultCoverage}
                    className="flex items-center gap-1 text-[9px] text-zinc-400 hover:text-amber-200 transition-colors cursor-pointer"
                    title="Reset to default monitoring sector"
                  >
                    <RotateCcw className="w-2.5 h-2.5" /> RESET DEFAULT
                  </button>
                </div>
                <div className="text-[10px] text-amber-200/90 font-mono bg-black/40 p-1.5 rounded border border-amber-500/20">
                  WGS84: [{activeAoiBbox?.join(', ')}]
                </div>
              </div>
            )}

            {/* 3. Coverage Checking State or No Coverage Alert */}
            {coverageStatus === 'CHECKING' && (
              <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/30 flex items-center gap-2.5 text-xs font-mono text-cyan-300">
                <RefreshCw className="w-4 h-4 animate-spin text-cyan-400 shrink-0" />
                <span>{coverageMessage || 'Checking Copernicus Sentinel-1 coverage...'}</span>
              </div>
            )}

            {coverageStatus === 'NO_COVERAGE' && (
              <div className="p-3 rounded-xl bg-red-950/25 border border-red-500/40 text-xs font-mono space-y-2">
                <div className="flex items-center gap-2 text-red-300 font-bold text-[11px]">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  NO SAR COVERAGE OVER SELECTED AOI
                </div>
                <p className="text-[10px] text-zinc-300 leading-relaxed">
                  {coverageMessage ||
                    'The selected area does not overlap with any available Sentinel-1 SAR acquisition in the observation window. Please select an area closer to major maritime corridors (e.g. Malacca Strait, Mumbai, Chennai).'}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  {onStartAoiSelect && (
                    <button
                      onClick={onStartAoiSelect}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 hover:bg-amber-500/30 text-amber-200 text-[10px] flex items-center gap-1 transition-all cursor-pointer font-bold"
                    >
                      <Crop className="w-3 h-3" /> Draw New AOI
                    </button>
                  )}
                  <button
                    onClick={resetToDefaultCoverage}
                    className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-zinc-300 text-[10px] flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" /> Restore Default
                  </button>
                </div>
              </div>
            )}

            {/* 4. Radar Surveillance Display Viewport */}
            <div className="relative rounded-xl overflow-hidden bg-black border border-cyan-500/30 shadow-inner group">
              {/* Radar Reticle Grid Overlay */}
              <div
                className="absolute inset-0 pointer-events-none z-10 opacity-25"
                style={{
                  backgroundImage: `
                    radial-gradient(circle at center, rgba(6, 182, 212, 0.15) 0, transparent 70%),
                    linear-gradient(to right, rgba(6, 182, 212, 0.15) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(6, 182, 212, 0.15) 1px, transparent 1px)
                  `,
                  backgroundSize: '100% 100%, 32px 32px, 32px 32px',
                }}
              />

              {/* Crosshair Overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 opacity-40">
                <div className="w-12 h-12 border border-cyan-400/60 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-ping" />
                </div>
                <div className="absolute w-full h-[1px] bg-cyan-500/30" />
                <div className="absolute h-full w-[1px] bg-cyan-500/30" />
              </div>

              {/* Top Viewport HUD Overlay */}
              <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-20 pointer-events-none">
                <span className="px-2 py-0.5 rounded bg-black/75 border border-white/10 font-mono text-[9px] text-cyan-300 backdrop-blur-md">
                  BAND: VV / IW GRD
                </span>
                <span className="px-2 py-0.5 rounded bg-black/75 border border-white/10 font-mono text-[9px] text-emerald-300 backdrop-blur-md">
                  {isAoiActive ? 'AOI INTERSECTION' : 'LATEST AVAILABLE SAR'}
                </span>
              </div>

              {/* Image Viewport Container */}
              <div className="relative w-full aspect-square max-h-[320px] flex items-center justify-center bg-[#05080E]">
                {isLoading || isImageLoading ? (
                  /* Loading Scanner State */
                  <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
                    <div className="relative w-16 h-16 flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
                      <div className="absolute inset-2 rounded-full border border-cyan-400/40 border-b-cyan-300 animate-spin [animation-direction:reverse]" />
                      <Satellite className="w-6 h-6 text-cyan-400 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-mono font-semibold text-cyan-300 tracking-wider">
                        {isImageLoading
                          ? 'PROCESSING 1024x1024 SAR BACKSCATTER...'
                          : 'CHECKING COPERNICUS SAR RECON...'}
                      </p>
                      <p className="text-[10px] font-mono text-zinc-400">
                        Sentinel Hub Process API &bull; Gamma0 Decibel Normalization
                      </p>
                    </div>
                  </div>
                ) : error ? (
                  /* Error State */
                  <div className="flex flex-col items-center justify-center gap-2.5 p-6 text-center bg-red-950/20">
                    <AlertTriangle className="w-8 h-8 text-red-400 animate-bounce" />
                    <div className="space-y-1">
                      <p className="text-xs font-mono font-bold text-red-300">
                        SURVEILLANCE ACQUISITION ERROR
                      </p>
                      <p className="text-[11px] font-mono text-zinc-300 max-w-[280px]">
                        {error}
                      </p>
                    </div>
                    <button
                      onClick={() => (isAoiActive && activeAoiBbox ? fetchSarImage(activeAoiBbox) : refetch())}
                      className="mt-2 px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/40 hover:bg-red-500/30 text-red-200 font-mono text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" /> Retry Acquisition
                    </button>
                  </div>
                ) : imageUrl ? (
                  /* Real Image Display */
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl}
                      alt="Sentinel-1 SAR Real Satellite Imagery"
                      style={getFilterStyle()}
                      className="w-full h-full object-cover select-none transition-all duration-300"
                    />

                    {/* Scanline Sweep FX */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/10 to-transparent pointer-events-none animate-scanline" />

                    {/* Action Overlay Buttons */}
                    <div className="absolute bottom-2.5 right-2.5 z-20 flex items-center gap-1.5">
                      {leafletBounds && onFocusCoverage && (
                        <button
                          onClick={handleFocusFootprint}
                          className="px-2.5 py-1 rounded-lg bg-black/80 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-mono text-[10px] flex items-center gap-1 backdrop-blur-md transition-all shadow-lg cursor-pointer"
                          title="Center and zoom map to Sentinel-1 SAR footprint"
                        >
                          <Crosshair className="w-3 h-3 text-cyan-400" /> Focus Footprint
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setIsExpandedModal(true);
                          handleFocusFootprint();
                        }}
                        className="px-2.5 py-1 rounded-lg bg-black/80 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-mono text-[10px] flex items-center gap-1 backdrop-blur-md transition-all shadow-lg cursor-pointer"
                        title="Full-screen high resolution SAR view"
                      >
                        <Eye className="w-3 h-3" /> Full View
                      </button>
                    </div>
                  </>
                ) : coverageStatus === 'AVAILABLE' ? (
                  /* Available Coverage but image not yet fetched for this AOI */
                  <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
                    <Satellite className="w-10 h-10 text-cyan-400 animate-pulse" />
                    <div className="space-y-1">
                      <p className="text-xs font-mono font-bold text-emerald-300">
                        SENTINEL-1 ACQUISITION CONFIRMED
                      </p>
                      <p className="text-[10px] font-mono text-zinc-400">
                        {metadata?.id ? `Scene: ${metadata.id.slice(0, 32)}...` : 'Ready for high-res SAR processing'}
                      </p>
                    </div>
                    <button
                      onClick={() => fetchSarImage(activeAoiBbox || undefined, 1024, 1024)}
                      className="mt-1 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-mono text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-500/30 transition-all cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> VIEW SAR IMAGE (1024x1024)
                    </button>
                  </div>
                ) : (
                  <div className="text-xs font-mono text-zinc-500">No SAR Imagery Loaded</div>
                )}
              </div>

              {/* Bottom Image Control Bar: Filters */}
              {imageUrl && !isLoading && !isImageLoading && !error && (
                <div className="flex items-center justify-between px-3 py-2 bg-[#0a0f1a] border-t border-white/10 text-[10px] font-mono">
                  <div className="flex items-center gap-1.5 text-zinc-400">
                    <Sliders className="w-3 h-3 text-cyan-400" />
                    <span>GAIN / FILTER:</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {(
                      [
                        { id: 'normal', label: 'Default' },
                        { id: 'high-contrast', label: 'Hi-Contrast' },
                        { id: 'oceanic', label: 'Oceanic' },
                        { id: 'invert', label: 'Invert' },
                      ] as const
                    ).map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => setFilterPreset(preset.id)}
                        className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                          filterPreset === preset.id
                            ? 'bg-cyan-500/25 border border-cyan-400/60 text-cyan-300 font-bold'
                            : 'bg-white/5 border border-transparent text-zinc-400 hover:text-white'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 5. ACTIVE SAR COVERAGE Section */}
            <div className="p-2.5 rounded-xl bg-[#0d1424]/90 border border-cyan-500/30 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-wider text-cyan-400 uppercase flex items-center gap-1.5">
                  <MapPin className="w-3 h-3" /> ACTIVE SAR COVERAGE
                </span>
                {leafletBounds && onFocusCoverage && (
                  <button
                    onClick={handleFocusFootprint}
                    className="flex items-center gap-1 text-[9px] text-cyan-300 hover:text-white bg-cyan-500/20 hover:bg-cyan-500/30 px-2 py-0.5 rounded border border-cyan-500/40 transition-colors cursor-pointer"
                  >
                    <Crosshair className="w-2.5 h-2.5" /> ZOOM TO FOOTPRINT
                  </button>
                )}
              </div>

              <div className="space-y-1">
                <div className="text-[11px] font-bold text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
                  {identifiedSector.name}
                </div>
                <div className="text-[10px] text-zinc-400">
                  Sector Extent: <strong className="text-zinc-200">{identifiedSector.coordinatesFormatted}</strong>
                </div>
                <div className="text-[9px] text-cyan-300/80 bg-black/40 p-1.5 rounded border border-white/5 font-mono">
                  WGS84 BBOX: {processedBboxStr}
                </div>
              </div>
            </div>

            {/* 6. Data Status & Acquisition Telematics */}
            <div className="p-2.5 rounded-xl bg-[#0d1424]/80 border border-white/10 space-y-1.5 text-xs font-mono">
              <div className="flex items-center justify-between text-[10px] text-zinc-400 uppercase">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-cyan-400" /> ACQUIRED
                </span>
                <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30 text-[9px]">
                  STATUS: LATEST AVAILABLE ACQUISITION
                </span>
              </div>
              <p className="text-xs font-bold text-cyan-300">
                {formattedAcquisitionTime}
              </p>
              {lastUpdated && (
                <p className="text-[9px] text-zinc-500">
                  Last Catalogue Sync: {lastUpdated.toLocaleTimeString()}
                </p>
              )}
            </div>

            {/* 7. Specifications Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              {/* Platform */}
              <div className="p-2.5 rounded-xl bg-[#0d1424]/80 border border-white/10 space-y-1">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wide flex items-center gap-1">
                  <Satellite className="w-3 h-3 text-cyan-400" /> Platform
                </span>
                <p className="font-bold text-white text-[11px] truncate">
                  {metadata?.platform?.toUpperCase() || 'SENTINEL-1'}
                </p>
                <p className="text-[9px] text-cyan-400/80">C-SAR Spaceborne Aperture</p>
              </div>

              {/* Instrument Mode */}
              <div className="p-2.5 rounded-xl bg-[#0d1424]/80 border border-white/10 space-y-1">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wide flex items-center gap-1">
                  <Layers className="w-3 h-3 text-emerald-400" /> Mode &amp; Type
                </span>
                <p className="font-bold text-white text-[11px]">
                  {metadata?.instrument_mode || 'IW'} ({metadata?.product_type || 'GRD'})
                </p>
                <p className="text-[9px] text-emerald-400/80">Interferometric Wide</p>
              </div>

              {/* Polarization */}
              <div className="p-2.5 rounded-xl bg-[#0d1424]/80 border border-white/10 space-y-1">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wide flex items-center gap-1">
                  <Radio className="w-3 h-3 text-yellow-400" /> Polarization
                </span>
                <p className="font-bold text-white text-[11px]">
                  {polarizationText}
                </p>
                <p className="text-[9px] text-yellow-400/80">Ocean Surface Backscatter</p>
              </div>

              {/* Orbit State */}
              <div className="p-2.5 rounded-xl bg-[#0d1424]/80 border border-white/10 space-y-1">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wide flex items-center gap-1">
                  <Compass className="w-3 h-3 text-purple-400" /> Orbit Direction
                </span>
                <p className="font-bold text-white text-[11px] capitalize">
                  {metadata?.orbit_direction || 'Ascending'}
                </p>
                <p className="text-[9px] text-purple-400/80">Polar Sun-Synchronous</p>
              </div>
            </div>

            {/* Product ID Dossier */}
            <div className="p-2.5 rounded-xl bg-[#0d1424]/80 border border-white/10 space-y-1 text-xs font-mono">
              <div className="flex items-center justify-between text-[10px] text-zinc-400">
                <span>COPERNICUS PRODUCT ID:</span>
                {metadata?.id && (
                  <button
                    onClick={() => handleCopyId(metadata.id)}
                    className="flex items-center gap-1 text-[9px] text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                  >
                    {isCopiedId ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                    {isCopiedId ? 'COPIED' : 'COPY'}
                  </button>
                )}
              </div>
              <p className="text-[10px] text-zinc-300 bg-black/40 p-1.5 rounded border border-white/5 break-all font-mono">
                {metadata?.id || 'Querying product catalogue...'}
              </p>
            </div>

            {/* Check Newer Acquisition Control */}
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => refetch()}
                disabled={isLoading || isImageLoading}
                className="w-full py-2 px-3 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 font-mono text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading || isImageLoading ? 'animate-spin' : ''}`} />
                <span>CHECK FOR NEWER ACQUISITION</span>
              </button>
            </div>

            {/* Tactical Explanation Info Note */}
            <div className="p-2.5 rounded-xl bg-cyan-950/20 border border-cyan-500/20 flex items-start gap-2 text-[10px] font-mono text-cyan-200/90 leading-relaxed">
              <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
              <p>
                Spaceborne Synthetic Aperture Radar (SAR) penetrates cloud cover and darkness via microwave pulses.
                Select any Area of Interest (AOI) to retrieve radar surveillance telemetry.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Expanded High-Resolution Modal View */}
      {isExpandedModal && imageUrl && (
        <div
          className="fixed inset-0 z-[600] flex items-center justify-center bg-black/85 backdrop-blur-xl p-4 md:p-8 animate-fadeIn"
          onClick={() => setIsExpandedModal(false)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[90vh] flex flex-col bg-[#080C14] border border-cyan-500/40 rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3 bg-[#0c121e] border-b border-cyan-500/30">
              <div className="flex items-center gap-2">
                <Satellite className="w-4 h-4 text-cyan-400 animate-pulse" />
                <h3 className="font-mono text-sm font-bold text-cyan-300 uppercase">
                  COPERNICUS SENTINEL-1 SAR APERTURE INSPECTOR &bull; {identifiedSector.name}
                </h3>
              </div>
              <button
                onClick={() => setIsExpandedModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Image Area */}
            <div className="relative flex-1 bg-black flex items-center justify-center overflow-auto p-4 max-h-[70vh]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="Full Sentinel-1 SAR View"
                style={getFilterStyle()}
                className="max-w-full max-h-[65vh] object-contain rounded border border-white/10 shadow-2xl"
              />
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-[#0c121e] border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-zinc-300">
              <div>
                <span>SCENE: </span>
                <strong className="text-white">{metadata?.id}</strong>
              </div>
              <div className="flex items-center gap-2">
                <span>{formattedAcquisitionTime}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
