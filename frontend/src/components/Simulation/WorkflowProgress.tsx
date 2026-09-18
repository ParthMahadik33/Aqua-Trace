'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { SimulationStepConfig, SimulationStepId } from '@/types/simulation';

interface WorkflowProgressProps {
  steps: SimulationStepConfig[];
  currentStepId: SimulationStepId;
  onSelectStep: (stepId: SimulationStepId) => void;
  className?: string;
}

const STAGE_TITLES: Record<SimulationStepId, string> = {
  surveillance: 'Surveillance',
  sar_acquisition: 'SAR Acquisition',
  sar_processing: 'Screening',
  detection: 'Detection',
  segmentation: 'Segmentation',
  environmental: 'Context',
  source_reconstruction: 'Hindcast',
  ais_correlation: 'AIS Shortlist',
  attribution: 'Attribution',
  counterfactual: 'Counterfactual',
  impact_prioritization: 'Impact Forecast',
  report: 'Official Report',
};

export const WorkflowProgress: React.FC<WorkflowProgressProps> = ({
  steps,
  currentStepId,
  onSelectStep,
  className = '',
}) => {
  const currentIndex = steps.findIndex((s) => s.id === currentStepId);
  const activeStep = steps[currentIndex] || steps[0];
  const stepNumber = currentIndex + 1;

  return (
    <div
      className={`w-full bg-surface border-b border-border transition-colors select-none ${className}`}
      data-testid="workflow-progress"
    >
      <div className="max-w-7xl mx-auto px-4 py-2.5">
        {/* Active Stage Callout Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 mb-2 border-b border-border/50">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase font-semibold">
              INVESTIGATION WORKFLOW
            </span>
            <span className="text-border">|</span>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-600 text-white">
                STAGE {stepNumber.toString().padStart(2, '0')} / 12
              </span>
              <span className="font-mono font-bold text-xs sm:text-sm text-foreground tracking-wide uppercase">
                {activeStep.title}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
            <span>
              STATUS:{' '}
              <strong className="text-foreground">
                {currentIndex === 11 ? 'FINALIZED' : 'IN PROGRESS'}
              </strong>
            </span>
            <span>&middot;</span>
            <span>
              COMPLETED:{' '}
              <strong className="text-foreground">{currentIndex}</strong> / 12
            </span>
          </div>
        </div>

        {/* 12-Stage Stepper with clean progress line */}
        <div className="relative py-1">
          {/* Horizontal Track Line */}
          <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-0.5 bg-border -z-0 hidden md:block" />

          {/* Stepper Buttons */}
          <div className="flex items-center justify-between gap-1 overflow-x-auto custom-scrollbar relative z-10 py-1">
            {steps.map((step, idx) => {
              const isActive = step.id === currentStepId;
              const isCompleted = idx < currentIndex;
              const title = STAGE_TITLES[step.id] || step.shortTitle;
              const numStr = (idx + 1).toString().padStart(2, '0');

              return (
                <button
                  key={step.id}
                  onClick={() => onSelectStep(step.id)}
                  className={`group flex items-center gap-1.5 px-2 py-1 rounded text-left transition-colors cursor-pointer border flex-shrink-0 ${
                    isActive
                      ? 'bg-sky-600 text-white border-sky-500 font-bold shadow-sm ring-2 ring-sky-500/20'
                      : isCompleted
                      ? 'bg-surface hover:bg-panel text-foreground border-border hover:border-slate-400'
                      : 'bg-surface/50 hover:bg-panel text-muted-foreground border-transparent hover:border-border'
                  }`}
                  title={`Stage ${numStr}: ${step.title}`}
                >
                  {/* Circle indicator */}
                  <span
                    className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-mono font-bold ${
                      isActive
                        ? 'bg-white text-sky-700'
                        : isCompleted
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                        : 'bg-panel text-muted-foreground'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-3 h-3 stroke-[3]" />
                    ) : (
                      <span>{numStr}</span>
                    )}
                  </span>

                  {/* Stage Label */}
                  <span
                    className={`text-[11px] font-mono whitespace-nowrap tracking-tight ${
                      isActive ? 'font-bold' : isCompleted ? 'font-medium' : 'font-normal'
                    }`}
                  >
                    {title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowProgress;
