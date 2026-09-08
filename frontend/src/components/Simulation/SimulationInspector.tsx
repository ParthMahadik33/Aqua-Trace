'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  SimulationStepConfig,
  SarMetadata,
  MetoceanContext,
  SourceReconstructionModel,
  CandidateVessel,
  CounterfactualScenario,
  ImpactPrioritization,
} from '@/types/simulation';
import { getForecastState } from '@/data/case0004ImpactForecast';
import {
  Share2,
  FileText,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  ShieldAlert,
  AlertTriangle,
  Compass,
  Ship,
  CheckCircle2,
  Info,
  Layers,
  Activity,
  Droplets,
  Wind,
} from 'lucide-react';

interface SimulationInspectorProps {
  currentStep: SimulationStepConfig;
  currentStepIndex: number;
  totalSteps: number;
  sarMetadata: SarMetadata;
  metocean: MetoceanContext;
  sourceRecon: SourceReconstructionModel;
  candidates: CandidateVessel[];
  counterfactual: CounterfactualScenario[];
  impact: ImpactPrioritization;
  selectedCandidate: CandidateVessel | null;
  onSelectCandidate: (candidate: CandidateVessel) => void;
  activeOverlayMode: 'none' | 'vv' | 'composite' | 'mask' | 'overlay';
  onChangeOverlayMode: (mode: 'none' | 'vv' | 'composite' | 'mask' | 'overlay') => void;
  overlayOpacity: number;
  onChangeOverlayOpacity: (opacity: number) => void;
  onPrevStep: () => void;
  onNextStep: () => void;
  onOpenReport: () => void;
  onOpenEvidenceGraph?: () => void;
  impactHours?: number;
}

export const SimulationInspector: React.FC<SimulationInspectorProps> = ({
  currentStep,
  currentStepIndex,
  totalSteps,
  sarMetadata,
  metocean,
  sourceRecon,
  candidates,
  counterfactual,
  impact,
  selectedCandidate,
  onSelectCandidate,
  activeOverlayMode,
  onChangeOverlayMode,
  overlayOpacity,
  onChangeOverlayOpacity,
  onPrevStep,
  onNextStep,
  onOpenReport,
  onOpenEvidenceGraph,
  impactHours = 0,
}) => {
  const [paramsExpanded, setParamsExpanded] = useState(true);

  // Status tag styling helper
  const getStatusBadge = (statusTag: string) => {
    if (statusTag.includes('REAL')) {
      return {
        text: 'REAL METADATA',
        cls: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/40',
        dot: 'bg-cyan-400',
      };
    }
    if (statusTag.includes('MODEL') || statusTag.includes('ESTIMATE')) {
      return {
        text: 'MODEL ESTIMATE',
        cls: 'bg-purple-500/10 text-purple-300 border-purple-500/40',
        dot: 'bg-purple-400',
      };
    }
    if (statusTag.includes('HINDCAST')) {
      return {
        text: 'SIMULATED HINDCAST',
        cls: 'bg-amber-500/10 text-amber-300 border-amber-500/40',
        dot: 'bg-amber-400',
      };
    }
    if (statusTag.includes('SIMULATED')) {
      return {
        text: 'SIMULATED INPUT',
        cls: 'bg-blue-500/10 text-blue-300 border-blue-500/40',
        dot: 'bg-blue-400',
      };
    }
    if (statusTag.includes('ATTRIBUTION')) {
      return {
        text: 'PROTOTYPE ATTRIBUTION',
        cls: 'bg-rose-500/10 text-rose-300 border-rose-500/40',
        dot: 'bg-rose-400',
      };
    }
    if (statusTag.includes('COUNTERFACTUAL')) {
      return {
        text: 'PROTOTYPE COUNTERFACTUAL',
        cls: 'bg-teal-500/10 text-teal-300 border-teal-500/40',
        dot: 'bg-teal-400',
      };
    }
    if (statusTag.includes('PROTOTYPE') || statusTag.includes('SEGMENTATION')) {
      return {
        text: 'PROTOTYPE PIPELINE',
        cls: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/40',
        dot: 'bg-indigo-400',
      };
    }
    return {
      text: statusTag,
      cls: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40',
      dot: 'bg-emerald-400',
    };
  };

  const badge = getStatusBadge(currentStep.statusTag);

  return (
    <aside className="w-full md:w-[380px] lg:w-[420px] xl:w-[440px] h-full bg-[#070A12] border-l border-white/10 flex flex-col z-20 select-none shadow-2xl overflow-hidden">
      {/* 1. INSPECTOR HEADER: STAGE NUMBER, STATUS, EVIDENCE GRAPH LINK */}
      <div className="p-4 border-b border-white/10 bg-[#0A0E18]/80 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-white/5 text-zinc-300 border border-white/10">
              STAGE {currentStep.numberStr} / {totalSteps.toString().padStart(2, '0')}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[10px] font-bold border tracking-wide uppercase ${badge.cls}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
              {badge.text}
            </span>
          </div>

          {onOpenEvidenceGraph && (
            <button
              onClick={onOpenEvidenceGraph}
              className="flex items-center gap-1 px-2 py-1 rounded bg-white/5 hover:bg-cyan-500/10 text-zinc-400 hover:text-cyan-300 border border-white/10 hover:border-cyan-500/30 text-[10px] font-mono transition-all cursor-pointer"
              title="Open full investigative evidence graph"
            >
              <Share2 className="w-3 h-3" />
              <span>EVIDENCE</span>
            </button>
          )}
        </div>

        <div>
          <h2 className="text-base font-semibold text-white tracking-wide leading-tight">
            {currentStep.title}
          </h2>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            {currentStep.description}
          </p>
        </div>
      </div>

      {/* 2. SCROLLABLE INSPECTOR BODY */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="p-4 space-y-4 text-xs font-sans text-zinc-300"
          >

        {/* --- STAGE 01: SURVEILLANCE --- */}
        {currentStep.id === 'surveillance' && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/10 space-y-2">
              <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold">
                Autonomous Screening Flow
              </div>
              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="flex items-center gap-2 text-zinc-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span>Incoming acquisition stream</span>
                </div>
                <div className="text-zinc-600 pl-3.5">↓</div>
                <div className="flex items-center gap-2 text-zinc-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span>Automated pre-screening filter</span>
                </div>
                <div className="text-zinc-600 pl-3.5">↓</div>
                <div className="flex items-center gap-2 text-amber-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span>Candidate anomaly review</span>
                </div>
              </div>
            </div>

            <SectionBox title="Input">
              <div className="font-mono text-[11px] text-zinc-200">
                Copernicus Sentinel-1A SAR Stream · IW Mode
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5">
                Acquisition pass: 2018-08-03 17:25:51 UTC (German Bight sector)
              </div>
            </SectionBox>

            <SectionBox title="Process">
              Autonomous orbital pass screening triggered upon ingest of dual-polarization GRD scene.
            </SectionBox>

            <CollapsibleParams title="Key Parameters" isExpanded={paramsExpanded} onToggle={() => setParamsExpanded(!paramsExpanded)}>
              <ParamRow label="Sensor" value="Sentinel-1A C-SAR" />
              <ParamRow label="Pass Type" value="Ascending (Track 168)" />
              <ParamRow label="Swath Width" value="250 km" />
              <ParamRow label="Screening Threshold" value="> 3.2 dB dark delta" />
              <ParamRow label="Mode" value="Simulation Replay" />
            </CollapsibleParams>

            <ResultBox
              label="Screening Result"
              highlight="Candidate surface anomaly detected"
              subtext="German Bight fairway (55.24° N, 5.88° E)"
              status="Candidate isolated for deep SAR analysis"
              confidence="94%"
            />
          </div>
        )}

        {/* --- STAGE 02: SAR ACQUISITION --- */}
        {currentStep.id === 'sar_acquisition' && (
          <div className="space-y-4">
            <SectionBox title="Input">
              <div className="font-mono text-[11px] text-cyan-300">
                Level-1 Ground Range Detected (GRD)
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5">
                Dual polarization (VV + VH) · High resolution
              </div>
            </SectionBox>

            <SectionBox title="Process">
              Scene framing, orbital state vector matching, and range-Doppler georeferencing over North Sea sector.
            </SectionBox>

            <CollapsibleParams title="Acquisition Metadata" isExpanded={paramsExpanded} onToggle={() => setParamsExpanded(!paramsExpanded)}>
              <ParamRow label="Platform" value="Sentinel-1A" />
              <ParamRow label="Sensor Mode" value="IW / GRDH" />
              <ParamRow label="Polarization" value="VV + VH" />
              <ParamRow label="Timestamp" value="2018-08-03 17:25:51 UTC" />
              <ParamRow label="Spatial Resolution" value="10m pixel spacing" />
              <ParamRow label="Incidence Angle" value="34.8° – 41.2°" />
              <ParamRow
                label="Product ID"
                value="S1A_IW_GRDH_1SDV_20180803..."
                isCode
              />
            </CollapsibleParams>

            <ResultBox
              label="Acquisition Status"
              highlight="Calibrated SAR Scene Loaded"
              subtext="Dual-pol sub-scene extraction complete (2048 x 2048 px)"
              confidence="99.4%"
            />
          </div>
        )}

        {/* --- STAGE 03: PREPROCESSING --- */}
        {currentStep.id === 'sar_processing' && (
          <div className="space-y-4">
            <SectionBox title="Input">
              <div className="font-mono text-[11px] text-zinc-200">
                Calibrated Dual-Pol Backscatter (VV + VH)
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5">
                Linear power scale matrices
              </div>
            </SectionBox>

            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/10 space-y-2">
              <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold">
                Planned Operations
              </div>
              <ul className="space-y-1 text-[11px] text-zinc-300 font-mono">
                <li className="flex items-center gap-2">
                  <span className="text-cyan-400">1.</span>
                  <span>Radiometric calibration (σ° backscatter)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-cyan-400">2.</span>
                  <span>Speckle suppression (Lee-Sigma filter)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-cyan-400">3.</span>
                  <span>Contrast normalization & dynamic stretch</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-cyan-400">4.</span>
                  <span>Sub-scene AOI extraction</span>
                </li>
              </ul>
            </div>

            <CollapsibleParams title="Key Parameters" isExpanded={paramsExpanded} onToggle={() => setParamsExpanded(!paramsExpanded)}>
              <ParamRow label="Filter Kernel" value="Refined Lee 7x7" />
              <ParamRow label="Dynamic Range" value="-28.5 dB to -4.2 dB" />
              <ParamRow label="Channel Weight" value="0.75 VV + 0.25 VH" />
              <ParamRow label="SNR Enhancement" value="+24.8 dB" />
            </CollapsibleParams>

            <ResultBox
              label="Preprocessing Result"
              highlight="Normalized Matrix Ready"
              subtext="Speckle noise reduced; slick damping boundaries clarified"
              status="PROTOTYPE PIPELINE"
              confidence="96.2%"
            />
          </div>
        )}

        {/* --- STAGE 04: DETECTION --- */}
        {currentStep.id === 'detection' && (
          <div className="space-y-4">
            <SectionBox title="Detection Engine">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] text-zinc-200">Model Architecture</span>
                <span className="font-mono text-[11px] text-cyan-300">ConvNeXt-Tiny</span>
              </div>
              <div className="text-[10px] text-zinc-500 mt-1">
                Prototype spatial feature backbone fine-tuned on marine SAR slicks
              </div>
            </SectionBox>

            {/* Classification Probabilities */}
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/10 space-y-2.5">
              <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold">
                Class Probabilities
              </div>
              <div className="space-y-2 font-mono text-[11px]">
                <div>
                  <div className="flex justify-between text-zinc-300 mb-1">
                    <span className="font-bold text-cyan-300">OIL</span>
                    <span className="font-bold text-cyan-300">0.87</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full bg-cyan-400 rounded-full" style={{ width: '87%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-zinc-400 mb-1">
                    <span>LOOKALIKE</span>
                    <span>0.09</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: '9%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-zinc-400 mb-1">
                    <span>NO_OIL</span>
                    <span>0.04</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full bg-zinc-500 rounded-full" style={{ width: '4%' }} />
                  </div>
                </div>
              </div>
            </div>

            <CollapsibleParams title="Model Interpretation Factors" isExpanded={paramsExpanded} onToggle={() => setParamsExpanded(!paramsExpanded)}>
              <ParamRow label="Backscatter Contrast" value="-7.4 dB vs ambient" />
              <ParamRow label="Slick Morphology" value="Elongated linear trail" />
              <ParamRow label="Spatial Consistency" value="High border gradient" />
              <ParamRow label="Look-alike Similarity" value="Low biogenic signature" />
            </CollapsibleParams>

            <ResultBox
              label="Detection Outcome"
              highlight="POSSIBLE OIL-LIKE ANOMALY"
              subtext="High-confidence surface damping with linear dispersion profile"
              status="MODEL ESTIMATE (Unverified)"
              confidence="87%"
            />
          </div>
        )}

        {/* --- STAGE 05: SEGMENTATION --- */}
        {currentStep.id === 'segmentation' && (
          <div className="space-y-4">
            <SectionBox title="Process">
              Active contour boundary delineation and connected-component morphological analysis.
            </SectionBox>

            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/10 space-y-2">
              <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold">
                Slick Characterization
              </div>
              <div className="space-y-1.5 font-mono text-[11px]">
                <ParamRow label="Pixel Count" value="44,049 px" />
                <ParamRow label="Scene Coverage" value="1.05%" />
                <ParamRow label="Bounding Box" value="R 566–1573, C 941–1405" />
                <ParamRow label="Center Lat" value="55.244297° N" />
                <ParamRow label="Center Lon" value="5.885555° E" />
                <ParamRow label="Estimated Area" value="4.41 km²" />
                <ParamRow label="Major Axis Length" value="14.8 km" />
              </div>
            </div>

            <CollapsibleParams title="Segmentation Parameters" isExpanded={paramsExpanded} onToggle={() => setParamsExpanded(!paramsExpanded)}>
              <ParamRow label="Thresholding" value="Adaptive Otsu + -5.2dB" />
              <ParamRow label="Morphology" value="Opening + Closing 3x3" />
              <ParamRow label="Boundary Smoothness" value="Fourier descriptor 0.88" />
            </CollapsibleParams>

            <ResultBox
              label="Segmentation Result"
              highlight="Delineated Slick Geometry"
              subtext="Vector boundary exported for hydrodynamic backward tracking"
              status="PROTOTYPE SEGMENTATION"
              confidence="91.4%"
            />
          </div>
        )}

        {/* --- STAGE 06: ENVIRONMENTAL CONTEXT --- */}
        {currentStep.id === 'environmental' && (
          <div className="space-y-4">
            <SectionBox title="Metocean Data Source">
              <div className="font-mono text-[11px] text-zinc-200">
                ECMWF ERA5 Reanalysis + CMEMS Ocean Physics
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5">
                Synchronized to 2018-08-03 17:00 UTC
              </div>
            </SectionBox>

            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/10 space-y-2">
              <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold">
                Parameters & Qualitative Impact
              </div>
              <div className="space-y-2 text-[11px]">
                <div className="flex items-center justify-between border-b border-white/5 pb-1">
                  <div>
                    <span className="text-zinc-300 font-mono">Wind Speed</span>
                    <span className="text-zinc-500 text-[10px] ml-1 font-mono">6.2 m/s (WSW)</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400">Supports oil interpretation</span>
                </div>
                <div className="flex items-center justify-between border-b border-white/5 pb-1">
                  <div>
                    <span className="text-zinc-300 font-mono">Surface Current</span>
                    <span className="text-zinc-500 text-[10px] ml-1 font-mono">0.41 m/s (068°)</span>
                  </div>
                  <span className="text-[10px] font-mono text-cyan-400">Consistent with drift</span>
                </div>
                <div className="flex items-center justify-between border-b border-white/5 pb-1">
                  <div>
                    <span className="text-zinc-300 font-mono">Biogenic Look-alike</span>
                    <span className="text-zinc-500 text-[10px] ml-1 font-mono">Low</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400">Reduces ambiguity</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-zinc-300 font-mono">Low-Wind Shadow</span>
                    <span className="text-zinc-500 text-[10px] ml-1 font-mono">Absent (&gt;3 m/s)</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400">Rules out false calm</span>
                </div>
              </div>
            </div>

            <CollapsibleParams title="Complete Metocean State" isExpanded={paramsExpanded} onToggle={() => setParamsExpanded(!paramsExpanded)}>
              <ParamRow label="Wind Direction" value="245° (WSW)" />
              <ParamRow label="Current Direction" value="068° (ENE)" />
              <ParamRow label="Sea Surface Temp" value="16.4°C" />
              <ParamRow label="Wave Height (Hs)" value="1.1 m" />
              <ParamRow label="Natural Seep Likelihood" value="Extremely Low" />
            </CollapsibleParams>

            <ResultBox
              label="Context Consistency"
              highlight="HIGH CONSISTENCY"
              subtext="Possible oil-like anomaly with low contextual ambiguity."
              status="SIMULATED INPUT"
              confidence="89%"
            />
          </div>
        )}

        {/* --- STAGE 07: HINDCAST --- */}
        {currentStep.id === 'source_reconstruction' && (
          <div className="space-y-4">
            <SectionBox title="Source Reconstruction">
              <div className="font-mono text-[11px] text-zinc-200">
                Backward Lagrangian Drift Physics
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5">
                Stochastic ensemble driven by wind leeway + surface currents
              </div>
            </SectionBox>

            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/10 space-y-2">
              <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold">
                Reconstruction Horizon
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="p-2 rounded bg-white/5">
                  <div className="text-zinc-500 text-[10px]">Horizon</div>
                  <div className="text-zinc-200 font-bold">48 Hours</div>
                </div>
                <div className="p-2 rounded bg-white/5">
                  <div className="text-zinc-500 text-[10px]">Ensemble Size</div>
                  <div className="text-zinc-200 font-bold">48 Particles</div>
                </div>
                <div className="p-2 rounded bg-white/5">
                  <div className="text-zinc-500 text-[10px]">Wind Leeway</div>
                  <div className="text-zinc-200 font-bold">3.1%</div>
                </div>
                <div className="p-2 rounded bg-white/5">
                  <div className="text-zinc-500 text-[10px]">Diffusion (Kh)</div>
                  <div className="text-zinc-200 font-bold">2.5 m²/s</div>
                </div>
              </div>
            </div>

            <CollapsibleParams title="Corridor Coordinates" isExpanded={paramsExpanded} onToggle={() => setParamsExpanded(!paramsExpanded)}>
              <ParamRow label="Estimated Origin" value="T - 18h to T - 26h" />
              <ParamRow label="Latitude Range" value="55.08° N – 55.19° N" />
              <ParamRow label="Longitude Range" value="5.52° E – 5.71° E" />
              <ParamRow label="Corridor Area" value="38.4 km²" />
            </CollapsibleParams>

            <ResultBox
              label="Reconstruction Result"
              highlight="SOURCE CORRIDOR DELINEATED"
              subtext="SOURCE HYPOTHESIS: Estimated release window between 18:00 and 02:00 UTC"
              status="SIMULATED HINDCAST"
              confidence="78%"
            />
          </div>
        )}

        {/* --- STAGE 08: AIS CORRELATION --- */}
        {currentStep.id === 'ais_correlation' && (
          <div className="space-y-4">
            <SectionBox title="Traffic Funneling">
              <div className="font-mono text-[11px] text-zinc-200">
                Spatio-Temporal Traffic Intersection
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5">
                Historical AIS records query across corridor bounding box
              </div>
            </SectionBox>

            {/* Candidate Reduction Flow */}
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/10 space-y-2">
              <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold">
                Candidate Funnel Reduction
              </div>
              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between items-center text-zinc-400">
                  <span>Considered in Sector</span>
                  <span className="font-bold text-white">47</span>
                </div>
                <div className="text-zinc-600 pl-2">↓</div>
                <div className="flex justify-between items-center text-zinc-300">
                  <span>Spatially Compatible</span>
                  <span className="font-bold text-white">8</span>
                </div>
                <div className="text-zinc-600 pl-2">↓</div>
                <div className="flex justify-between items-center text-cyan-300">
                  <span>Temporally Compatible</span>
                  <span className="font-bold text-cyan-300">5</span>
                </div>
                <div className="text-zinc-600 pl-2">↓</div>
                <div className="flex justify-between items-center text-amber-300">
                  <span>Trajectory Compatible</span>
                  <span className="font-bold text-amber-300">3</span>
                </div>
                <div className="text-zinc-600 pl-2">↓</div>
                <div className="flex justify-between items-center text-rose-300 bg-rose-500/10 p-1.5 rounded border border-rose-500/30">
                  <span className="font-bold">High-Priority Candidates</span>
                  <span className="font-bold text-rose-400">2</span>
                </div>
              </div>
            </div>

            {/* Candidate Selector */}
            <div className="space-y-2">
              <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold">
                Select Candidate
              </div>
              {candidates.slice(0, 3).map((cand, idx) => (
                <button
                  key={cand.mmsi}
                  onClick={() => onSelectCandidate(cand)}
                  className={`w-full p-2.5 rounded-lg text-left transition-all border flex items-center justify-between cursor-pointer ${
                    selectedCandidate?.mmsi === cand.mmsi
                      ? 'bg-amber-500/15 border-amber-500/50 text-white'
                      : 'bg-white/[0.02] border-white/10 text-zinc-400 hover:border-white/20'
                  }`}
                >
                  <div>
                    <div className="font-bold font-mono text-[11px] text-zinc-200">
                      {cand.name}
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono">
                      {cand.vesselType} · IMO {cand.imo || 'N/A'}
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-[11px] font-bold text-amber-400">
                      Score: {cand.attributionScore}%
                    </div>
                    <div className="text-[9px] text-zinc-500">Rank #{idx + 1}</div>
                  </div>
                </button>
              ))}
            </div>

            <ResultBox
              label="Correlation Outcome"
              highlight="2 High-Priority Candidates"
              subtext="Lead candidate intersects corridor at estimated discharge hour"
              status="PROTOTYPE CORRELATION"
              confidence="84%"
            />
          </div>
        )}

        {/* --- STAGE 09: ATTRIBUTION --- */}
        {currentStep.id === 'attribution' && (
          <div className="space-y-4">
            <SectionBox title="Vessel of Interest">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-mono text-sm font-bold text-amber-300">
                    {selectedCandidate?.name || 'NORDIC POLARIS'}
                  </div>
                  <div className="text-[10px] text-zinc-400 font-mono">
                    {selectedCandidate?.vesselType || 'Crude Oil Tanker'} · MMSI{' '}
                    {selectedCandidate?.mmsi || '257004000'} · IMO{' '}
                    {selectedCandidate?.imo || '9321483'}
                  </div>
                </div>
                <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono text-[10px] font-bold">
                  RANK #1
                </span>
              </div>
            </SectionBox>

            {/* Attribution Factor Breakdown */}
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/10 space-y-2.5">
              <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold">
                Evidence Factor Breakdown
              </div>
              <div className="space-y-2 font-mono text-[11px]">
                <FactorRow label="Spatial Proximity" score={91} />
                <FactorRow label="Temporal Compatibility" score={84} />
                <FactorRow label="Trajectory Consistency" score={88} />
                <FactorRow label="Drift Compatibility" score={82} />
                <FactorRow label="AIS Continuity (Gap)" score={73} isWarning />
              </div>
            </div>

            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/10 space-y-1.5">
              <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold">
                Supporting Evidence
              </div>
              <ul className="space-y-1 text-[11px] text-zinc-300 font-mono">
                <li className="flex items-center gap-1.5">
                  <span className="text-emerald-400">✓</span> Track intersects source corridor
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-emerald-400">✓</span> Timing compatible with drift rate
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-emerald-400">✓</span> Trajectory parallel to slick spine
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-amber-400">!</span> 42-min AIS gap during corridor transit
                </li>
              </ul>
            </div>

            <ResultBox
              label="Attribution Decision"
              highlight="PRIORITIZE FOR INVESTIGATION"
              subtext="Overall composite affinity: 84%. Investigative hypothesis requiring analyst verification."
              status="PROTOTYPE ATTRIBUTION"
              confidence="84%"
            />
          </div>
        )}

        {/* --- STAGE 10: COUNTERFACTUAL --- */}
        {currentStep.id === 'counterfactual' && (
          <div className="space-y-4">
            <SectionBox title="Hypothesis Test Question">
              <div className="text-zinc-200 italic leading-snug">
                &ldquo;Could a plausible release along this vessel&apos;s trajectory reproduce the observed satellite slick?&rdquo;
              </div>
              <div className="text-[10px] text-zinc-500 mt-1 font-mono">
                Forward plume dispersion vs observed radar geometry
              </div>
            </SectionBox>

            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/10 space-y-2.5">
              <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold">
                Consistency Validation Metrics
              </div>
              <div className="space-y-2 font-mono text-[11px]">
                <FactorRow label="Spatial Consistency" score={81} />
                <FactorRow label="Temporal Consistency" score={86} />
                <FactorRow label="Shape / Morphology" score={79} />
                <FactorRow label="Overall Consistency" score={83} />
              </div>
            </div>

            <CollapsibleParams title="Hypothesis Simulation Parameters" isExpanded={paramsExpanded} onToggle={() => setParamsExpanded(!paramsExpanded)}>
              <ParamRow label="Assumed Speed" value="12.4 knots" />
              <ParamRow label="Assumed Course" value="074°" />
              <ParamRow label="Hypothetical Release" value="45 m³/h discharge rate" />
              <ParamRow label="Weathering Decay" value="Evaporation 28% in 24h" />
            </CollapsibleParams>

            <ResultBox
              label="Counterfactual Outcome"
              highlight="HYPOTHESIS SUPPORTED"
              subtext="Simulated forward plume matches satellite slick orientation and elongation within 83% tolerance."
              status="PROTOTYPE COUNTERFACTUAL"
              confidence="83%"
            />
          </div>
        )}

        {/* --- STAGE 11: IMPACT --- */}
        {currentStep.id === 'impact_prioritization' && (() => {
          const forecastState = getForecastState(impactHours);
          return (
            <div className="space-y-4">
                <SectionBox title="Forecast Plume Drift">
                  <div className="font-mono text-[11px] text-zinc-200">
                    48-Hour Forward Lagrangian Dispersion Model
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">
                    Forcing: CMEMS Surface Current (0.35 m/s) + ERA5 Wind Leeway
                  </div>
                </SectionBox>

                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/10 space-y-2">
                  <div className="flex items-center justify-between pb-1 border-b border-white/5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                      Exposure Matrix
                    </span>
                    <span className="font-mono text-[11px] text-cyan-300 font-bold">
                      T + {forecastState.hours.toFixed(0)}h
                    </span>
                  </div>
                  <div className="space-y-1.5 font-mono text-[11px]">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Plume Surface Area</span>
                      <span className="font-bold text-white">{forecastState.areaKm2.toFixed(1)} km²</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Drift Trajectory Offset</span>
                      <span className="font-bold text-zinc-200">{forecastState.driftDistanceNm.toFixed(1)} nm</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Time to Shoreline Impact</span>
                      {forecastState.isShorelineCritical ? (
                        <span className="font-bold text-rose-400 animate-pulse">
                          IMPACT REACHED (0h)
                        </span>
                      ) : (
                        <span className="font-bold text-amber-300">
                          {forecastState.timeToShorelineHours} Hours
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Coastal Exposure</span>
                      <span
                        className={`font-bold ${
                          forecastState.coastalExposureLevel === 'CRITICAL'
                            ? 'text-rose-400'
                            : forecastState.coastalExposureLevel === 'HIGH'
                            ? 'text-amber-400'
                            : 'text-zinc-300'
                        }`}
                      >
                        {forecastState.coastalExposureLevel}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Ecological Sensitivity</span>
                      <span className="font-bold text-rose-400">
                        {forecastState.ecologicalSensitivityLevel}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Fisheries Exposure</span>
                      <span className="font-bold text-sky-400">
                        {forecastState.fisheriesLevel}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Population Exposure</span>
                      <span className="font-bold text-zinc-400">
                        {forecastState.populationLevel}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/10 space-y-2">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold">
                    Recommended Operational Actions
                  </div>
                  <ul className="space-y-1 text-[11px] text-zinc-300 font-mono">
                    <li className="flex items-center gap-1.5">
                      <span className="text-cyan-400">1.</span> Target vessel physical port inspection
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-cyan-400">2.</span> Request optical / drone SAR confirmation
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-cyan-400">3.</span> Pre-alert Wadden Sea containment units
                    </li>
                  </ul>
                </div>

                <ResultBox
                  label="Triage Assessment"
                  highlight={
                    forecastState.isShorelineCritical
                      ? 'RESPONSE PRIORITY: CRITICAL (IMMEDIATE DEPLOYMENT)'
                      : 'RESPONSE PRIORITY: HIGH'
                  }
                  subtext={
                    forecastState.isShorelineCritical
                      ? 'Shoreline contact threshold reached on East Frisian barrier islands. Tier-2 regional response active.'
                      : 'Ecologically sensitive coastal wetlands threatened within 31-hour horizon.'
                  }
                  status="DERIVED RESULT"
                  confidence="88%"
                />
              </div>
            );
          })()}

        {/* --- STAGE 12: REPORT --- */}
        {currentStep.id === 'report' && (
          <div className="space-y-4">
            <SectionBox title="Investigation Audit Summary">
              <div className="font-mono text-[11px] text-zinc-200">
                Case AT-2018-0004 · Complete Evidence Chain
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5">
                10 linked evidentiary nodes verified and cryptographically signed
              </div>
            </SectionBox>

            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/10 space-y-2 font-mono text-[11px]">
              <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                Dossier Metadata
              </div>
              <ParamRow label="Incident ID" value="AT-2018-0004" />
              <ParamRow label="Observed Target" value="German Bight Slick" />
              <ParamRow label="Detection Conf." value="87% (ConvNeXt-Tiny)" />
              <ParamRow label="Lead Vessel" value="NORDIC POLARIS" />
              <ParamRow label="Attribution Score" value="84%" />
              <ParamRow label="Counterfactual" value="Supported (83%)" />
              <ParamRow label="Impact Priority" value="HIGH (31h)" />
            </div>

            <button
              onClick={onOpenReport}
              className="w-full py-3 px-4 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-cyan-500/20"
            >
              <FileText className="w-4 h-4" />
              <span>GENERATE OFFICIAL DOSSIER REPORT</span>
            </button>

            <div className="p-2.5 rounded bg-white/[0.02] border border-white/10 text-[10px] font-mono text-zinc-500 text-center leading-relaxed">
              ATTRIBUTION IS AN INVESTIGATIVE HYPOTHESIS AND REQUIRES ANALYST VERIFICATION.
            </div>
          </div>
        )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 3. INSPECTOR FOOTER: NEXT STEP ADVANCEMENT */}
      <div className="p-3 border-t border-white/10 bg-[#080C14] flex items-center justify-between">
        <button
          onClick={onPrevStep}
          disabled={currentStepIndex === 0}
          className="px-3 py-2 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 text-zinc-400 hover:text-white font-mono text-xs transition-all cursor-pointer"
        >
          ← PREV
        </button>

        {currentStepIndex < totalSteps - 1 ? (
          <button
            onClick={onNextStep}
            className="flex-1 ml-2 py-2 px-3 rounded bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 hover:text-cyan-200 font-mono text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <span>NEXT STAGE</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            onClick={onOpenReport}
            className="flex-1 ml-2 py-2 px-3 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>VIEW CASE REPORT</span>
          </button>
        )}
      </div>
    </aside>
  );
};

// Reusable Small Components for Uniform Structure

const SectionBox: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/10 space-y-1">
    <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold">
      {title}
    </div>
    <div className="text-zinc-300">{children}</div>
  </div>
);

const ParamRow: React.FC<{
  label: string;
  value: string;
  isCode?: boolean;
}> = ({ label, value, isCode }) => (
  <div className="flex items-center justify-between text-[11px] font-mono border-b border-white/5 pb-1 last:border-0 last:pb-0">
    <span className="text-zinc-500">{label}</span>
    <span className={`text-zinc-200 ${isCode ? 'text-[10px] text-cyan-300 truncate max-w-[200px]' : ''}`}>
      {value}
    </span>
  </div>
);

const CollapsibleParams: React.FC<{
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}> = ({ title, isExpanded, onToggle, children }) => (
  <div className="rounded-lg bg-white/[0.02] border border-white/10 overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full px-3 py-2 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-zinc-400 hover:text-zinc-200 font-semibold cursor-pointer"
    >
      <span>{title}</span>
      {isExpanded ? (
        <ChevronDown className="w-3 h-3 text-zinc-500" />
      ) : (
        <ChevronRight className="w-3 h-3 text-zinc-500" />
      )}
    </button>
    {isExpanded && <div className="px-3 pb-3 space-y-1.5">{children}</div>}
  </div>
);

const ResultBox: React.FC<{
  label: string;
  highlight: string;
  subtext: string;
  status?: string;
  confidence?: string;
}> = ({ label, highlight, subtext, status, confidence }) => (
  <div className="p-3.5 rounded-lg bg-cyan-950/20 border border-cyan-500/30 space-y-2">
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400/80 font-bold">
        {label}
      </span>
      {confidence && (
        <span className="font-mono text-[11px] font-bold text-cyan-300">
          CONF: {confidence}
        </span>
      )}
    </div>
    <div className="text-sm font-bold text-white tracking-wide font-mono">
      {highlight}
    </div>
    <div className="text-[11px] text-zinc-400 leading-relaxed font-sans">
      {subtext}
    </div>
    {status && (
      <div className="text-[9px] font-mono text-cyan-400/70 pt-1 border-t border-cyan-500/20 uppercase tracking-wider">
        STATUS: {status}
      </div>
    )}
  </div>
);

const FactorRow: React.FC<{
  label: string;
  score: number;
  isWarning?: boolean;
}> = ({ label, score, isWarning }) => (
  <div>
    <div className="flex justify-between items-center text-[11px] mb-1">
      <span className={isWarning ? 'text-amber-300' : 'text-zinc-400'}>{label}</span>
      <span className={`font-bold ${isWarning ? 'text-amber-400' : 'text-white'}`}>
        {score} / 100
      </span>
    </div>
    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
      <div
        className={`h-full rounded-full ${
          isWarning ? 'bg-amber-400' : score > 85 ? 'bg-cyan-400' : 'bg-blue-400'
        }`}
        style={{ width: `${score}%` }}
      />
    </div>
  </div>
);
