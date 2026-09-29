'use client';

import React, { useEffect, useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Clock,
  Activity,
  Layers,
  Calendar,
} from 'lucide-react';
import {
  CounterfactualSimulationFrame,
  CounterfactualCase,
} from '@/types/counterfactualWorkstation';

interface CounterfactualTimelineProps {
  frames: CounterfactualSimulationFrame[];
  activeFrameIndex: number;
  onSelectFrameIndex: (index: number | ((prev: number) => number)) => void;
  currentCase: CounterfactualCase;
  theme: 'light' | 'dark';
}

export const CounterfactualTimeline: React.FC<CounterfactualTimelineProps> = ({
  frames,
  activeFrameIndex,
  onSelectFrameIndex,
  currentCase,
  theme,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  // Playback timer
  useEffect(() => {
    if (!isPlaying || frames.length <= 1) return;

    const interval = setInterval(() => {
      onSelectFrameIndex((prevIndex: number) => {
        if (prevIndex >= frames.length - 1) {
          setIsPlaying(false);
          return frames.length - 1;
        }
        return prevIndex + 1;
      });
    }, 450); // ~2.2 fps clean physical step progression

    return () => clearInterval(interval);
  }, [isPlaying, frames.length, onSelectFrameIndex]);

  const activeFrame = frames[activeFrameIndex] || frames[frames.length - 1] || null;
  const isLight = theme === 'light';

  // Base timestamps
  const releaseTimeUtc = currentCase.source_corridor.estimated_release_window.nominal_utc;
  const sarObsTimeUtc = currentCase.sar_observation.acquisition_time_utc;

  // Calculate current timestamp
  let currentTimestampDisplay = releaseTimeUtc;
  if (activeFrame && releaseTimeUtc) {
    try {
      const baseDate = new Date(releaseTimeUtc);
      const activeDate = new Date(baseDate.getTime() + activeFrame.time_hours * 3600 * 1000);
      currentTimestampDisplay = activeDate.toISOString().replace('.000Z', 'Z').replace('T', ' ');
    } catch {
      currentTimestampDisplay = releaseTimeUtc;
    }
  }

  const handlePlayToggle = () => {
    if (activeFrameIndex >= frames.length - 1) {
      onSelectFrameIndex(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleStepBack = () => {
    setIsPlaying(false);
    onSelectFrameIndex(Math.max(0, activeFrameIndex - 1));
  };

  const handleStepForward = () => {
    setIsPlaying(false);
    onSelectFrameIndex(Math.min(frames.length - 1, activeFrameIndex + 1));
  };

  return (
    <div
      className={`h-16 border-t px-4 flex items-center justify-between select-none z-10 transition-colors duration-150 ${
        isLight
          ? 'bg-white/95 border-slate-200 text-slate-800'
          : 'bg-[#0B111B]/95 border-slate-800 text-slate-200'
      }`}
    >
      {/* Left: Playback Controls */}
      <div className="flex items-center gap-2 pr-4 border-r border-slate-300 dark:border-slate-800">
        <button
          onClick={handleStepBack}
          disabled={activeFrameIndex <= 0}
          title="Step to previous simulation frame"
          className={`p-1.5 rounded border transition-colors cursor-pointer disabled:opacity-40 ${
            isLight
              ? 'bg-slate-50 hover:bg-slate-100 border-slate-300 text-slate-700'
              : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300'
          }`}
        >
          <SkipBack className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handlePlayToggle}
          title={isPlaying ? 'Pause frame playback' : 'Play particle advection sequence'}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-cyan-700 hover:bg-cyan-600 text-white font-mono text-xs font-bold transition-all shadow-sm cursor-pointer"
        >
          {isPlaying ? (
            <>
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>PAUSE</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{activeFrameIndex >= frames.length - 1 ? 'REPLAY' : 'PLAY'}</span>
            </>
          )}
        </button>

        <button
          onClick={handleStepForward}
          disabled={activeFrameIndex >= frames.length - 1}
          title="Step to next simulation frame"
          className={`p-1.5 rounded border transition-colors cursor-pointer disabled:opacity-40 ${
            isLight
              ? 'bg-slate-50 hover:bg-slate-100 border-slate-300 text-slate-700'
              : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300'
          }`}
        >
          <SkipForward className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Center: Draggable Scrubber Timeline */}
      <div className="flex-1 px-6 flex flex-col justify-center gap-1">
        <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
            <strong className="text-amber-600 dark:text-amber-400">RELEASE (T0)</strong>
            <span>{releaseTimeUtc.replace('T', ' ').slice(0, 16)} UTC</span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded font-mono font-bold ${
                isLight
                  ? 'bg-cyan-50 text-cyan-800 border border-cyan-300'
                  : 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/30'
              }`}
            >
              FRAME {activeFrameIndex + 1} / {Math.max(1, frames.length)}: {activeFrame?.time_label || 'T+0.0h'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
            <strong className="text-rose-600 dark:text-rose-400">SAR OBSERVATION</strong>
            <span>{sarObsTimeUtc.replace('T', ' ').slice(0, 16)} UTC</span>
          </div>
        </div>

        {/* Range Slider Track & Milestone Nodes */}
        <div className="relative flex flex-col gap-1">
          <input
            type="range"
            min="0"
            max={Math.max(0, frames.length - 1)}
            value={activeFrameIndex}
            onChange={(e) => {
              setIsPlaying(false);
              onSelectFrameIndex(parseInt(e.target.value, 10));
            }}
            className="w-full h-2 bg-slate-300 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />

          {/* Quick Clickable Milestone Chips */}
          {frames.length > 0 && (
            <div className="flex justify-between items-center px-1">
              {frames.map((f, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setIsPlaying(false);
                    onSelectFrameIndex(i);
                  }}
                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                    activeFrameIndex === i
                      ? 'bg-cyan-600 text-white font-bold shadow-sm'
                      : isLight
                      ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {f.time_label || `T+${f.time_hours.toFixed(1)}h`}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Active Frame Telemetry pill */}
      <div className="hidden md:flex items-center gap-4 pl-4 border-l border-slate-300 dark:border-slate-800 text-xs font-mono">
        <div className="text-right">
          <div className="flex items-center justify-end gap-1.5 text-slate-500 dark:text-slate-400 text-[10px]">
            <Clock className="w-3 h-3" />
            <span>TIMESTAMP (UTC)</span>
          </div>
          <div className="font-bold text-slate-800 dark:text-slate-200">
            {currentTimestampDisplay}
          </div>
        </div>

        <div className="text-right">
          <div className="flex items-center justify-end gap-1 text-slate-500 dark:text-slate-400 text-[10px]">
            <Layers className="w-3 h-3 text-cyan-500" />
            <span>PLUME FOOTPRINT</span>
          </div>
          <div className="font-bold text-cyan-600 dark:text-cyan-400">
            {activeFrame?.area_km2.toFixed(1) || '0.0'} km²
          </div>
        </div>
      </div>
    </div>
  );
};
