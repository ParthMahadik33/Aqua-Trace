'use client';

import React from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { SimulationStepConfig, SimulationStepId } from '@/types/simulation';

interface SimulationPipelineNavProps {
  steps: SimulationStepConfig[];
  currentStepId: SimulationStepId;
  onSelectStep: (stepId: SimulationStepId) => void;
}

const SHORT_LABELS: Record<SimulationStepId, string> = {
  surveillance: 'Surveillance',
  sar_acquisition: 'SAR',
  sar_processing: 'Processing',
  detection: 'Detection',
  segmentation: 'Segmentation',
  environmental: 'Context',
  source_reconstruction: 'Hindcast',
  ais_correlation: 'AIS',
  attribution: 'Attribution',
  counterfactual: 'Counterfactual',
  impact_prioritization: 'Impact',
  report: 'Report',
};

export const SimulationPipelineNav: React.FC<SimulationPipelineNavProps> = ({
  steps,
  currentStepId,
  onSelectStep,
}) => {
  const currentIndex = steps.findIndex((s) => s.id === currentStepId);

  return (
    <nav
      aria-label="Investigation Timeline"
      className="w-full bg-[#080C14] border-b border-white/10 px-3 py-1.5 backdrop-blur-md overflow-x-auto custom-scrollbar select-none z-10 flex-shrink-0"
    >
      <div className="flex items-center min-w-max gap-1 max-w-7xl mx-auto">
        {steps.map((step, idx) => {
          const isActive = step.id === currentStepId;
          const isCompleted = idx < currentIndex;
          const label = SHORT_LABELS[step.id] || step.shortTitle;

          return (
            <React.Fragment key={step.id}>
              <button
                onClick={() => onSelectStep(step.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-mono text-xs transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-cyan-500/15 border-cyan-400/70 text-cyan-300 font-bold shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                    : isCompleted
                    ? 'bg-transparent border-transparent text-zinc-300 hover:text-white hover:bg-white/5'
                    : 'bg-transparent border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                }`}
                title={`Stage ${step.numberStr}: ${step.title}`}
              >
                {/* State indicator: Check icon for completed, number for active/upcoming */}
                {isCompleted ? (
                  <span className="w-4 h-4 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-[10px]">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                ) : (
                  <span
                    className={`text-[11px] ${
                      isActive ? 'text-cyan-400 font-extrabold' : 'text-zinc-500'
                    }`}
                  >
                    {step.numberStr}
                  </span>
                )}

                <span className="tracking-wider">{label}</span>
              </button>

              {/* Tiny separator between stages */}
              {idx < steps.length - 1 && (
                <ChevronRight className="w-3 h-3 text-zinc-700 flex-shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </nav>
  );
};

export default SimulationPipelineNav;
