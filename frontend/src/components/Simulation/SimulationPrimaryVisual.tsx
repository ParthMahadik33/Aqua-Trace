'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  SimulationStepId,
  SarMetadata,
  MetoceanContext,
  SourceReconstructionModel,
  CandidateVessel,
  CounterfactualScenario,
  ImpactPrioritization,
} from '@/types/simulation';
import { SimulationMapWrapper } from './SimulationMapWrapper';
import { ImpactForecastControls } from './ImpactForecastControls';
import {
  Radio,
  Layers,
  Crosshair,
  Filter,
  Ship,
  Sparkles,
  GitCompare,
  FileCheck,
  AlertCircle,
  Clock,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import {
  CASE_0004_AIS_FUNNEL,
  CASE_0004_COUNTERFACTUAL_TEST,
} from '@/data/case0004Data';

interface SimulationPrimaryVisualProps {
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
  onChangeOverlayMode: (mode: 'none' | 'vv' | 'composite' | 'mask' | 'overlay') => void;
  overlayOpacity: number;
  onChangeOverlayOpacity: (opacity: number) => void;
  onOpenReport: () => void;
  onOpenEvidenceGraph?: () => void;
  impactHours?: number;
  onChangeImpactHours?: (hours: number) => void;
  isImpactPlaying?: boolean;
  onToggleImpactPlay?: () => void;
  impactLayers?: {
    coastalExposure: boolean;
    ecological: boolean;
    fisheries: boolean;
    population: boolean;
  };
  onToggleImpactLayer?: (
    layerKey: 'coastalExposure' | 'ecological' | 'fisheries' | 'population'
  ) => void;
}

export const SimulationPrimaryVisual: React.FC<SimulationPrimaryVisualProps> = ({
  currentStepId,
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
  onOpenReport,
  onOpenEvidenceGraph,
  impactHours,
  onChangeImpactHours,
  isImpactPlaying,
  onToggleImpactPlay,
  impactLayers,
  onToggleImpactLayer,
}) => {
  // Local state for Stage 02 SAR view modes
  const [sarViewMode, setSarViewMode] = useState<'composite' | 'vv' | 'panel'>('composite');
  // Local state for Stage 03 Preprocessing stages
  const [prepStage, setPrepStage] = useState<'raw' | 'normalized' | 'enhanced'>('enhanced');
  // Local state for Stage 05 Segmentation display
  const [segMode, setSegMode] = useState<'overlay' | 'mask'>('overlay');
  // Local state for Stage 10 Counterfactual simulation toggle
  const [isCounterfactualRunning, setIsCounterfactualRunning] = useState(false);

  // Local state for Stage 11 Impact Prioritization (fallback if uncontrolled)
  const [localImpactHours, setLocalImpactHours] = useState<number>(0);
  const [localIsImpactPlaying, setLocalIsImpactPlaying] = useState<boolean>(false);
  const [localImpactLayers, setLocalImpactLayers] = useState({
    coastalExposure: true,
    ecological: false,
    fisheries: false,
    population: false,
  });

  const effectiveImpactHours = impactHours ?? localImpactHours;
  const setEffectiveImpactHours = onChangeImpactHours ?? setLocalImpactHours;
  const effectiveIsImpactPlaying = isImpactPlaying ?? localIsImpactPlaying;
  const toggleEffectiveImpactPlay =
    onToggleImpactPlay ?? (() => setLocalIsImpactPlaying(!localIsImpactPlaying));
  const effectiveImpactLayers = impactLayers ?? localImpactLayers;
  const toggleEffectiveImpactLayer =
    onToggleImpactLayer ??
    ((key: 'coastalExposure' | 'ecological' | 'fisheries' | 'population') => {
      setLocalImpactLayers((prev) => ({ ...prev, [key]: !prev[key] }));
    });

  // Determine which type of primary visual to display:
  // MAP STAGES: 01 (surveillance), 06 (environmental), 07 (source_reconstruction), 08 (ais_correlation), 09 (attribution), 11 (impact_prioritization)
  const isMapStage =
    currentStepId === 'surveillance' ||
    currentStepId === 'environmental' ||
    currentStepId === 'source_reconstruction' ||
    currentStepId === 'ais_correlation' ||
    currentStepId === 'attribution' ||
    currentStepId === 'impact_prioritization';

  return (
    <div className="relative w-full h-full bg-[#05070D] overflow-hidden flex flex-col select-none">
      {/* ============================================================ */}
      {/* 1. MAP-BASED STAGES (Surveillance, Metocean, Hindcast, AIS, Attribution, Impact) */}
      {/* ============================================================ */}
      {isMapStage && (
        <div className="relative w-full h-full">
          <SimulationMapWrapper
            currentStepId={currentStepId}
            sarMetadata={sarMetadata}
            metocean={metocean}
            sourceRecon={sourceRecon}
            candidates={candidates}
            counterfactual={counterfactual}
            impact={impact}
            selectedCandidate={selectedCandidate}
            onSelectCandidate={onSelectCandidate}
            activeOverlayMode={activeOverlayMode}
            overlayOpacity={overlayOpacity}
            forecastHours={effectiveImpactHours}
            forecastLayers={effectiveImpactLayers}
          />

          {/* Stage 01: Surveillance Incoming Observation Event Banner */}
          {currentStepId === 'surveillance' && (
            <div className="absolute top-4 left-4 z-[400] max-w-md p-3.5 rounded-xl bg-[#080C14]/95 border border-cyan-500/40 text-xs font-mono shadow-2xl backdrop-blur-md">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2 text-cyan-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span>NEW ACQUISITION INGESTED</span>
                </div>
                <span className="text-[10px] text-zinc-400">HISTORICAL ARCHIVE</span>
              </div>
              <div className="mt-2.5 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-zinc-500">PLATFORM: </span>
                  <span className="text-white font-semibold">{sarMetadata.platform}</span>
                </div>
                <div>
                  <span className="text-zinc-500">TIMESTAMP: </span>
                  <span className="text-zinc-200">{sarMetadata.acquisitionTimestamp.replace('T', ' ')} UTC</span>
                </div>
                <div>
                  <span className="text-zinc-500">ORBIT: </span>
                  <span className="text-zinc-300">#{sarMetadata.orbitNumber} ({sarMetadata.passDirection})</span>
                </div>
                <div>
                  <span className="text-zinc-500">MODE: </span>
                  <span className="text-cyan-400">IW / GRDH (VV+VH)</span>
                </div>
              </div>
              <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-zinc-400">
                <span>SECTOR: German Bight EEZ</span>
                <span className="text-amber-400 font-bold">ANOMALY DETECTED</span>
              </div>
            </div>
          )}

          {/* Stage 08: AIS Correlation Candidate Reduction HUD Strip */}
          {currentStepId === 'ais_correlation' && (
            <div className="absolute top-4 left-4 z-[400] flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-[#080C14]/95 border border-white/15 text-xs font-mono shadow-2xl backdrop-blur-md">
              <span className="text-zinc-500 flex items-center gap-1 font-bold">
                <Filter className="w-3.5 h-3.5 text-cyan-400" />
                FILTERING FUNNEL:
              </span>
              {CASE_0004_AIS_FUNNEL.map((f, i) => (
                <div
                  key={f.stepNumber}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] border ${
                    i === CASE_0004_AIS_FUNNEL.length - 1
                      ? 'bg-amber-500/15 border-amber-400 text-amber-300 font-bold'
                      : 'bg-white/5 border-white/10 text-zinc-300'
                  }`}
                >
                  <span className="text-zinc-500">{f.title.split(' ')[0]}:</span>
                  <span>{f.count}</span>
                  {i < CASE_0004_AIS_FUNNEL.length - 1 && (
                    <span className="text-zinc-600 ml-1">→</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Stage 09: Vessel of Interest Target Telemetry Overlay */}
          {currentStepId === 'attribution' && selectedCandidate && (
            <div className="absolute top-4 left-4 z-[400] p-3.5 rounded-xl bg-[#080C14]/95 border border-amber-500/40 text-xs font-mono shadow-2xl backdrop-blur-md max-w-sm">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2 text-amber-400 font-bold">
                  <Ship className="w-4 h-4 text-amber-400" />
                  <span>VESSEL OF INTEREST</span>
                </div>
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                  SCORE 84%
                </span>
              </div>
              <div className="mt-2 text-white font-bold text-sm tracking-wide">
                {selectedCandidate.name}
              </div>
              <div className="mt-1 text-[11px] text-zinc-400">
                {selectedCandidate.vesselType} · MMSI {selectedCandidate.mmsi}
              </div>
              <div className="mt-2 pt-2 border-t border-white/5 text-[11px] text-zinc-300 space-y-1">
                <div>
                  <span className="text-zinc-500">Closest Approach: </span>
                  <span className="text-red-400 font-semibold">{selectedCandidate.closestApproachDistanceNm} nm</span> @ {selectedCandidate.closestApproachTimeUtc.slice(11, 16)} UTC
                </div>
                <div>
                  <span className="text-zinc-500">Speed Anomaly: </span>
                  <span className="text-amber-300">-{selectedCandidate.speedAnomalyDipKn} kn dip</span> during transit
                </div>
              </div>
            </div>
          )}

          {/* Stage 07: Hindcast Simulation HUD */}
          {currentStepId === 'source_reconstruction' && (
            <div className="absolute top-4 left-4 z-[400] flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-[#080C14]/95 border border-emerald-500/30 text-xs font-mono shadow-2xl backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-zinc-300">BACKWARD HINDCAST:</span>
              <span className="font-bold text-emerald-400">48 PARTICLES / T-48h</span>
              <span className="text-zinc-600">|</span>
              <span className="text-zinc-400">FORCING: ERA5 + GLORYS</span>
            </div>
          )}

          {/* Stage 11: Impact Prioritization Forecast Timeline & Exposure Controls */}
          {currentStepId === 'impact_prioritization' && (
            <ImpactForecastControls
              forecastHours={effectiveImpactHours}
              onForecastHoursChange={setEffectiveImpactHours}
              isPlaying={effectiveIsImpactPlaying}
              onTogglePlay={toggleEffectiveImpactPlay}
              layers={effectiveImpactLayers}
              onToggleLayer={toggleEffectiveImpactLayer}
            />
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. SAR IMAGERY STAGE 02: HIGH-RESOLUTION SAR ACQUISITION */}
      {/* ============================================================ */}
      {currentStepId === 'sar_acquisition' && (
        <div className="relative w-full h-full flex flex-col bg-[#05070D]">
          {/* Top Image Mode Selector Bar */}
          <div className="h-12 px-6 bg-[#080C14] border-b border-white/10 flex items-center justify-between font-mono text-xs z-10">
            <div className="flex items-center gap-3">
              <span className="font-bold text-white tracking-wider">SENTINEL-1A SAR OBSERVATION</span>
              <span className="text-zinc-600">/</span>
              <span className="text-cyan-400">RAW RADAR ASSET</span>
            </div>

            {/* Toggle Modes */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setSarViewMode('composite')}
                className={`px-3 py-1 rounded-md border text-[11px] font-semibold transition-all cursor-pointer ${
                  sarViewMode === 'composite'
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-sm'
                    : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                }`}
              >
                VH / COMPOSITE
              </button>
              <button
                onClick={() => setSarViewMode('vv')}
                className={`px-3 py-1 rounded-md border text-[11px] font-semibold transition-all cursor-pointer ${
                  sarViewMode === 'vv'
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-sm'
                    : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                }`}
              >
                VV POLARIZATION
              </button>
              <button
                onClick={() => setSarViewMode('panel')}
                className={`px-3 py-1 rounded-md border text-[11px] font-semibold transition-all cursor-pointer ${
                  sarViewMode === 'panel'
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-sm'
                    : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                }`}
              >
                DIAGNOSTIC PANEL
              </button>
            </div>
          </div>

          {/* Large Image Canvas */}
          <div className="relative flex-1 flex items-center justify-center p-6 overflow-hidden">
            <img
              src={
                sarViewMode === 'vv'
                  ? '/prototype/case_0004/part1_oil_00004_vv.png'
                  : sarViewMode === 'panel'
                  ? '/prototype/case_0004/part1_oil_00004_panel.png'
                  : '/prototype/case_0004/part1_oil_00004_composite.png'
              }
              alt="Sentinel-1A SAR Observation"
              className="max-w-full max-h-full object-contain rounded-lg border border-white/15 shadow-2xl"
            />

            {/* Corner Coordinates Overlay */}
            <div className="absolute top-8 left-8 px-2.5 py-1 rounded bg-[#070A10]/90 border border-white/15 text-[10px] font-mono text-zinc-400">
              55°20&apos;N, 005°53&apos;E (GERMAN BIGHT)
            </div>
            <div className="absolute bottom-8 right-8 px-2.5 py-1 rounded bg-[#070A10]/90 border border-cyan-500/30 text-[10px] font-mono text-cyan-400">
              C-BAND SAR // 2048 × 2048 PX
            </div>
          </div>

          {/* Bottom Concise Metadata Bar */}
          <div className="h-10 px-6 bg-[#080C14] border-t border-white/10 flex items-center justify-between font-mono text-[11px] text-zinc-400 z-10">
            <span>PRODUCT: {sarMetadata.productId}</span>
            <span>POLARIZATIONS: VV + VH</span>
            <span>ACQUIRED: 03 AUG 2018 17:25:51 UTC</span>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. PREPROCESSING STAGE 03: RADIOMETRIC CALIBRATION & NOISE REMOVAL */}
      {/* ============================================================ */}
      {currentStepId === 'sar_processing' && (
        <div className="relative w-full h-full flex flex-col bg-[#05070D]">
          {/* Top Bar */}
          <div className="h-12 px-6 bg-[#080C14] border-b border-white/10 flex items-center justify-between font-mono text-xs z-10">
            <div className="flex items-center gap-3">
              <span className="font-bold text-white tracking-wider">PREPROCESSING WORKFLOW</span>
              <span className="text-zinc-600">/</span>
              <span className="text-cyan-400">PROTOTYPE PIPELINE</span>
            </div>

            {/* Transformation Steps */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPrepStage('raw')}
                className={`px-3 py-1 rounded-md border text-[11px] font-semibold transition-all cursor-pointer ${
                  prepStage === 'raw'
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                    : 'bg-white/5 border-white/10 text-zinc-400'
                }`}
              >
                1. RAW
              </button>
              <span className="text-zinc-600">→</span>
              <button
                onClick={() => setPrepStage('normalized')}
                className={`px-3 py-1 rounded-md border text-[11px] font-semibold transition-all cursor-pointer ${
                  prepStage === 'normalized'
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                    : 'bg-white/5 border-white/10 text-zinc-400'
                }`}
              >
                2. NORMALIZED
              </button>
              <span className="text-zinc-600">→</span>
              <button
                onClick={() => setPrepStage('enhanced')}
                className={`px-3 py-1 rounded-md border text-[11px] font-semibold transition-all cursor-pointer ${
                  prepStage === 'enhanced'
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                    : 'bg-white/5 border-white/10 text-zinc-400'
                }`}
              >
                3. ENHANCED
              </button>
            </div>
          </div>

          {/* Large Transformation Image Display */}
          <div className="relative flex-1 flex items-center justify-center p-6 overflow-hidden">
            <img
              src={
                prepStage === 'raw'
                  ? '/prototype/case_0004/part1_oil_00004_vv.png'
                  : prepStage === 'normalized'
                  ? '/prototype/case_0004/part1_oil_00004_composite.png'
                  : '/prototype/case_0004/part1_oil_00004_composite.png'
              }
              alt="Preprocessing Transformation"
              className={`max-w-full max-h-full object-contain rounded-lg border border-white/15 shadow-2xl transition-all duration-500 ${
                prepStage === 'raw'
                  ? 'contrast-75 brightness-90'
                  : prepStage === 'normalized'
                  ? 'contrast-100'
                  : 'contrast-125'
              }`}
            />

            {/* Transformation Info Badge */}
            <div className="absolute top-8 left-8 p-3 rounded-lg bg-[#070A10]/90 border border-white/15 text-xs font-mono max-w-xs backdrop-blur-md">
              <div className="text-cyan-400 font-bold uppercase text-[11px]">
                {prepStage === 'raw'
                  ? 'Raw Sigma-0 Backscatter'
                  : prepStage === 'normalized'
                  ? 'Radiometrically Calibrated'
                  : 'Speckle Filtered & Contrast Normalized'}
              </div>
              <p className="text-zinc-400 text-[10px] mt-1 leading-normal font-sans">
                {prepStage === 'raw'
                  ? 'Unprocessed amplitude levels with thermal noise gradient across swath range.'
                  : prepStage === 'normalized'
                  ? 'NESZ thermal noise subtracted; incidence angle radiometric correction applied.'
                  : 'Lee-Sigma adaptive speckle filter suppressing radar clutter around anomaly edges.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. DETECTION STAGE 04: CANDIDATE ANOMALY CLASSIFICATION */}
      {/* ============================================================ */}
      {currentStepId === 'detection' && (
        <div className="relative w-full h-full flex flex-col bg-[#05070D]">
          {/* Top Bar */}
          <div className="h-12 px-6 bg-[#080C14] border-b border-white/10 flex items-center justify-between font-mono text-xs z-10">
            <div className="flex items-center gap-3">
              <span className="font-bold text-white tracking-wider">DETECTION ENGINE</span>
              <span className="text-zinc-600">/</span>
              <span className="text-cyan-400">CONVNEXT-TINY BACKBONE</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-purple-500/15 border border-purple-500/40 text-[10px] text-purple-300 font-bold uppercase">
                MODEL ESTIMATE
              </span>
            </div>
          </div>

          {/* Large Canvas with Reticle Around Anomaly */}
          <div className="relative flex-1 flex items-center justify-center p-6 overflow-hidden">
            <div className="relative inline-block">
              <img
                src="/prototype/case_0004/part1_oil_00004_composite.png"
                alt="Detection Anomaly Composite"
                className="max-w-full max-h-[72vh] object-contain rounded-lg border border-white/15 shadow-2xl"
              />

              {/* Analytical Targeting Reticle Around Oil Slick */}
              <div
                className="absolute border-2 border-cyan-400 rounded shadow-[0_0_20px_rgba(6,182,212,0.4)] pointer-events-none"
                style={{
                  top: '32%',
                  left: '42%',
                  width: '32%',
                  height: '46%',
                }}
              >
                {/* Crosshair Markers */}
                <div className="absolute -top-1.5 -left-1.5 w-3 h-3 border-t-2 border-l-2 border-cyan-300" />
                <div className="absolute -top-1.5 -right-1.5 w-3 h-3 border-t-2 border-r-2 border-cyan-300" />
                <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 border-b-2 border-l-2 border-cyan-300" />
                <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 border-b-2 border-r-2 border-cyan-300" />

                {/* Classification Callout Badge */}
                <div className="absolute -top-7 left-0 px-2 py-0.5 rounded bg-cyan-500 text-[#070A10] font-mono text-[10px] font-black tracking-wider flex items-center gap-1 shadow-lg">
                  <Crosshair className="w-3 h-3" />
                  <span>CANDIDATE SLICK: 87% CONFIDENCE</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Probability Bar */}
          <div className="h-10 px-6 bg-[#080C14] border-t border-white/10 flex items-center justify-between font-mono text-xs z-10">
            <div className="flex items-center gap-4 text-[11px]">
              <span className="text-zinc-500">PREDICTED CLASSES:</span>
              <span className="text-cyan-400 font-bold">OIL: 0.87</span>
              <span className="text-zinc-600">|</span>
              <span className="text-zinc-400">LOOKALIKE: 0.09</span>
              <span className="text-zinc-600">|</span>
              <span className="text-zinc-500">NO_OIL: 0.04</span>
            </div>
            <span className="text-[10px] text-zinc-500">STATUS: POSSIBLE OIL-LIKE ANOMALY</span>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. SEGMENTATION STAGE 05: SLICK DELINEATION MASK & GEOMETRY */}
      {/* ============================================================ */}
      {currentStepId === 'segmentation' && (
        <div className="relative w-full h-full flex flex-col bg-[#05070D]">
          {/* Top Bar */}
          <div className="h-12 px-6 bg-[#080C14] border-b border-white/10 flex items-center justify-between font-mono text-xs z-10">
            <div className="flex items-center gap-3">
              <span className="font-bold text-white tracking-wider">SEMANTIC SEGMENTATION</span>
              <span className="text-zinc-600">/</span>
              <span className="text-purple-400">SLICK DELINEATION</span>
            </div>

            {/* Mode Toggle */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setSegMode('overlay')}
                className={`px-3 py-1 rounded-md border text-[11px] font-semibold transition-all cursor-pointer ${
                  segMode === 'overlay'
                    ? 'bg-purple-500/20 border-purple-400 text-purple-300'
                    : 'bg-white/5 border-white/10 text-zinc-400'
                }`}
              >
                DELINEATION OVERLAY
              </button>
              <button
                onClick={() => setSegMode('mask')}
                className={`px-3 py-1 rounded-md border text-[11px] font-semibold transition-all cursor-pointer ${
                  segMode === 'mask'
                    ? 'bg-purple-500/20 border-purple-400 text-purple-300'
                    : 'bg-white/5 border-white/10 text-zinc-400'
                }`}
              >
                BINARY PIXEL MASK
              </button>
            </div>
          </div>

          {/* Large Segmentation View */}
          <div className="relative flex-1 flex items-center justify-center p-6 overflow-hidden">
            <img
              src={
                segMode === 'mask'
                  ? '/prototype/case_0004/part1_oil_00004_slick_mask.png'
                  : '/prototype/case_0004/part1_oil_00004_slick_overlay.png'
              }
              alt="Slick Segmentation"
              className="max-w-full max-h-[72vh] object-contain rounded-lg border border-purple-500/30 shadow-2xl"
            />

            {/* Floating Geometry Badge */}
            <div className="absolute bottom-8 left-8 p-3 rounded-lg bg-[#080C14]/90 border border-purple-500/40 text-xs font-mono backdrop-blur-md space-y-1">
              <div className="text-purple-300 font-bold uppercase text-[11px]">
                SLICK GEOMETRIC PROFILE
              </div>
              <div className="text-zinc-300 text-[10px]">
                Pixel Area: <strong className="text-white">44,049 pixels</strong> (4.41 km²)
              </div>
              <div className="text-zinc-300 text-[10px]">
                Bounding Box: Row 566–1573, Col 941–1405
              </div>
              <div className="text-zinc-300 text-[10px]">
                Centroid: 55.244297°N, 5.885555°E
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 6. COUNTERFACTUAL STAGE 10: HYPOTHESIS TEST COMPARISON */}
      {/* ============================================================ */}
      {currentStepId === 'counterfactual' && (
        <div className="relative w-full h-full flex flex-col bg-[#05070D] p-6 overflow-y-auto custom-scrollbar">
          {/* Hypothesis Header Banner */}
          <div className="p-4 rounded-xl bg-[#080C14] border border-cyan-500/30 font-mono text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
            <div>
              <div className="text-cyan-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <GitCompare className="w-4 h-4 text-cyan-400" />
                <span>SOURCE HYPOTHESIS TEST</span>
              </div>
              <p className="text-zinc-200 text-sm mt-1 font-sans">
                Could a plausible release along MT NORDIC POLARIS&apos;s track produce the observed slick?
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded bg-emerald-500/15 border border-emerald-400 text-emerald-300 font-bold uppercase text-[11px]">
                HYPOTHESIS SUPPORTED (83%)
              </span>
            </div>
          </div>

          {/* Dual Comparison Panels: Observed vs Simulated */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
            {/* Panel A: Observed Slick Geometry */}
            <div className="bg-[#080C14] border border-white/10 rounded-xl overflow-hidden flex flex-col">
              <div className="px-4 py-2.5 bg-[#0A0E17] border-b border-white/10 font-mono text-xs flex items-center justify-between">
                <span className="text-white font-bold">A. OBSERVED SAR SLICK</span>
                <span className="text-zinc-500 text-[10px]">SAR OBSERVATION</span>
              </div>
              <div className="relative flex-1 p-4 flex items-center justify-center bg-[#060810]">
                <img
                  src="/prototype/case_0004/part1_oil_00004_slick_overlay.png"
                  alt="Observed Slick"
                  className="max-h-60 object-contain rounded border border-white/10"
                />
              </div>
              <div className="p-3 bg-[#080C14] border-t border-white/10 font-mono text-[11px] text-zinc-400 space-y-0.5">
                <div>Elongation Axis: <strong className="text-white">052° NE</strong></div>
                <div>Area Extent: <strong className="text-white">4.41 km²</strong></div>
                <div>Leading Edge: 55.244°N, 5.885°E</div>
              </div>
            </div>

            {/* Panel B: Forward Simulated Release Plume */}
            <div className="bg-[#080C14] border border-cyan-500/30 rounded-xl overflow-hidden flex flex-col">
              <div className="px-4 py-2.5 bg-[#0A0E17] border-b border-white/10 font-mono text-xs flex items-center justify-between">
                <span className="text-cyan-400 font-bold">B. SIMULATED RELEASE PLUME</span>
                <span className="text-zinc-500 text-[10px]">GAUSSIAN-LAGRANGIAN</span>
              </div>
              <div className="relative flex-1 p-4 flex items-center justify-center bg-[#060810]">
                {/* SVG Simulated Plume Rendering */}
                <svg className="w-full h-48" viewBox="0 0 300 200">
                  <rect width="100%" height="100%" fill="#070b14" />
                  {/* Candidate Track Line */}
                  <line x1="40" y1="160" x2="260" y2="40" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4, 4" />
                  {/* Plume Envelope */}
                  <ellipse cx="160" cy="95" rx="70" ry="25" transform="rotate(-32 160 95)" fill="#00f0ff" fillOpacity="0.25" stroke="#00f0ff" strokeWidth="1.5" />
                  <ellipse cx="175" cy="85" rx="45" ry="14" transform="rotate(-32 175 85)" fill="#00f0ff" fillOpacity="0.4" />
                  <text x="50" y="180" fill="#f59e0b" fontSize="9" fontFamily="monospace">VESSEL TRACK (054°)</text>
                  <text x="140" y="50" fill="#00f0ff" fontSize="9" fontFamily="monospace">SIMULATED PLUME</text>
                </svg>
              </div>
              <div className="p-3 bg-[#080C14] border-t border-white/10 font-mono text-[11px] text-zinc-400 space-y-0.5">
                <div>Trajectory Consistency: <strong className="text-cyan-400">86%</strong></div>
                <div>Shape Alignment: <strong className="text-cyan-400">79%</strong></div>
                <div>Spatial Overlap: <strong className="text-cyan-400">81%</strong></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 7. REPORT STAGE 12: DOCUMENT-STYLE INVESTIGATION SUMMARY */}
      {/* ============================================================ */}
      {currentStepId === 'report' && (
        <div className="relative w-full h-full flex flex-col bg-[#05070D] p-6 overflow-y-auto custom-scrollbar">
          <div className="max-w-3xl mx-auto w-full bg-[#080C14] border border-white/15 rounded-xl p-6 sm:p-8 font-mono text-xs space-y-6 shadow-2xl">
            {/* Report Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest">
                  MARITIME DOMAIN INVESTIGATION REPORT
                </div>
                <h3 className="text-xl font-bold text-white tracking-wide mt-1">
                  CASE 0004: GERMAN BIGHT OIL SPILL INCIDENT
                </h3>
                <div className="text-zinc-400 text-[11px] mt-1">
                  Sentinel-1A Observation · Ref Part1-00004 · 03 Aug 2018
                </div>
              </div>

              <button
                onClick={onOpenReport}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-[#070A10] font-bold text-xs transition-colors cursor-pointer"
              >
                <FileCheck className="w-4 h-4" />
                <span>EXPORT FULL DOSSIER</span>
              </button>
            </div>

            {/* Findings Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="text-[10px] text-zinc-500">SLICK SIZE</div>
                <div className="text-white font-bold mt-1">4.41 km²</div>
                <div className="text-[10px] text-zinc-400">44,049 px</div>
              </div>
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="text-[10px] text-zinc-500">EST. VOLUME</div>
                <div className="text-white font-bold mt-1">215 m³</div>
                <div className="text-[10px] text-zinc-400">180–250 m³</div>
              </div>
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="text-[10px] text-zinc-500">RELEASE WINDOW</div>
                <div className="text-cyan-400 font-bold mt-1">11:45–13:20</div>
                <div className="text-[10px] text-zinc-400">03 Aug 2018 UTC</div>
              </div>
              <div className="p-3 rounded-lg bg-white/5 border border-amber-500/40 bg-amber-500/10">
                <div className="text-[10px] text-amber-300">TOP SUSPECT</div>
                <div className="text-amber-200 font-bold mt-1 truncate">NORDIC POLARIS</div>
                <div className="text-[10px] text-amber-400 font-bold">84% SCORE</div>
              </div>
            </div>

            {/* Key Analytical Reasoning Steps */}
            <div className="space-y-2 text-[11px]">
              <div className="text-zinc-400 font-bold uppercase text-[10px]">
                EVIDENCE CHAIN SUMMARY:
              </div>
              <div className="p-3 rounded-lg bg-black/40 border border-white/5 space-y-1.5 text-zinc-300">
                <p>1. Sentinel-1A SAR acquired surface anomaly at 17:25:51 UTC (VV/VH damping verified).</p>
                <p>2. Backward drift modeling (ERA5 wind + GLORYS current) identified release corridor between 11:45 and 13:20 UTC.</p>
                <p>3. AIS screening filtered 47 candidate vessels down to 1 primary vessel of interest.</p>
                <p>4. MT NORDIC POLARIS intersected release locus at 12:35 UTC (0.38 nm distance) with 2.3 kn speed reduction.</p>
                <p>5. Counterfactual hypothesis test confirmed release along track produces matching 052° elongation.</p>
              </div>
            </div>

            {/* Legal Disclaimer Footer */}
            <div className="pt-4 border-t border-white/10 text-[10px] text-zinc-500 uppercase tracking-wider text-center">
              ATTRIBUTION IS AN INVESTIGATIVE HYPOTHESIS AND REQUIRES ANALYST VERIFICATION.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimulationPrimaryVisual;
