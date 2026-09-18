'use client';

import React, { useState, useEffect } from 'react';
import { Play, RotateCcw, Ship, HelpCircle } from 'lucide-react';
import { CandidateVessel, SarMetadata } from '@/types/simulation';

interface CounterfactualAnalyticalOverlayProps {
  sarMetadata: SarMetadata;
  candidates: CandidateVessel[];
  selectedCandidate: CandidateVessel | null;
  onSelectCandidate: (candidate: CandidateVessel) => void;
  dynamicCounterfactual?: any;
  onRunTest?: () => void;
  isLoading?: boolean;
}

export const CounterfactualAnalyticalOverlay: React.FC<CounterfactualAnalyticalOverlayProps> = ({
  candidates,
  selectedCandidate,
  onSelectCandidate,
  dynamicCounterfactual,
  onRunTest,
  isLoading = false,
}) => {
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  const candidate = dynamicCounterfactual?.candidate || selectedCandidate || candidates[0];
  const metrics = dynamicCounterfactual?.metrics || {
    centroid_distance_nm: 8.72,
    orientation_delta_deg: 15.4,
  };

  const offsetNm = metrics.centroid_distance_nm ?? 8.72;
  const orientDelta = metrics.orientation_delta_deg ?? 15.4;
  const verdict = dynamicCounterfactual?.verdict || 'INCONCLUSIVE';

  const handleTriggerTest = () => {
    setIsSimulating(true);
    if (onRunTest) onRunTest();
    setTimeout(() => {
      setIsSimulating(false);
    }, 900);
  };

  return (
    <div className="absolute inset-x-3 top-3 z-[400] pointer-events-none flex flex-wrap items-center justify-between gap-2">
      {/* Compact Top Analyst Control Strip */}
      <div className="pointer-events-auto flex flex-wrap items-center gap-2 p-1.5 rounded bg-surface/95 border border-border shadow-sm backdrop-blur-md font-mono text-[10px]">
        {/* Stage Question Label */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 text-muted-foreground font-semibold border-r border-border/70 pr-2.5">
          <HelpCircle className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 flex-shrink-0" />
          <span className="hidden sm:inline">HYPOTHESIS TEST:</span>
          <span className="text-foreground font-bold">Could this vessel explain the slick?</span>
        </div>

        {/* Candidate Selection Buttons */}
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground text-[9px] uppercase px-1 hidden md:inline">CANDIDATE:</span>
          {candidates.slice(0, 4).map((cand) => {
            const isSelected = cand.mmsi === candidate.mmsi;
            const shortName = cand.name.replace(/^(MT|MV|FV)\s+/, '');
            return (
              <button
                key={cand.mmsi}
                type="button"
                onClick={() => onSelectCandidate(cand)}
                className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-panel hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60'
                }`}
                title={`${cand.name} (${cand.vesselType || 'Commercial'})`}
              >
                {shortName}
              </button>
            );
          })}
        </div>

        {/* Run Test Button */}
        <button
          type="button"
          onClick={handleTriggerTest}
          disabled={isSimulating || isLoading}
          className="ml-1 px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
        >
          {isSimulating ? (
            <>
              <RotateCcw className="w-3 h-3 animate-spin" />
              <span>TESTING...</span>
            </>
          ) : (
            <>
              <Play className="w-3 h-3 fill-white" />
              <span>RUN SOURCE HYPOTHESIS TEST</span>
            </>
          )}
        </button>
      </div>

      {/* Floating Status Pill on the Right */}
      <div className="pointer-events-auto hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded bg-surface/95 border border-border shadow-sm backdrop-blur-md font-mono text-[10px]">
        <span className="text-muted-foreground uppercase text-[9px]">RESULT:</span>
        <span
          className={`px-1.5 py-0.5 rounded font-bold uppercase ${
            verdict === 'SUPPORTED'
              ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
              : 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30'
          }`}
        >
          {verdict}
        </span>
        <span className="text-muted-foreground text-[9px] border-l border-border/70 pl-2">
          {offsetNm} NM offset &middot; {orientDelta}° delta
        </span>
      </div>
    </div>
  );
};

export default CounterfactualAnalyticalOverlay;
