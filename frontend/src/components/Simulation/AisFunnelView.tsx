'use client';

import React, { useState } from 'react';
import {
  Filter,
  CheckCircle2,
  XCircle,
  Ship,
  Compass,
  Clock,
  ArrowDown,
  Info,
} from 'lucide-react';
import { AisFunnelStep, CandidateVessel } from '@/types/simulation';

interface AisFunnelViewProps {
  funnelSteps: AisFunnelStep[];
  candidates: CandidateVessel[];
  selectedCandidate: CandidateVessel | null;
  onSelectCandidate: (candidate: CandidateVessel) => void;
}

export const AisFunnelView: React.FC<AisFunnelViewProps> = ({
  funnelSteps,
  candidates,
  selectedCandidate,
  onSelectCandidate,
}) => {
  const [activeFunnelStage, setActiveFunnelStage] = useState<number>(5);

  return (
    <div className="space-y-4 font-mono">
      {/* Funnel Progress Track */}
      <div className="p-3.5 rounded-xl bg-[#0C121E] border border-white/10 space-y-3 shadow-sm">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-white tracking-wide">
              Spatio-Temporal Narrowing Funnel
            </span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 font-bold">
            PROTOTYPE AIS CORRELATION
          </span>
        </div>

        {/* Funnel Stages Stepper */}
        <div className="grid grid-cols-5 gap-1.5 text-center">
          {funnelSteps.map((step) => {
            const isSelected = activeFunnelStage === step.stepNumber;
            const isPastOrActive = step.stepNumber <= activeFunnelStage;

            return (
              <button
                key={step.stepNumber}
                onClick={() => setActiveFunnelStage(step.stepNumber)}
                className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-md ring-1 ring-emerald-400/40'
                    : isPastOrActive
                    ? 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'
                    : 'bg-white/2 border-white/5 text-zinc-600'
                }`}
              >
                <div className="text-[9px] text-zinc-400 uppercase">Stage {step.stepNumber}</div>
                <div
                  className={`text-sm font-black mt-0.5 ${
                    isSelected ? 'text-emerald-400' : isPastOrActive ? 'text-white' : 'text-zinc-500'
                  }`}
                >
                  {step.count}
                </div>
                <div className="text-[8px] text-zinc-500 truncate mt-0.5">
                  {step.title.split(' ')[0]}
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Stage Criteria Callout */}
        {funnelSteps[activeFunnelStage - 1] && (
          <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 text-[11px] flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-cyan-300">
                Stage {activeFunnelStage}: {funnelSteps[activeFunnelStage - 1].title}
              </span>
              <p className="text-zinc-300 text-[10px] mt-0.5 font-sans">
                {funnelSteps[activeFunnelStage - 1].filterCriteria}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Candidate Vessels List (filtered by survived stage) */}
      <div className="space-y-2">
        <div className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center justify-between">
          <span>Screened Corridor Vessels</span>
          <span className="text-[10px] text-zinc-500">
            {candidates.filter((c) => c.funnelStageSurvived >= activeFunnelStage).length} remaining at Stage {activeFunnelStage}
          </span>
        </div>

        <div className="space-y-2">
          {candidates.map((cand) => {
            const hasSurvived = cand.funnelStageSurvived >= activeFunnelStage;
            const isSelected = selectedCandidate?.mmsi === cand.mmsi;
            const isPrimary = cand.isPrimarySuspect;

            return (
              <div
                key={cand.mmsi}
                onClick={() => onSelectCandidate(cand)}
                className={`p-3 rounded-xl border transition-all cursor-pointer space-y-2 ${
                  isSelected
                    ? 'bg-amber-500/20 border-amber-400 shadow-md ring-1 ring-amber-400/50'
                    : hasSurvived
                    ? isPrimary
                      ? 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/15'
                      : 'bg-[#0C121E] border-white/10 hover:bg-[#121B2C]'
                    : 'bg-[#070A10]/60 border-white/5 opacity-40 hover:opacity-75'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Ship
                      className={`w-4 h-4 ${
                        isPrimary ? 'text-amber-400' : 'text-zinc-400'
                      }`}
                    />
                    <div>
                      <div className="font-bold text-white text-xs flex items-center gap-1.5">
                        <span>{cand.name}</span>
                        {isPrimary && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-red-500/20 text-red-300 border border-red-500/40">
                            VESSEL OF INTEREST
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        IMO: {cand.imo} • {cand.vesselType} • {cand.flag}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={`text-xs font-black ${
                        isPrimary ? 'text-emerald-400' : 'text-zinc-400'
                      }`}
                    >
                      {cand.attributionScore}%
                    </div>
                    <div className="text-[9px] text-zinc-500">Attribution</div>
                  </div>
                </div>

                {/* Status Indicator: Survived or Eliminated */}
                <div className="pt-1 border-t border-white/5 flex items-center justify-between text-[10px]">
                  {hasSurvived ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Survived Stage {activeFunnelStage} Filter</span>
                    </span>
                  ) : (
                    <span className="text-rose-400 flex items-center gap-1">
                      <XCircle className="w-3 h-3" />
                      <span>Eliminated at Stage {cand.funnelStageSurvived}: {cand.eliminationReason}</span>
                    </span>
                  )}

                  <span className="text-zinc-400">
                    CPA: {cand.closestApproachDistanceNm} nm @ {cand.closestApproachTimeUtc.slice(11, 16)}Z
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AisFunnelView;
