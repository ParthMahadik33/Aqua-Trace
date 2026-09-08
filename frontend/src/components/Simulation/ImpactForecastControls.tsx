'use client';

import React, { useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Layers,
  AlertTriangle,
  Waves,
  ShieldAlert,
  Fish,
  Users,
} from 'lucide-react';
import {
  ForecastState,
  FORECAST_MILESTONES,
  getForecastState,
} from '@/data/case0004ImpactForecast';

interface ImpactForecastControlsProps {
  forecastHours: number;
  onForecastHoursChange: (hours: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  layers: {
    coastalExposure: boolean;
    ecological: boolean;
    fisheries: boolean;
    population: boolean;
  };
  onToggleLayer: (layerKey: 'coastalExposure' | 'ecological' | 'fisheries' | 'population') => void;
}

export const ImpactForecastControls: React.FC<ImpactForecastControlsProps> = ({
  forecastHours,
  onForecastHoursChange,
  isPlaying,
  onTogglePlay,
  layers,
  onToggleLayer,
}) => {
  const state: ForecastState = getForecastState(forecastHours);

  // Auto-play interval progression
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      onForecastHoursChange(
        forecastHours >= 48 ? 0 : Math.min(48, forecastHours + 2)
      );
    }, 400);

    return () => clearInterval(interval);
  }, [isPlaying, forecastHours, onForecastHoursChange]);

  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden flex flex-col justify-between p-4">
      {/* Top spacer */}
      <div />

      {/* Lower map controls container */}
      <div className="flex flex-col gap-3">
        {/* 1. LOWER-LEFT COMPACT EXPOSURE LAYER CONTROLS */}
        <div className="pointer-events-auto max-w-sm w-full p-3.5 rounded-xl bg-[#080C14]/95 border border-white/15 backdrop-blur-md shadow-2xl font-mono text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div className="flex items-center gap-2 font-bold text-white text-[11px] tracking-wide">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>FORECAST EXPOSURE LAYERS</span>
            </div>
            {state.isShorelineCritical && (
              <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 text-[10px] font-bold border border-red-500/50 flex items-center gap-1 animate-pulse">
                <AlertTriangle className="w-3 h-3 text-red-400" />
                <span>BEACHING T+31h</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2.5 text-[10px]">
            {/* Layer 1: Coastal Exposure */}
            <button
              type="button"
              onClick={() => onToggleLayer('coastalExposure')}
              className={`px-2.5 py-2 rounded-lg border flex items-center justify-between transition-all cursor-pointer select-none text-left ${
                layers.coastalExposure
                  ? 'bg-yellow-500/20 border-yellow-400/70 text-yellow-200 font-bold shadow-[0_0_10px_rgba(234,179,8,0.15)]'
                  : 'bg-white/5 border-white/10 text-zinc-400 hover:text-zinc-200 hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate mr-1">
                <Waves className="w-3 h-3 text-yellow-400 flex-shrink-0" />
                <span className="truncate">COASTAL</span>
              </div>
              <span
                className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                  layers.coastalExposure
                    ? 'bg-yellow-400/30 text-yellow-200'
                    : 'bg-white/10 text-zinc-500'
                }`}
              >
                {layers.coastalExposure ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* Layer 2: Ecological */}
            <button
              type="button"
              onClick={() => onToggleLayer('ecological')}
              className={`px-2.5 py-2 rounded-lg border flex items-center justify-between transition-all cursor-pointer select-none text-left ${
                layers.ecological
                  ? 'bg-emerald-500/20 border-emerald-400/70 text-emerald-200 font-bold shadow-[0_0_10px_rgba(16,185,129,0.15)]'
                  : 'bg-white/5 border-white/10 text-zinc-400 hover:text-zinc-200 hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate mr-1">
                <ShieldAlert className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                <span className="truncate">ECOLOGICAL</span>
              </div>
              <span
                className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                  layers.ecological
                    ? 'bg-emerald-400/30 text-emerald-200'
                    : 'bg-white/10 text-zinc-500'
                }`}
              >
                {layers.ecological ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* Layer 3: Fisheries */}
            <button
              type="button"
              onClick={() => onToggleLayer('fisheries')}
              className={`px-2.5 py-2 rounded-lg border flex items-center justify-between transition-all cursor-pointer select-none text-left ${
                layers.fisheries
                  ? 'bg-sky-500/20 border-sky-400/70 text-sky-200 font-bold shadow-[0_0_10px_rgba(56,189,248,0.15)]'
                  : 'bg-white/5 border-white/10 text-zinc-400 hover:text-zinc-200 hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate mr-1">
                <Fish className="w-3 h-3 text-sky-400 flex-shrink-0" />
                <span className="truncate">FISHERIES 4B</span>
              </div>
              <span
                className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                  layers.fisheries
                    ? 'bg-sky-400/30 text-sky-200'
                    : 'bg-white/10 text-zinc-500'
                }`}
              >
                {layers.fisheries ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* Layer 4: Population / Ports */}
            <button
              type="button"
              onClick={() => onToggleLayer('population')}
              className={`px-2.5 py-2 rounded-lg border flex items-center justify-between transition-all cursor-pointer select-none text-left ${
                layers.population
                  ? 'bg-purple-500/20 border-purple-400/70 text-purple-200 font-bold shadow-[0_0_10px_rgba(168,85,247,0.15)]'
                  : 'bg-white/5 border-white/10 text-zinc-400 hover:text-zinc-200 hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate mr-1">
                <Users className="w-3 h-3 text-purple-400 flex-shrink-0" />
                <span className="truncate">PORTS & HAB</span>
              </div>
              <span
                className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                  layers.population
                    ? 'bg-purple-400/30 text-purple-200'
                    : 'bg-white/10 text-zinc-500'
                }`}
              >
                {layers.population ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>
        </div>

        {/* 2. BOTTOM FORECAST TIMELINE / SCRUBBER BAR */}
        <div className="pointer-events-auto w-full max-w-2xl mx-auto px-4 py-3 rounded-xl bg-[#080C14]/95 border border-white/15 backdrop-blur-md shadow-2xl flex flex-col gap-2 font-mono text-xs">
          {/* Top Bar: Play controls + Live Readout */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {/* Play/Pause Button */}
              <button
                type="button"
                onClick={onTogglePlay}
                className="p-2 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 transition-all cursor-pointer"
                title={isPlaying ? 'Pause forecast simulation' : 'Play forward dispersion timeline'}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>

              {/* Reset to T0 */}
              <button
                type="button"
                onClick={() => onForecastHoursChange(0)}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer"
                title="Reset timeline to NOW (T0)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              {/* Time Indicator */}
              <div className="ml-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-white font-bold text-sm tracking-wider">
                    T + {state.hours.toFixed(0)}h
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    ({state.areaKm2.toFixed(1)} km²)
                  </span>
                </div>
                <div className="text-[9px] text-zinc-500">
                  DRIFT: {state.driftDistanceNm.toFixed(1)} nm
                </div>
              </div>
            </div>

            {/* Dynamic Shoreline & Status Indicator */}
            <div className="text-right">
              {state.isShorelineCritical ? (
                <div className="flex items-center gap-1 text-red-400 font-bold text-[11px] justify-end">
                  <AlertTriangle className="w-3 h-3 text-red-400 inline" />
                  <span>SHORELINE IMPACT REACHED</span>
                </div>
              ) : (
                <div className="text-zinc-300 text-[11px] font-semibold">
                  TIME TO SHORE: {state.timeToShorelineHours}h
                </div>
              )}
              <div className="text-[9px] text-zinc-500 truncate max-w-[220px]">
                {state.statusText}
              </div>
            </div>
          </div>

          {/* Range Slider Container with generous clickable area */}
          <div className="w-full py-1.5 flex flex-col gap-1.5">
            <input
              type="range"
              min="0"
              max="48"
              step="1"
              value={forecastHours}
              onChange={(e) => onForecastHoursChange(parseFloat(e.target.value))}
              aria-label="Forecast timeline scrubber (0 to 48 hours)"
              className="w-full h-2.5 rounded-lg appearance-none cursor-pointer accent-cyan-400 bg-zinc-800"
              style={{
                background: `linear-gradient(to right, #00F0FF 0%, #00F0FF ${
                  (forecastHours / 48) * 100
                }%, #27272A ${(forecastHours / 48) * 100}%, #27272A 100%)`,
              }}
            />

            {/* Milestone Buttons: Clickable labels that jump to exact milestone */}
            <div className="flex justify-between items-center text-[10px] text-zinc-400 pt-0.5 select-none">
              {FORECAST_MILESTONES.map((m) => {
                const isSelected = Math.abs(forecastHours - m.hours) <= 1;
                return (
                  <button
                    key={m.hours}
                    type="button"
                    onClick={() => onForecastHoursChange(m.hours)}
                    className={`transition-colors cursor-pointer text-left hover:text-white ${
                      isSelected
                        ? m.isCritical
                          ? 'text-red-400 font-bold'
                          : 'text-cyan-300 font-bold'
                        : m.isCritical
                        ? 'text-red-400/70'
                        : 'text-zinc-500'
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImpactForecastControls;
