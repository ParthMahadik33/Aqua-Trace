'use client';

import React, { useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  Waves,
  ShieldAlert,
  Fish,
  Users,
} from 'lucide-react';
import {
  ForecastState,
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

const TIMELINE_STEPS = [0, 12, 24, 31, 36, 48];

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
    <div className="absolute bottom-3.5 inset-x-4 pointer-events-none z-20 flex justify-center">
      <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-3 px-3.5 py-2 rounded bg-surface/95 border border-border shadow-md backdrop-blur-md font-mono text-xs max-w-4xl w-full text-foreground">
        {/* Left: Play/Pause & Live Readout */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onTogglePlay}
            className="p-1.5 rounded bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-700 dark:text-sky-300 transition-all cursor-pointer"
            title={isPlaying ? 'Pause forecast simulation' : 'Play forward dispersion timeline'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => onForecastHoursChange(0)}
            className="p-1.5 rounded hover:bg-panel text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Reset to T+0 (NOW)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-baseline gap-1.5 pl-1 border-l border-border/60">
            <span className="font-bold text-sm tracking-wider text-foreground">
              T+{state.hours.toFixed(0)}h
            </span>
            <span className="text-[10px] text-muted-foreground">
              ({state.areaKm2.toFixed(1)} km² · {state.driftDistanceNm.toFixed(1)} nm)
            </span>
          </div>
        </div>

        {/* Center: Timeline Step Buttons & Coastal Proximity Indicator */}
        <div className="flex items-center gap-1.5">
          {TIMELINE_STEPS.map((step) => {
            const isSelected = Math.abs(forecastHours - step) <= 1;
            const isStep31 = step === 31;
            return (
              <button
                key={step}
                type="button"
                onClick={() => onForecastHoursChange(step)}
                className={`px-2 py-1 rounded text-[10px] font-semibold border transition-all cursor-pointer ${
                  isSelected
                    ? isStep31
                      ? 'bg-amber-500/25 border-amber-500 text-amber-800 dark:text-amber-300 font-bold'
                      : 'bg-sky-600 text-white border-sky-500 font-bold shadow-sm'
                    : isStep31
                    ? 'bg-panel/80 hover:bg-panel border-amber-500/40 text-amber-700 dark:text-amber-400'
                    : 'bg-panel/80 hover:bg-panel border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                T+{step}
              </button>
            );
          })}

          {state.isShorelineCritical && (
            <span className="ml-1 px-2 py-0.5 rounded bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/40 text-[9px] font-bold flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              <span>COASTAL INTERACTION POTENTIAL</span>
            </span>
          )}
        </div>

        {/* Right: Inline Exposure Layer Toggle Pills */}
        <div className="flex items-center gap-1 pl-1 border-l border-border/60 text-[10px]">
          <button
            type="button"
            onClick={() => onToggleLayer('coastalExposure')}
            className={`px-2 py-1 rounded border flex items-center gap-1 transition-all cursor-pointer ${
              layers.coastalExposure
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-800 dark:text-amber-300 font-bold'
                : 'bg-panel border-border text-muted-foreground hover:text-foreground'
            }`}
            title="Toggle Coastal Exposure Layer"
          >
            <Waves className="w-3 h-3 text-amber-500" />
            <span>COASTAL</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleLayer('ecological')}
            className={`px-2 py-1 rounded border flex items-center gap-1 transition-all cursor-pointer ${
              layers.ecological
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-800 dark:text-emerald-300 font-bold'
                : 'bg-panel border-border text-muted-foreground hover:text-foreground'
            }`}
            title="Toggle Natura 2000 Ecological Layer"
          >
            <ShieldAlert className="w-3 h-3 text-emerald-500" />
            <span>ECOLOGICAL</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleLayer('fisheries')}
            className={`px-2 py-1 rounded border flex items-center gap-1 transition-all cursor-pointer ${
              layers.fisheries
                ? 'bg-sky-500/20 border-sky-500/50 text-sky-800 dark:text-sky-300 font-bold'
                : 'bg-panel border-border text-muted-foreground hover:text-foreground'
            }`}
            title="Toggle Demersal Fisheries Layer"
          >
            <Fish className="w-3 h-3 text-sky-500" />
            <span>FISHERIES</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleLayer('population')}
            className={`px-2 py-1 rounded border flex items-center gap-1 transition-all cursor-pointer ${
              layers.population
                ? 'bg-purple-500/20 border-purple-500/50 text-purple-800 dark:text-purple-300 font-bold'
                : 'bg-panel border-border text-muted-foreground hover:text-foreground'
            }`}
            title="Toggle Ports & Population Centers"
          >
            <Users className="w-3 h-3 text-purple-500" />
            <span>PORTS</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImpactForecastControls;
