'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Loader2, Circle, Activity } from 'lucide-react';
import { ExperimentPhase, ExperimentState } from '@/types/counterfactualWorkstation';

interface ProcessStep {
  id: number;
  label: string;
  correspondingPhase: number;
}

const PROCESS_STEPS: ProcessStep[] = [
  { id: 1, label: 'Candidate selected', correspondingPhase: 1 },
  { id: 2, label: 'Release hypothesis generated', correspondingPhase: 2 },
  { id: 3, label: 'Particles initialized', correspondingPhase: 3 },
  { id: 4, label: 'Environmental forcing applied', correspondingPhase: 4 },
  { id: 5, label: 'Advection complete', correspondingPhase: 5 },
  { id: 6, label: 'Plume generated', correspondingPhase: 6 },
  { id: 7, label: 'Comparison complete', correspondingPhase: 7 },
];

interface CounterfactualProcessPanelProps {
  currentPhase: ExperimentPhase;
  experimentState: ExperimentState;
  theme: 'light' | 'dark';
}

export const CounterfactualProcessPanel: React.FC<CounterfactualProcessPanelProps> = ({
  currentPhase,
  experimentState,
  theme,
}) => {
  const isLight = theme === 'light';

  // Determine stage status
  const getStepStatus = (step: ProcessStep): 'complete' | 'active' | 'pending' => {
    if (experimentState === 'COMPLETE' || currentPhase >= step.correspondingPhase + 1) {
      return 'complete';
    }
    if (experimentState !== 'IDLE' && currentPhase === step.correspondingPhase) {
      return 'active';
    }
    if (step.id === 1 && experimentState === 'IDLE') {
      return 'complete'; // Candidate is pre-selected even in IDLE
    }
    return 'pending';
  };

  return (
    <div
      className={`rounded-lg border shadow-md backdrop-blur-md p-3 select-none transition-colors duration-150 font-mono ${
        isLight
          ? 'bg-white/95 border-slate-300 text-slate-800'
          : 'bg-[#0B121E]/95 border-slate-700/80 text-slate-200'
      }`}
    >
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold tracking-wider uppercase">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          <span>Scientific Process Pipeline</span>
        </div>
        <span
          className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
            experimentState === 'RUNNING'
              ? 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-600/40'
              : experimentState === 'COMPARING'
              ? 'bg-cyan-100 text-cyan-800 border border-cyan-300 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-600/40'
              : experimentState === 'COMPLETE'
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-600/40'
              : 'bg-slate-100 text-slate-600 border border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
          }`}
        >
          {experimentState}
        </span>
      </div>

      <div className="space-y-1.5 text-xs">
        {PROCESS_STEPS.map((step) => {
          const status = getStepStatus(step);
          const isComplete = status === 'complete';
          const isActive = status === 'active';

          return (
            <motion.div
              key={step.id}
              initial={false}
              animate={{
                backgroundColor: isActive
                  ? isLight
                    ? 'rgba(6, 182, 212, 0.12)'
                    : 'rgba(6, 182, 212, 0.18)'
                  : 'transparent',
              }}
              transition={{ duration: 0.2 }}
              className={`flex items-center gap-2 px-2 py-1 rounded text-[11px] transition-colors ${
                isActive
                  ? 'font-bold text-cyan-700 dark:text-cyan-300'
                  : isComplete
                  ? 'text-slate-700 dark:text-slate-300'
                  : 'text-slate-400 dark:text-slate-600'
              }`}
            >
              <div className="w-4 h-4 flex items-center justify-center shrink-0">
                {isComplete ? (
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                  </motion.div>
                ) : isActive ? (
                  <Loader2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 animate-spin" />
                ) : (
                  <Circle className="w-2.5 h-2.5 text-slate-300 dark:text-slate-700 fill-current" />
                )}
              </div>
              <span className="flex-1 truncate">{step.label}</span>
              {isActive && (
                <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-cyan-600 text-white font-mono">
                  ACTIVE
                </span>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
