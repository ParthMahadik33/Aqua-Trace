'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import {
  SimulationStepId,
  SarMetadata,
  MetoceanContext,
  SourceReconstructionModel,
  CandidateVessel,
  CounterfactualScenario,
  ImpactPrioritization,
} from '@/types/simulation';

const DynamicSimulationMapInner = dynamic(() => import('./SimulationMapInner'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#070A10] text-zinc-400 font-mono gap-3">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border border-amber-500/30 animate-ping"></div>
        <div className="absolute inset-0 rounded-full border-2 border-t-amber-400 border-r-transparent border-b-amber-500/30 border-l-transparent animate-spin"></div>
      </div>
      <span className="text-xs tracking-widest text-amber-400/80 uppercase">
        INITIALIZING FORENSIC SIMULATION CANVAS...
      </span>
    </div>
  ),
});

interface SimulationMapWrapperProps {
  currentStepId: SimulationStepId;
  sarMetadata: SarMetadata;
  metocean: MetoceanContext;
  sourceRecon: SourceReconstructionModel;
  candidates: CandidateVessel[];
  counterfactual: CounterfactualScenario[];
  impact: ImpactPrioritization;
  selectedCandidate: CandidateVessel | null;
  onSelectCandidate: (candidate: CandidateVessel) => void;
  activeOverlayMode: 'none' | 'vv' | 'composite' | 'mask' | 'overlay';
  overlayOpacity: number;
  forecastHours?: number;
  forecastLayers?: {
    coastalExposure: boolean;
    ecological: boolean;
    fisheries: boolean;
    population: boolean;
  };
}

export const SimulationMapWrapper: React.FC<SimulationMapWrapperProps> = (props) => {
  return <DynamicSimulationMapInner {...props} />;
};

export default SimulationMapWrapper;
