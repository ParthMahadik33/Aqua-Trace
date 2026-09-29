'use client';

import React from 'react';
import {
  Play,
  RotateCcw,
  Sun,
  Moon,
  ShieldCheck,
  Compass,
  FileText,
  AlertTriangle,
  ChevronDown,
  Navigation,
  Crosshair,
  ExternalLink,
} from 'lucide-react';
import {
  CounterfactualCase,
  CandidateVesselRecord,
  ExperimentState,
  ExperimentPhase,
} from '@/types/counterfactualWorkstation';

interface CounterfactualHeaderProps {
  cases: Record<string, CounterfactualCase>;
  selectedCaseId: string;
  onSelectCase: (caseId: string) => void;
  selectedCandidate: CandidateVesselRecord | null;
  onSelectCandidate: (candidate: CandidateVesselRecord) => void;
  isRunning: boolean;
  experimentState: ExperimentState;
  currentPhase: ExperimentPhase;
  onRunCounterfactual: () => void;
  onResetView: () => void;
  onFitEvidence: () => void;
  onTestDecoy: () => void;
  onOpenDossier: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const CounterfactualHeader: React.FC<CounterfactualHeaderProps> = ({
  cases,
  selectedCaseId,
  onSelectCase,
  selectedCandidate,
  onSelectCandidate,
  isRunning,
  experimentState,
  currentPhase,
  onRunCounterfactual,
  onResetView,
  onFitEvidence,
  onTestDecoy,
  onOpenDossier,
  theme,
  onToggleTheme,
}) => {
  const currentCase = cases[selectedCaseId] || cases['ENNORE_2017'];
  const candidates = currentCase?.candidates || [];
  const decoys = candidates.filter((c) => c.is_decoy);

  const isLight = theme === 'light';

  return (
    <header
      className={`h-14 border-b px-4 flex items-center justify-between select-none z-20 transition-colors duration-150 ${
        isLight
          ? 'bg-white/95 border-slate-200 text-slate-800'
          : 'bg-[#0B111B]/95 border-slate-800 text-slate-100'
      }`}
    >
      {/* Left: Brand + Case Selector */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 pr-3 border-r border-slate-300 dark:border-slate-800">
          <div className="w-7 h-7 rounded bg-slate-900 dark:bg-cyan-950/60 border border-slate-700 dark:border-cyan-500/40 flex items-center justify-center">
            <Compass className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs tracking-wider uppercase">AquaTrace</span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-semibold uppercase ${
                  isLight
                    ? 'bg-slate-100 text-slate-700 border border-slate-300'
                    : 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30'
                }`}
              >
                Scientific Workstation
              </span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              Counterfactual Source Hypothesis Testing
            </div>
          </div>
        </div>

        {/* Case Dropdown */}
        <div className="flex items-center gap-1.5">
          <label className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Case:
          </label>
          <div className="relative">
            <select
              value={selectedCaseId}
              onChange={(e) => onSelectCase(e.target.value)}
              className={`text-xs font-mono font-medium rounded-md px-2.5 py-1.5 pr-7 appearance-none border transition-colors cursor-pointer outline-none max-w-[240px] truncate ${
                isLight
                  ? 'bg-slate-50 border-slate-300 text-slate-800 hover:bg-slate-100 focus:border-slate-500'
                  : 'bg-[#121926] border-slate-700 text-slate-200 hover:bg-[#182234] focus:border-cyan-500/60'
              }`}
            >
              {Object.values(cases).map((c) => (
                <option key={c.case_id} value={c.case_id}>
                  {c.is_real_benchmark ? '★ ' : ''}
                  {c.title}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-2.5 pointer-events-none text-slate-400" />
          </div>
        </div>

        {/* Candidate Selector */}
        <div className="flex items-center gap-1.5 ml-1">
          <label className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Candidate:
          </label>
          <div className="relative">
            <select
              value={selectedCandidate?.id || ''}
              onChange={(e) => {
                const found = candidates.find((c) => c.id === e.target.value);
                if (found) onSelectCandidate(found);
              }}
              className={`text-xs font-mono font-medium rounded-md px-2.5 py-1.5 pr-7 appearance-none border transition-colors cursor-pointer outline-none max-w-[220px] truncate ${
                isLight
                  ? 'bg-slate-50 border-slate-300 text-slate-800 hover:bg-slate-100 focus:border-slate-500'
                  : 'bg-[#121926] border-slate-700 text-slate-200 hover:bg-[#182234] focus:border-cyan-500/60'
              }`}
            >
              {candidates.map((cand) => (
                <option key={cand.id} value={cand.id}>
                  {cand.is_decoy ? '[DECOY] ' : '● '}
                  {cand.name} (MMSI: {cand.mmsi})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-2.5 pointer-events-none text-slate-400" />
          </div>
        </div>

        {/* Data Provenance Badge */}
        <div className="hidden xl:flex items-center gap-1.5 ml-2">
          {selectedCaseId === 'DEMO_CASE_0004' || selectedCaseId === 'GERMAN_BIGHT_2024' ? (
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${
                isLight
                  ? 'bg-cyan-50 border-cyan-300 text-cyan-800'
                  : 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300'
              }`}
            >
              <ShieldCheck className="w-3 h-3 text-cyan-500" />
              <span>DEMO SCENARIO · COMPUTED PROTOTYPE RESULT</span>
            </span>
          ) : (
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded border flex items-center gap-1 ${
                currentCase.is_real_benchmark
                  ? isLight
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : isLight
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
              }`}
            >
              <ShieldCheck className="w-3 h-3" />
              <span>
                {currentCase.is_real_benchmark
                  ? 'REAL EO & METOCEAN (ENNORE 2017)'
                  : currentCase.environmental_forcing.source === 'REAL'
                  ? 'REAL SENTINEL-1 + CMEMS'
                  : 'PROTOTYPE REPLAY BASELINE'}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Right: Actions (Run, Decoy, Fit, Theme, Dossier) */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Quick Test Decoy button */}
        {decoys.length > 0 && (
          <button
            onClick={onTestDecoy}
            disabled={experimentState === 'RUNNING' || experimentState === 'COMPARING'}
            title="Switch immediately to a plausible decoy vessel to verify physical null separation"
            className={`flex items-center gap-1.5 text-xs font-mono px-2.5 py-1.5 rounded-md border transition-colors cursor-pointer disabled:opacity-50 ${
              selectedCandidate?.is_decoy
                ? isLight
                  ? 'bg-amber-100 border-amber-400 text-amber-900 font-bold'
                  : 'bg-amber-950/60 border-amber-500/60 text-amber-200 font-bold'
                : isLight
                ? 'bg-slate-50 hover:bg-slate-100 border-slate-300 text-slate-700'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>{selectedCandidate?.is_decoy ? 'DECOY ACTIVE' : 'TEST DECOY'}</span>
          </button>
        )}

        {/* Fit / Navigation buttons */}
        <div className="flex items-center rounded-md border overflow-hidden border-slate-300 dark:border-slate-700">
          <button
            onClick={onFitEvidence}
            title="Fit map extent to observed slick and release corridor"
            className={`p-1.5 text-xs font-mono transition-colors ${
              isLight
                ? 'bg-slate-50 hover:bg-slate-200 text-slate-700'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onResetView}
            title="Reset map view to default coordinates"
            className={`p-1.5 text-xs font-mono border-l transition-colors border-slate-300 dark:border-slate-700 ${
              isLight
                ? 'bg-slate-50 hover:bg-slate-200 text-slate-700'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 4-STATE RUN COUNTERFACTUAL BUTTON */}
        <button
          onClick={onRunCounterfactual}
          disabled={isRunning || experimentState === 'RUNNING' || experimentState === 'COMPARING'}
          className={`flex items-center gap-1.5 text-xs font-mono font-bold px-3 py-1.5 rounded-md shadow-sm transition-all cursor-pointer disabled:cursor-not-allowed ${
            experimentState === 'RUNNING'
              ? 'bg-amber-600 text-white animate-pulse'
              : experimentState === 'COMPARING'
              ? 'bg-cyan-600 text-white animate-pulse'
              : experimentState === 'COMPLETE'
              ? isLight
                ? 'bg-slate-800 hover:bg-slate-700 text-white'
                : 'bg-slate-700 hover:bg-slate-600 text-white'
              : 'bg-cyan-700 hover:bg-cyan-600 text-white'
          }`}
        >
          {experimentState === 'RUNNING' ? (
            <>
              <RotateCcw className="w-3.5 h-3.5 animate-spin" />
              <span>{`PHASE ${currentPhase}/8: ADVECTION...`}</span>
            </>
          ) : experimentState === 'COMPARING' ? (
            <>
              <RotateCcw className="w-3.5 h-3.5 animate-spin" />
              <span>COMPARING AGAINST SAR...</span>
            </>
          ) : experimentState === 'COMPLETE' ? (
            <>
              <RotateCcw className="w-3.5 h-3.5" />
              <span>RE-RUN COUNTERFACTUAL</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>RUN COUNTERFACTUAL</span>
            </>
          )}
        </button>

        {/* Dossier Modal Trigger */}
        <button
          onClick={onOpenDossier}
          title="Open printable scientific forensic dossier"
          className={`flex items-center gap-1 text-xs font-mono px-2.5 py-1.5 rounded-md border transition-colors cursor-pointer ${
            isLight
              ? 'bg-slate-50 hover:bg-slate-100 border-slate-300 text-slate-700'
              : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">DOSSIER</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          title={isLight ? 'Switch to dark theme' : 'Switch to light theme'}
          className={`p-1.5 rounded-md border transition-colors cursor-pointer ${
            isLight
              ? 'bg-slate-50 hover:bg-slate-100 border-slate-300 text-slate-600'
              : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-amber-400'
          }`}
        >
          {isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
