'use client';

import React from 'react';
import Link from 'next/link';
import {
  RotateCcw,
  Play,
  Pause,
  ChevronRight,
  ChevronLeft,
  Share2,
  FileText,
  ArrowUpRight,
} from 'lucide-react';
import { SimulationStepConfig } from '@/types/simulation';

interface SimulationHeaderBarProps {
  currentStep: SimulationStepConfig;
  currentStepIndex: number;
  totalSteps: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onPrevStep: () => void;
  onNextStep: () => void;
  onReset: () => void;
  onOpenReport: () => void;
  onOpenEvidenceGraph?: () => void;
}

export const SimulationHeaderBar: React.FC<SimulationHeaderBarProps> = ({
  currentStepIndex,
  totalSteps,
  isPlaying,
  onTogglePlay,
  onPrevStep,
  onNextStep,
  onReset,
  onOpenReport,
  onOpenEvidenceGraph,
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-[#070A10]/95 border-b border-white/10 z-[700] flex items-center justify-between px-4 sm:px-6 backdrop-blur-md text-zinc-200 select-none">
      {/* Left: Clean Brand & Mode Identity */}
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="flex items-center gap-2.5 group cursor-pointer"
          title="Return to AquaTrace Overview"
        >
          <div className="w-8 h-8 rounded-lg bg-cyan-950/40 border border-cyan-500/40 flex items-center justify-center shadow-lg shadow-cyan-500/10 group-hover:border-cyan-400 transition-colors overflow-hidden p-0.5">
            <img src="/logo.png" alt="AquaTrace" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-white text-sm sm:text-base tracking-wider group-hover:text-cyan-300 transition-colors">
                AQUATRACE
              </span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 tracking-wider uppercase font-semibold">
                INVESTIGATION
              </span>
            </div>
            <span className="text-[9px] font-mono text-zinc-400 tracking-wider hidden sm:inline">
              INCIDENT SIMULATION WORKSTATION
            </span>
          </div>
        </Link>
      </div>

      {/* Center: Case Identification & Historical Simulation Note */}
      <div className="flex items-center gap-2 sm:gap-3 font-mono text-xs">
        <div className="flex items-center gap-1.5 text-zinc-200">
          <span className="font-bold text-white tracking-wider">CASE 0004</span>
          <span className="text-zinc-600">·</span>
          <span className="text-zinc-300">German Bight</span>
          <span className="text-zinc-600 hidden md:inline">·</span>
          <span className="text-cyan-400 font-semibold hidden md:inline tracking-wider">
            SIMULATION MODE
          </span>
        </div>
      </div>

      {/* Right: Minimal Focused Controls */}
      <div className="flex items-center gap-2 font-mono text-xs">
        {/* Step Navigation Controls */}
        <div className="flex items-center bg-[#0C121E] border border-white/10 rounded-lg p-0.5">
          <button
            onClick={onPrevStep}
            disabled={currentStepIndex === 0}
            className="p-1 rounded hover:bg-white/10 disabled:opacity-25 disabled:hover:bg-transparent text-zinc-300 transition-colors cursor-pointer"
            title="Previous Stage [Left Arrow]"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={onTogglePlay}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
              isPlaying
                ? 'bg-amber-500/20 text-amber-300 border border-amber-400/50 shadow-sm'
                : 'bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-400/40 hover:border-cyan-400'
            }`}
            title={isPlaying ? 'Pause Auto-Run' : 'Auto-Run Complete Investigation Pipeline'}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span className="tracking-wider">PAUSE</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 text-cyan-400 fill-cyan-400" />
                <span className="tracking-wider">AUTO-RUN</span>
              </>
            )}
          </button>

          <button
            onClick={onNextStep}
            disabled={currentStepIndex === totalSteps - 1}
            className="p-1 rounded hover:bg-white/10 disabled:opacity-25 disabled:hover:bg-transparent text-zinc-300 transition-colors cursor-pointer"
            title="Next Stage [Right Arrow]"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Reset / Replay */}
        <button
          onClick={onReset}
          className="p-2 rounded-lg bg-[#0C121E] hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          title="Replay from Stage 01"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* Evidence Graph Modal Trigger */}
        {onOpenEvidenceGraph && (
          <button
            onClick={onOpenEvidenceGraph}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0C121E] hover:bg-cyan-500/10 border border-white/10 hover:border-cyan-500/40 text-zinc-300 hover:text-cyan-300 transition-colors cursor-pointer text-[11px]"
            title="View Evidence Graph"
          >
            <Share2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>EVIDENCE</span>
          </button>
        )}

        {/* Official Dossier Modal Trigger */}
        <button
          onClick={onOpenReport}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0C121E] hover:bg-white/10 border border-white/10 hover:border-white/20 text-zinc-200 hover:text-white transition-colors cursor-pointer text-[11px] font-semibold"
          title="View Complete Investigation Report Dossier"
        >
          <FileText className="w-3.5 h-3.5 text-zinc-400" />
          <span>DOSSIER</span>
        </button>

        {/* Exit to Operations */}
        <Link
          href="/operations"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white transition-colors text-[11px] font-medium"
          title="Close Simulation and Return to Live Operations"
        >
          <span className="hidden sm:inline">OPERATIONS</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </header>
  );
};

export default SimulationHeaderBar;
