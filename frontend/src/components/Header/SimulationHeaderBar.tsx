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
import { ThemeToggle } from '@/components/Theme/ThemeToggle';

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
  incidentId?: string | null;
  zoneName?: string | null;
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
  incidentId,
  zoneName,
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-surface/95 border-b border-border z-[700] flex items-center justify-between px-4 sm:px-6 backdrop-blur-md text-foreground select-none transition-colors">
      {/* Left: Clean Brand & Console Title */}
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="flex items-center gap-2.5 group cursor-pointer"
          title="Return to Overview"
        >
          <div className="w-7 h-7 rounded bg-slate-900 dark:bg-slate-900 light:bg-slate-100 border border-slate-700 dark:border-slate-700 light:border-slate-300 flex items-center justify-center p-0.5 shadow-sm">
            <img src="/logo.png" alt="AquaTrace" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-bold text-foreground text-sm tracking-wider">
                AQUATRACE
              </span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-sky-600/15 text-sky-700 dark:text-sky-300 border border-sky-500/30 uppercase">
                INVESTIGATION CONSOLE
              </span>
            </div>
          </div>
        </Link>
      </div>

      {/* Center: Case Identification & Region */}
      <div className="hidden sm:flex items-center gap-2 font-mono text-xs text-muted-foreground">
        <span className="font-bold text-foreground tracking-wider">
          {incidentId ? incidentId : 'CASE 0004'}
        </span>
        <span>&middot;</span>
        <span>{zoneName ? zoneName : 'German Bight'}</span>
        <span>&middot;</span>
        <span className="px-2 py-0.5 rounded text-[10px] font-bold border border-border bg-panel text-foreground uppercase tracking-wider">
          {incidentId ? 'LIVE DERIVED' : 'CASE REPLAY'}
        </span>
      </div>

      {/* Right: Focused Operational Controls */}
      <div className="flex items-center gap-2 font-mono text-xs">
        {/* Step Navigation Controls */}
        <div className="flex items-center bg-panel border border-border rounded p-0.5">
          <button
            onClick={onPrevStep}
            disabled={currentStepIndex === 0}
            className="p-1 rounded hover:bg-surface disabled:opacity-25 disabled:hover:bg-transparent text-foreground transition-colors cursor-pointer"
            title="Previous Stage"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onTogglePlay}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
              isPlaying
                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40'
                : 'bg-sky-600 hover:bg-sky-500 text-white'
            }`}
            title={isPlaying ? 'Pause Auto-Run' : 'Auto-Run Complete Investigation'}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3 h-3 fill-current" />
                <span className="tracking-wider text-[11px]">PAUSE</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-current" />
                <span className="tracking-wider text-[11px]">AUTO-RUN</span>
              </>
            )}
          </button>

          <button
            onClick={onNextStep}
            disabled={currentStepIndex === totalSteps - 1}
            className="p-1 rounded hover:bg-surface disabled:opacity-25 disabled:hover:bg-transparent text-foreground transition-colors cursor-pointer"
            title="Next Stage"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Reset / Replay */}
        <button
          onClick={onReset}
          className="p-1.5 rounded bg-panel hover:bg-surface border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Replay from Stage 01"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* Evidence Graph Modal Trigger */}
        {onOpenEvidenceGraph && (
          <button
            onClick={onOpenEvidenceGraph}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded bg-panel hover:bg-surface border border-border text-foreground transition-colors cursor-pointer text-[11px] font-medium"
            title="View Analytical Evidence Chain"
          >
            <Share2 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>EVIDENCE</span>
          </button>
        )}

        {/* Official Dossier Modal Trigger */}
        <button
          onClick={onOpenReport}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded bg-panel hover:bg-surface border border-border text-foreground transition-colors cursor-pointer text-[11px] font-medium"
          title="View Official Investigation Dossier"
        >
          <FileText className="w-3.5 h-3.5 text-muted-foreground" />
          <span>DOSSIER</span>
        </button>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Secondary Outlined Action: Live Operations */}
        <Link
          href="/operations"
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-transparent hover:bg-panel border border-border text-muted-foreground hover:text-foreground transition-colors text-[11px] font-medium"
          title="Open Live Operations"
        >
          <span className="hidden sm:inline">LIVE OPS</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </header>
  );
};

export default SimulationHeaderBar;
