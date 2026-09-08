'use client';

import React, { useState } from 'react';
import {
  Play,
  RotateCcw,
  Layers,
  Activity,
  CheckCircle2,
  ChevronRight,
  Maximize2,
  Sliders,
} from 'lucide-react';
import { SarVisualStage, SarMetadata } from '@/types/simulation';

interface SarVisualProcessingViewProps {
  stages: SarVisualStage[];
  sarMetadata: SarMetadata;
  activeOverlayMode: 'none' | 'vv' | 'composite' | 'mask' | 'overlay';
  onChangeOverlayMode: (mode: 'none' | 'vv' | 'composite' | 'mask' | 'overlay') => void;
  overlayOpacity: number;
  onChangeOverlayOpacity: (opacity: number) => void;
}

export const SarVisualProcessingView: React.FC<SarVisualProcessingViewProps> = ({
  stages,
  sarMetadata,
  activeOverlayMode,
  onChangeOverlayMode,
  overlayOpacity,
  onChangeOverlayOpacity,
}) => {
  const [activeStageIndex, setActiveStageIndex] = useState(3); // Default to composite
  const currentStage = stages[activeStageIndex] || stages[0];

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Visual Pipeline Progression Stepper */}
      <div className="p-3.5 rounded-xl bg-[#0C121E] border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" />
            <span className="font-bold text-white tracking-wide">
              SAR Visual Processing Progression
            </span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded border border-purple-500/40 bg-purple-500/10 text-purple-300 font-bold">
            PROTOTYPE MODEL
          </span>
        </div>

        {/* Stepper Buttons */}
        <div className="grid grid-cols-6 gap-1 text-center">
          {stages.map((stage, idx) => {
            const isActive = idx === activeStageIndex;
            return (
              <button
                key={stage.id}
                onClick={() => {
                  setActiveStageIndex(idx);
                  if (stage.id === 'raw_sar' || stage.id === 'vv_polarization') onChangeOverlayMode('vv');
                  else if (stage.id === 'vh_polarization' || stage.id === 'vv_vh_composite') onChangeOverlayMode('composite');
                  else if (stage.id === 'diagnostic_panel') onChangeOverlayMode('composite');
                  else if (stage.id === 'slick_segmentation') onChangeOverlayMode('overlay');
                }}
                className={`py-2 px-1 rounded-lg border text-center transition-all cursor-pointer ${
                  isActive
                    ? 'bg-purple-500/20 border-purple-400 text-white shadow-md ring-1 ring-purple-400/40'
                    : 'bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10'
                }`}
              >
                <div className="text-[9px] font-bold">{stage.shortCode}</div>
                <div className="text-[8px] text-zinc-500 truncate mt-0.5">Stage {idx + 1}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Feature Display: Image Preview with Metadata Alongside */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Left: High-Res Image Preview */}
        <div className="relative rounded-xl overflow-hidden border border-white/15 bg-black group shadow-xl">
          <img
            src={currentStage.previewUrl}
            alt={currentStage.name}
            className="w-full h-52 object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3">
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>{currentStage.name}</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded border bg-purple-500/20 text-purple-300 border-purple-500/40">
                  {currentStage.statusTag}
                </span>
              </div>
              <div className="text-[10px] text-zinc-300 font-sans mt-0.5">
                {currentStage.description}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Sentinel-1 Telemetry Table */}
        <div className="p-3.5 rounded-xl bg-[#0E1524] border border-white/10 space-y-2 flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider mb-1.5">
              Verified Copernicus Sensor Metadata
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              <div>
                <span className="text-zinc-500">Platform:</span>{' '}
                <span className="text-white font-bold">{sarMetadata.platform}</span>
              </div>
              <div>
                <span className="text-zinc-500">Sensor Mode:</span>{' '}
                <span className="text-white font-bold">{sarMetadata.sensorMode}</span>
              </div>
              <div>
                <span className="text-zinc-500">Product:</span>{' '}
                <span className="text-white font-bold">GRDH (10m)</span>
              </div>
              <div>
                <span className="text-zinc-500">Polarizations:</span>{' '}
                <span className="text-amber-300 font-bold">VV + VH</span>
              </div>
              <div>
                <span className="text-zinc-500">Orbit #:</span>{' '}
                <span className="text-white font-bold">#{sarMetadata.orbitNumber}</span>
              </div>
              <div>
                <span className="text-zinc-500">Pass Direction:</span>{' '}
                <span className="text-white font-bold">{sarMetadata.passDirection}</span>
              </div>
              <div className="col-span-2">
                <span className="text-zinc-500">Acquisition Time:</span>{' '}
                <span className="text-emerald-400 font-bold">{sarMetadata.acquisitionTimestamp}</span>
              </div>
              <div className="col-span-2">
                <span className="text-zinc-500">CRS Coordinate System:</span>{' '}
                <span className="text-zinc-300 font-bold">EPSG:4326 (WGS 84)</span>
              </div>
            </div>
          </div>

          {/* Radiometric Damping Summary */}
          <div className="p-2 rounded-lg bg-black/40 border border-white/5 space-y-0.5 text-[10px]">
            <div className="text-zinc-400 font-semibold">Dual-Pol Damping Contrast:</div>
            <div className="flex justify-between text-zinc-300">
              <span>VV Delta: <strong className="text-cyan-300">+{sarMetadata.contrastDamping.vvDampingDb} dB</strong></span>
              <span>VH Delta: <strong className="text-amber-300">+{sarMetadata.contrastDamping.vhDampingDb} dB</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Map Raster Overlay Opacity Control */}
      <div className="p-3 rounded-xl bg-[#0C121E] border border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-purple-400" />
          <span className="font-bold text-zinc-200">Map Raster Projection:</span>
          <span className="text-amber-300 uppercase font-bold">
            {activeOverlayMode === 'none' ? 'OFF (Vectors Only)' : activeOverlayMode.toUpperCase()}
          </span>
        </div>

        <div className="flex items-center gap-3 w-48">
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            value={overlayOpacity}
            onChange={(e) => onChangeOverlayOpacity(parseFloat(e.target.value))}
            className="w-full accent-purple-400 cursor-pointer h-1.5 bg-zinc-700 rounded-lg"
          />
          <span className="text-[10px] text-zinc-400 w-8">
            {Math.round(overlayOpacity * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default SarVisualProcessingView;
