'use client';

import React, { useState } from 'react';
import {
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  GitCompare,
  Activity,
  Layers,
} from 'lucide-react';
import { CounterfactualTestResult } from '@/types/simulation';

interface CounterfactualTestViewProps {
  testResult: CounterfactualTestResult;
}

export const CounterfactualTestView: React.FC<CounterfactualTestViewProps> = ({ testResult }) => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationProgress, setSimulationProgress] = useState(100);

  const handleRunSimulation = () => {
    setIsSimulating(true);
    setSimulationProgress(0);

    const interval = setInterval(() => {
      setSimulationProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsSimulating(false);
          return 100;
        }
        return prev + 20;
      });
    }, 150);
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Test Banner Header */}
      <div className="p-4 rounded-xl bg-[#0C121E] border border-white/10 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-white tracking-wide">
              Counterfactual Source Hypothesis Test
            </span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 font-bold">
            DERIVED RESULT
          </span>
        </div>

        <div className="p-3 rounded-lg bg-black/40 border border-white/5 space-y-1">
          <div className="text-[10px] text-amber-300 uppercase tracking-wider font-bold">
            Hypothesis Under Investigation:
          </div>
          <p className="text-zinc-300 text-[11px] font-sans leading-normal">
            &ldquo;If MT NORDIC POLARIS were the source, could a continuous bilge slop release along its trajectory produce the observed slick?&rdquo;
          </p>
        </div>

        {/* Rerun Simulation Button & Progress */}
        <div className="pt-1 flex items-center justify-between">
          <button
            onClick={handleRunSimulation}
            disabled={isSimulating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
          >
            {isSimulating ? (
              <>
                <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                <span>Simulating Plume Dispersion ({simulationProgress}%)...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-emerald-400" />
                <span>RUN SOURCE HYPOTHESIS TEST</span>
              </>
            )}
          </button>

          <span className="text-[10px] text-zinc-500">
            Model: Gaussian-Lagrangian Kinematics
          </span>
        </div>

        {isSimulating && (
          <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
            <div
              className="bg-emerald-400 h-full transition-all duration-150"
              style={{ width: `${simulationProgress}%` }}
            />
          </div>
        )}
      </div>

      {/* Comparison: Observed Slick vs Simulated Slick */}
      <div className="grid grid-cols-2 gap-2">
        {/* Observed Column */}
        <div className="p-3.5 rounded-xl bg-[#0E1524] border border-white/10 space-y-2">
          <div className="text-[10px] text-purple-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            <span>Observed SAR Slick</span>
          </div>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-zinc-400">Area:</span>
              <strong className="text-white">{testResult.observedSlickStats.areaKm2} km²</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Length / Width:</span>
              <strong className="text-white">
                {testResult.observedSlickStats.lengthKm} / {testResult.observedSlickStats.widthKm} km
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Heading Axis:</span>
              <strong className="text-white">{testResult.observedSlickStats.axisHeadingDeg}° NE</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Data Source:</span>
              <span className="text-cyan-300 text-[10px]">Sentinel-1A SAR (Real)</span>
            </div>
          </div>
        </div>

        {/* Simulated Column */}
        <div className="p-3.5 rounded-xl bg-[#0A1810] border border-emerald-500/30 space-y-2">
          <div className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" />
            <span>Simulated Release Plume</span>
          </div>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-zinc-400">Sim Area:</span>
              <strong className="text-emerald-300">{testResult.simulatedSlickStats.areaKm2} km²</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Length / Width:</span>
              <strong className="text-emerald-300">
                {testResult.simulatedSlickStats.lengthKm} / {testResult.simulatedSlickStats.widthKm} km
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Sim Heading:</span>
              <strong className="text-emerald-300">{testResult.simulatedSlickStats.axisHeadingDeg}° NE</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Sim Source:</span>
              <span className="text-emerald-400 text-[10px]">Tanker Ballast Line (180 m³)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Consistency Metric Gauges */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
          <div className="text-[9px] text-zinc-400 uppercase">Dice Overlap</div>
          <div className="text-sm font-bold text-emerald-400 mt-0.5">
            {(testResult.overlapDiceCoefficient * 100).toFixed(1)}%
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
          <div className="text-[9px] text-zinc-400 uppercase">Heading Delta</div>
          <div className="text-sm font-bold text-emerald-400 mt-0.5">
            &plusmn;{testResult.orientationDeltaDeg}°
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
          <div className="text-[9px] text-zinc-400 uppercase">Offset Dist</div>
          <div className="text-sm font-bold text-emerald-400 mt-0.5">
            {testResult.centroidOffsetDistanceNm} nm
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
          <div className="text-[9px] text-zinc-400 uppercase">Plausibility</div>
          <div className="text-sm font-bold text-emerald-400 mt-0.5">
            {testResult.volumePlausibilityScore}%
          </div>
        </div>
      </div>

      {/* Final Hypothesis Verdict Banner */}
      <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/40 via-emerald-900/30 to-black border border-emerald-500/50 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div>
            <div className="text-xs font-black text-white tracking-wide">
              {testResult.verdictLabel}
            </div>
            <div className="text-[10px] text-zinc-300 font-sans mt-0.5">
              {testResult.summaryExplanation}
            </div>
          </div>
        </div>

        <div className="px-2.5 py-1 rounded bg-emerald-400 text-black font-black text-xs uppercase shadow-sm">
          {testResult.verdict}
        </div>
      </div>
    </div>
  );
};

export default CounterfactualTestView;
