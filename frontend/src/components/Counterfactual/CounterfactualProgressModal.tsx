'use client';

import React from 'react';
import {
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Database,
  Compass,
  Layers,
  Activity,
  BarChart2,
  FileCheck,
  ShieldAlert,
} from 'lucide-react';
import {
  CounterfactualProgressStep,
  CounterfactualProgressEvent,
} from '@/types/counterfactualWorkstation';

interface CounterfactualProgressModalProps {
  isOpen: boolean;
  currentEvent: CounterfactualProgressEvent | null;
  onCancel?: () => void;
  theme: 'light' | 'dark';
}

const ORDERED_STEPS: { step: CounterfactualProgressStep; label: string; icon: React.ElementType }[] = [
  { step: 'QUEUED', label: '1. Queued in Execution Pool', icon: Compass },
  { step: 'RETRIEVING_FORCING', label: '2. Retrieving ERA5 & Current Forcing', icon: Database },
  { step: 'ALIGNING_AIS', label: '3. Aligning Historical AIS Track', icon: Compass },
  { step: 'INITIALIZING_RELEASE', label: '4. Sampling Feasible Release Corridor', icon: Layers },
  { step: 'INTEGRATING_PARTICLES', label: '5. Integrating Particle Dynamics (dX/dt)', icon: Activity },
  { step: 'BUILDING_FOOTPRINT', label: '6. Observation Operator Density Projection', icon: Layers },
  { step: 'COMPARING_OBSERVATION', label: '7. Computing IoU, Dice & Hausdorff Metrics', icon: BarChart2 },
  { step: 'RUNNING_UNCERTAINTY', label: '8. Evaluating P50/P95 Stochastic Ensemble', icon: Activity },
  { step: 'COMPARING_DECOYS', label: '9. Evaluating Null Separation vs Decoys', icon: ShieldAlert },
  { step: 'FINALIZING_EVIDENCE', label: '10. Compiling Provenance & Verdict', icon: FileCheck },
  { step: 'COMPLETED', label: '11. Calculation Completed', icon: CheckCircle2 },
];

export const CounterfactualProgressModal: React.FC<CounterfactualProgressModalProps> = ({
  isOpen,
  currentEvent,
  onCancel,
  theme,
}) => {
  if (!isOpen) return null;

  const isLight = theme === 'light';
  const currentStep = currentEvent?.step || 'QUEUED';
  const currentIndex = ORDERED_STEPS.findIndex((s) => s.step === currentStep);
  const progressPct = currentEvent?.progress || 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div
        className={`w-full max-w-md rounded-xl border shadow-2xl overflow-hidden font-mono text-xs transition-colors ${
          isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#0E1624] border-slate-800 text-slate-100'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-cyan-500 animate-spin" />
            <span className="font-bold tracking-wide text-sm">
              Scientific Simulation Execution
            </span>
          </div>
          <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-bold">
            {progressPct}%
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 overflow-hidden">
          <div
            className="bg-cyan-500 h-full transition-all duration-200"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Current State Message */}
        <div className="p-4 space-y-4">
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-slate-800/80 space-y-1">
            <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">
              Current Transition:
            </div>
            <div className="text-xs font-sans text-cyan-600 dark:text-cyan-300 font-semibold">
              {currentEvent?.message || 'Connecting to backend simulation pool...'}
            </div>
          </div>

          {/* Stepper List */}
          <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
            {ORDERED_STEPS.map((s, idx) => {
              const Icon = s.icon;
              const isPast = idx < currentIndex;
              const isCurrent = idx === currentIndex;

              return (
                <div
                  key={s.step}
                  className={`flex items-center justify-between p-1.5 rounded transition-colors text-[10px] ${
                    isCurrent
                      ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 font-bold'
                      : isPast
                      ? 'text-slate-600 dark:text-slate-400'
                      : 'text-slate-400 dark:text-slate-600 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5" />
                    <span>{s.label}</span>
                  </div>

                  <div>
                    {isPast ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    ) : isCurrent ? (
                      <RotateCcw className="w-3 h-3 text-cyan-500 animate-spin" />
                    ) : (
                      <span className="text-[9px] text-slate-400 dark:text-slate-600">Pending</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cancel button */}
          {onCancel && (
            <div className="flex justify-end pt-2">
              <button
                onClick={onCancel}
                className="text-[11px] font-mono px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
              >
                Abort Job
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
