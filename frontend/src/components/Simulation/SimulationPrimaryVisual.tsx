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
import { CounterfactualAnalyticalOverlay } from './CounterfactualAnalyticalOverlay';
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
  Play,
  RotateCcw,
} from 'lucide-react';
import {
  CASE_0004_AIS_FUNNEL,
  CASE_0004_COUNTERFACTUAL_TEST,
  CANONICAL_CASE_0004_PREDICTION,
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
  dynamicCounterfactual?: any;
  onRunCounterfactual?: (candidate?: CandidateVessel | null) => void;
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
  dynamicCounterfactual,
  onRunCounterfactual,
}) => {
  // Local state for Stage 02 SAR view modes
  const [sarViewMode, setSarViewMode] = useState<'composite' | 'vv' | 'panel'>('composite');
  // Local state for Stage 03 Preprocessing stages
  const [prepStage, setPrepStage] = useState<'raw' | 'normalized' | 'enhanced'>('enhanced');
  // Local state for Stage 05 Segmentation display
  const [segMode, setSegMode] = useState<'overlay' | 'mask'>('overlay');
  // Local state for Stage 10 Counterfactual simulation toggle
  const [isCounterfactualRunning, setIsCounterfactualRunning] = useState(false);
  // Local state for Stage 10 Counterfactual dynamic timeline snapshot (T+0 to T+48h)
  const [counterfactualTimelineStep, setCounterfactualTimelineStep] = useState<number>(0);

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
  // MAP STAGES: 01 (surveillance), 06 (environmental), 07 (source_reconstruction), 08 (ais_correlation), 09 (attribution), 10 (counterfactual), 11 (impact_prioritization)
  const isMapStage =
    currentStepId === 'surveillance' ||
    currentStepId === 'environmental' ||
    currentStepId === 'source_reconstruction' ||
    currentStepId === 'ais_correlation' ||
    currentStepId === 'attribution' ||
    currentStepId === 'counterfactual' ||
    currentStepId === 'impact_prioritization';

  return (
    <div className="relative w-full h-full bg-surface overflow-hidden flex flex-col select-none transition-colors">
      {/* ============================================================ */}
      {/* 1. MAP-BASED STAGES (Surveillance, Metocean, Hindcast, AIS, Attribution, Counterfactual, Impact) */}
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
            dynamicCounterfactual={dynamicCounterfactual}
            counterfactualTimelineStep={counterfactualTimelineStep}
          />

          {/* Stage 01: Surveillance Incoming Observation Event Banner */}
          {currentStepId === 'surveillance' && (
            <div className="absolute top-4 left-4 z-[400] max-w-md p-3.5 rounded bg-surface/95 border border-border text-xs font-mono shadow-md backdrop-blur-md">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-sky-500" />
                  <span>NEW ACQUISITION INGESTED</span>
                </div>
                <span className="text-[10px] text-muted-foreground">COPERNICUS ARCHIVE</span>
              </div>
              <div className="mt-2.5 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-muted-foreground">PLATFORM: </span>
                  <span className="text-foreground font-semibold">{sarMetadata.platform}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">TIMESTAMP: </span>
                  <span className="text-foreground">{sarMetadata.acquisitionTimestamp.replace('T', ' ')} UTC</span>
                </div>
                <div>
                  <span className="text-muted-foreground">ORBIT: </span>
                  <span className="text-foreground">#{sarMetadata.orbitNumber} ({sarMetadata.passDirection})</span>
                </div>
                <div>
                  <span className="text-muted-foreground">MODE: </span>
                  <span className="text-sky-600 dark:text-sky-400 font-semibold">IW / GRDH (VV+VH)</span>
                </div>
              </div>
              <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>SECTOR: German Bight EEZ</span>
                <span className="text-amber-700 dark:text-amber-400 font-bold">SURFACE ANOMALY</span>
              </div>
            </div>
          )}

          {/* Stage 08: AIS Correlation Candidate Reduction HUD Strip */}
          {currentStepId === 'ais_correlation' && (
            <div className="absolute top-3.5 left-3.5 z-[400] flex items-center gap-2 px-3 py-1.5 rounded bg-surface/95 border border-border text-xs font-mono shadow-md backdrop-blur-md">
              <span className="text-muted-foreground flex items-center gap-1.5 font-bold text-[11px]">
                <Filter className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span>FILTERING FUNNEL:</span>
              </span>
              <div className="flex items-center gap-1 text-[11px]">
                <span className="font-semibold text-foreground" title="Ingestion: 47 Class-A Vessels">47</span>
                <span className="text-muted-foreground">&rarr;</span>
                <span className="font-semibold text-foreground" title="Spatial corridor filter: 8 vessels">8</span>
                <span className="text-muted-foreground">&rarr;</span>
                <span className="font-semibold text-foreground" title="Temporal release window: 5 vessels">5</span>
                <span className="text-muted-foreground">&rarr;</span>
                <span className="font-semibold text-foreground" title="Trajectory alignment: 3 vessels">3</span>
                <span className="text-muted-foreground">&rarr;</span>
                <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30" title="Candidate vessels of interest: 2">
                  2 CANDIDATES
                </span>
              </div>
            </div>
          )}

          {/* Stage 09: Vessel of Interest Target Telemetry Overlay */}
          {currentStepId === 'attribution' && selectedCandidate && (
            <div className="absolute top-3.5 left-3.5 z-[400] p-3 rounded bg-surface/95 border border-border text-xs font-mono shadow-md backdrop-blur-md max-w-sm">
              <div className="flex items-center justify-between pb-1.5 border-b border-border/60">
                <div className="flex items-center gap-2 text-foreground font-bold">
                  <Ship className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  <span>VESSEL OF INTEREST</span>
                </div>
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-sky-500/15 text-sky-800 dark:text-sky-300 border border-sky-500/30 font-bold">
                  CONSISTENCY 92%
                </span>
              </div>
              <div className="mt-2 text-foreground font-bold text-sm tracking-wide">
                {selectedCandidate.name}
              </div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                {selectedCandidate.vesselType} &middot; MMSI {selectedCandidate.mmsi}
              </div>
              <div className="mt-2 pt-1.5 border-t border-border/40 text-[11px] text-foreground space-y-1">
                <div>
                  <span className="text-muted-foreground">Closest Approach: </span>
                  <span className="text-foreground font-semibold">{selectedCandidate.closestApproachDistanceNm} nm</span> @ {selectedCandidate.closestApproachTimeUtc.slice(11, 16)} UTC
                </div>
                <div>
                  <span className="text-muted-foreground">Speed Anomaly: </span>
                  <span className="text-amber-700 dark:text-amber-300">-{selectedCandidate.speedAnomalyDipKn} kn dip</span> during transit
                </div>
              </div>
            </div>
          )}

          {/* Stage 07: Hindcast Simulation HUD Strip */}
          {currentStepId === 'source_reconstruction' && (
            <div className="absolute top-3.5 left-3.5 z-[400] flex items-center gap-2.5 px-3 py-1.5 rounded bg-surface/95 border border-border text-xs font-mono shadow-md backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-muted-foreground font-medium">HINDCAST ENSEMBLE:</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-400">5 TRAJECTORIES (T-6h)</span>
              <span className="text-border">|</span>
              <span className="text-muted-foreground">CORRIDOR: 11:45–13:20 UTC</span>
              <span className="text-border">|</span>
              <span className="text-muted-foreground">FORCING: ERA5 + CMEMS</span>
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

          {/* Stage 10: Counterfactual Analytical Overlay (Question, 7-Step Progress, Comparison, Verdict) */}
          {currentStepId === 'counterfactual' && (
            <CounterfactualAnalyticalOverlay
              sarMetadata={sarMetadata}
              candidates={candidates}
              selectedCandidate={selectedCandidate}
              onSelectCandidate={onSelectCandidate}
              dynamicCounterfactual={dynamicCounterfactual}
              onRunTest={() => onRunCounterfactual && onRunCounterfactual(selectedCandidate)}
              isLoading={isCounterfactualRunning}
            />
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. SAR IMAGERY STAGE 02: HIGH-RESOLUTION SAR ACQUISITION */}
      {/* ============================================================ */}
      {currentStepId === 'sar_acquisition' && (
        <div className="relative w-full h-full flex flex-col bg-panel/30 transition-colors">
          {/* Top Image Mode Selector Bar */}
          <div className="h-11 px-4 bg-surface border-b border-border flex items-center justify-between font-mono text-xs z-10">
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground tracking-wider">SENTINEL-1 SAR IMAGERY</span>
              <span className="text-border">/</span>
              <span className="text-sky-700 dark:text-sky-300">RAW RADAR ASSET</span>
            </div>

            {/* Toggle Modes */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setSarViewMode('composite')}
                className={`px-2.5 py-1 rounded border text-[11px] font-semibold transition-colors cursor-pointer ${
                  sarViewMode === 'composite'
                    ? 'bg-sky-600 text-white border-sky-500 shadow-sm'
                    : 'bg-surface hover:bg-panel border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                VH / COMPOSITE
              </button>
              <button
                onClick={() => setSarViewMode('vv')}
                className={`px-2.5 py-1 rounded border text-[11px] font-semibold transition-colors cursor-pointer ${
                  sarViewMode === 'vv'
                    ? 'bg-sky-600 text-white border-sky-500 shadow-sm'
                    : 'bg-surface hover:bg-panel border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                VV POLARIZATION
              </button>
              <button
                onClick={() => setSarViewMode('panel')}
                className={`px-2.5 py-1 rounded border text-[11px] font-semibold transition-colors cursor-pointer ${
                  sarViewMode === 'panel'
                    ? 'bg-sky-600 text-white border-sky-500 shadow-sm'
                    : 'bg-surface hover:bg-panel border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                DIAGNOSTIC PANEL
              </button>
            </div>
          </div>

          {/* Large Image Canvas */}
          <div className="relative flex-1 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
            <img
              src={
                sarViewMode === 'vv'
                  ? '/prototype/case_0004/part1_oil_00004_vv.png'
                  : sarViewMode === 'panel'
                  ? '/prototype/case_0004/part1_oil_00004_panel.png'
                  : '/prototype/case_0004/part1_oil_00004_composite.png'
              }
              alt="Sentinel-1A SAR Observation"
              className="max-w-full max-h-full object-contain rounded border border-border shadow-md"
            />

            {/* Corner Coordinates Overlay */}
            <div className="absolute top-6 left-6 px-2.5 py-1 rounded bg-surface/90 border border-border text-[10px] font-mono text-muted-foreground shadow-sm">
              55°20&apos;N, 005°53&apos;E (GERMAN BIGHT)
            </div>
            <div className="absolute bottom-6 right-6 px-2.5 py-1 rounded bg-surface/90 border border-border text-[10px] font-mono text-sky-700 dark:text-sky-300 shadow-sm font-semibold">
              C-BAND SAR // 2048 &times; 2048 PX
            </div>
          </div>

          {/* Bottom Concise Metadata Bar */}
          <div className="h-9 px-4 bg-surface border-t border-border flex items-center justify-between font-mono text-[11px] text-muted-foreground z-10">
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
        <div className="relative w-full h-full flex flex-col bg-panel/30 transition-colors">
          {/* Top Bar */}
          <div className="h-11 px-4 bg-surface border-b border-border flex items-center justify-between font-mono text-xs z-10">
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground tracking-wider">PREPROCESSING WORKFLOW</span>
              <span className="text-border">/</span>
              <span className="text-sky-700 dark:text-sky-300">RADIOMETRIC CALIBRATION</span>
            </div>

            {/* Transformation Steps */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPrepStage('raw')}
                className={`px-2.5 py-1 rounded border text-[11px] font-semibold transition-colors cursor-pointer ${
                  prepStage === 'raw'
                    ? 'bg-sky-600 text-white border-sky-500 shadow-sm'
                    : 'bg-surface hover:bg-panel border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                1. RAW
              </button>
              <span className="text-border">&rarr;</span>
              <button
                onClick={() => setPrepStage('normalized')}
                className={`px-2.5 py-1 rounded border text-[11px] font-semibold transition-colors cursor-pointer ${
                  prepStage === 'normalized'
                    ? 'bg-sky-600 text-white border-sky-500 shadow-sm'
                    : 'bg-surface hover:bg-panel border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                2. NORMALIZED
              </button>
              <span className="text-border">&rarr;</span>
              <button
                onClick={() => setPrepStage('enhanced')}
                className={`px-2.5 py-1 rounded border text-[11px] font-semibold transition-colors cursor-pointer ${
                  prepStage === 'enhanced'
                    ? 'bg-sky-600 text-white border-sky-500 shadow-sm'
                    : 'bg-surface hover:bg-panel border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                3. ENHANCED
              </button>
            </div>
          </div>

          {/* Large Transformation Image Display */}
          <div className="relative flex-1 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
            <img
              src={
                prepStage === 'raw'
                  ? '/prototype/case_0004/part1_oil_00004_vv.png'
                  : prepStage === 'normalized'
                  ? '/prototype/case_0004/part1_oil_00004_composite.png'
                  : '/prototype/case_0004/part1_oil_00004_composite.png'
              }
              alt="Preprocessing Transformation"
              className={`max-w-full max-h-full object-contain rounded border border-border shadow-md transition-all duration-300 ${
                prepStage === 'raw'
                  ? 'contrast-75 brightness-90'
                  : prepStage === 'normalized'
                  ? 'contrast-100'
                  : 'contrast-125'
              }`}
            />

            {/* Transformation Info Badge */}
            <div className="absolute top-6 left-6 p-3 rounded bg-surface/95 border border-border text-xs font-mono max-w-xs backdrop-blur-md shadow-sm">
              <div className="text-sky-700 dark:text-sky-300 font-bold uppercase text-[11px]">
                {prepStage === 'raw'
                  ? 'Raw Sigma-0 Backscatter'
                  : prepStage === 'normalized'
                  ? 'Radiometrically Calibrated'
                  : 'Speckle Filtered & Contrast Normalized'}
              </div>
              <p className="text-muted-foreground text-[10px] mt-1 leading-normal font-sans">
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
        <div className="relative w-full h-full flex flex-col bg-panel/30 transition-colors">
          {/* Top Bar */}
          <div className="h-11 px-4 bg-surface border-b border-border flex items-center justify-between font-mono text-xs z-10">
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground tracking-wider">DETECTION ENGINE</span>
              <span className="text-border">/</span>
              <span className="text-sky-700 dark:text-sky-300">ANOMALY CLASSIFICATION</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-panel border border-border text-[10px] text-foreground font-bold uppercase">
                PROTOTYPE BASELINE
              </span>
            </div>
          </div>

          {/* Large Canvas with Reticle Around Anomaly */}
          <div className="relative flex-1 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
            <div className="relative inline-block">
              <img
                src="/prototype/case_0004/part1_oil_00004_composite.png"
                alt="Detection Anomaly Composite"
                className="max-w-full max-h-[72vh] object-contain rounded border border-border shadow-md"
              />

              {/* Targeting Reticle Around Oil Slick */}
              <div
                className="absolute border-2 border-sky-500 rounded pointer-events-none"
                style={{
                  top: '32%',
                  left: '42%',
                  width: '32%',
                  height: '46%',
                }}
              >
                {/* Crosshair Markers */}
                <div className="absolute -top-1.5 -left-1.5 w-3 h-3 border-t-2 border-l-2 border-sky-400" />
                <div className="absolute -top-1.5 -right-1.5 w-3 h-3 border-t-2 border-r-2 border-sky-400" />
                <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 border-b-2 border-l-2 border-sky-400" />
                <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 border-b-2 border-r-2 border-sky-400" />

                {/* Classification Callout Badge */}
                <div className="absolute -top-6 left-0 px-2 py-0.5 rounded bg-sky-600 text-white font-mono text-[10px] font-bold tracking-wider flex items-center gap-1 shadow-sm">
                  <Crosshair className="w-3 h-3" />
                  <span>CANDIDATE SLICK: {CANONICAL_CASE_0004_PREDICTION.confidence_pct}% CONFIDENCE</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Probability Bar */}
          <div className="h-9 px-4 bg-surface border-t border-border flex items-center justify-between font-mono text-xs z-10">
            <div className="flex items-center gap-4 text-[11px]">
              <span className="text-muted-foreground">PREDICTED CLASSES:</span>
              <span className="text-sky-700 dark:text-sky-300 font-bold">OIL: {CANONICAL_CASE_0004_PREDICTION.oil_probability}</span>
              <span className="text-border">|</span>
              <span className="text-muted-foreground">LOOKALIKE: {CANONICAL_CASE_0004_PREDICTION.lookalike_probability}</span>
              <span className="text-border">|</span>
              <span className="text-muted-foreground">NO_OIL: {CANONICAL_CASE_0004_PREDICTION.no_oil_probability}</span>
            </div>
            <span className="text-[10px] text-muted-foreground">STATUS: MINERAL OIL CANDIDATE DETECTED</span>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. SEGMENTATION STAGE 05: SLICK DELINEATION MASK & GEOMETRY */}
      {/* ============================================================ */}
      {currentStepId === 'segmentation' && (
        <div className="relative w-full h-full flex flex-col bg-panel/30 transition-colors">
          {/* Top Bar */}
          <div className="h-11 px-4 bg-surface border-b border-border flex items-center justify-between font-mono text-xs z-10">
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground tracking-wider">MORPHOLOGICAL SEGMENTATION</span>
              <span className="text-border">/</span>
              <span className="text-sky-700 dark:text-sky-300">SLICK DELINEATION</span>
            </div>

            {/* Mode Toggle */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setSegMode('overlay')}
                className={`px-2.5 py-1 rounded border text-[11px] font-semibold transition-colors cursor-pointer ${
                  segMode === 'overlay'
                    ? 'bg-sky-600 text-white border-sky-500 shadow-sm'
                    : 'bg-surface hover:bg-panel border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                DELINEATION OVERLAY
              </button>
              <button
                onClick={() => setSegMode('mask')}
                className={`px-2.5 py-1 rounded border text-[11px] font-semibold transition-colors cursor-pointer ${
                  segMode === 'mask'
                    ? 'bg-sky-600 text-white border-sky-500 shadow-sm'
                    : 'bg-surface hover:bg-panel border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                BINARY PIXEL MASK
              </button>
            </div>
          </div>

          {/* Large Segmentation View */}
          <div className="relative flex-1 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
            <img
              src={
                segMode === 'mask'
                  ? '/prototype/case_0004/part1_oil_00004_slick_mask.png'
                  : '/prototype/case_0004/part1_oil_00004_slick_overlay.png'
              }
              alt="Slick Segmentation"
              className="max-w-full max-h-[72vh] object-contain rounded border border-border shadow-md"
            />

            {/* Floating Geometry Badge */}
            <div className="absolute bottom-6 left-6 p-3 rounded bg-surface/95 border border-border text-xs font-mono backdrop-blur-md shadow-sm space-y-1">
              <div className="text-sky-700 dark:text-sky-300 font-bold uppercase text-[11px]">
                SLICK GEOMETRIC PROFILE
              </div>
              <div className="text-foreground text-[10px]">
                Pixel Area: <strong className="text-foreground">44,049 pixels</strong> (4.41 km²)
              </div>
              <div className="text-muted-foreground text-[10px]">
                Bounding Box: Row 566–1573, Col 941–1405
              </div>
              <div className="text-muted-foreground text-[10px]">
                Centroid: 55.2443°N, 5.8856°E
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 7. REPORT STAGE 12: DOCUMENT-STYLE INVESTIGATION SUMMARY */}
      {/* ============================================================ */}
      {currentStepId === 'report' && (
        <div className="relative w-full h-full flex flex-col bg-panel/30 p-6 overflow-y-auto custom-scrollbar transition-colors">
          <div className="max-w-3xl mx-auto w-full bg-surface border border-border rounded-lg p-6 sm:p-8 font-mono text-xs space-y-6 shadow-sm">
            {/* Report Header */}
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest">
                  MARITIME INCIDENT INVESTIGATION REPORT
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-foreground tracking-wide mt-1">
                  CASE 0004: GERMAN BIGHT INVESTIGATION DOSSIER
                </h3>
                <div className="text-muted-foreground text-[11px] mt-1">
                  Sentinel-1B Observation &middot; Ref Part1-00004 &middot; 03 Aug 2018
                </div>
              </div>

              <button
                onClick={onOpenReport}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition-colors cursor-pointer shadow-sm"
              >
                <FileCheck className="w-4 h-4" />
                <span>VIEW OFFICIAL DOSSIER</span>
              </button>
            </div>

            {/* Findings Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded bg-panel/60 border border-border">
                <div className="text-[10px] text-muted-foreground uppercase">SLICK SIZE</div>
                <div className="text-foreground font-bold mt-1 text-sm">4.41 km²</div>
                <div className="text-[10px] text-muted-foreground">44,049 pixels</div>
              </div>
              <div className="p-3 rounded bg-panel/60 border border-border">
                <div className="text-[10px] text-muted-foreground uppercase">EST. VOLUME</div>
                <div className="text-foreground font-bold mt-1 text-sm">215 m³</div>
                <div className="text-[10px] text-muted-foreground">180–250 m³ range</div>
              </div>
              <div className="p-3 rounded bg-panel/60 border border-border">
                <div className="text-[10px] text-muted-foreground uppercase">RELEASE WINDOW</div>
                <div className="text-sky-700 dark:text-sky-300 font-bold mt-1 text-sm">01:00–04:30</div>
                <div className="text-[10px] text-muted-foreground">03 Aug 2018 UTC</div>
              </div>
              <div className="p-3 rounded bg-sky-500/10 border border-sky-500/30">
                <div className="text-[10px] text-sky-700 dark:text-sky-300 uppercase font-semibold">CANDIDATE #1</div>
                <div className="text-foreground font-bold mt-1 truncate">NORDIC POLARIS</div>
                <div className="text-[10px] text-sky-700 dark:text-sky-300 font-bold">CONSISTENCY: 92/100</div>
              </div>
            </div>

            {/* Key Analytical Reasoning Steps */}
            <div className="space-y-2 text-[11px]">
              <div className="text-foreground font-bold uppercase text-[10px]">
                EVIDENCE CHAIN RECONSTRUCTION:
              </div>
              <div className="p-3.5 rounded bg-panel/40 border border-border space-y-1.5 text-foreground">
                <p>1. Sentinel-1B SAR acquired surface dark anomaly at 17:25:51 UTC (calibrated backscatter damping verified).</p>
                <p>2. Morphological segmentation extracted 4.41 km² slick polygon oriented along 052° major axis.</p>
                <p>3. Lagrangian backward drift modeling (ERA5 wind + CMEMS current) identified release corridor 18 hours reverse.</p>
                <p>4. AIS correlation filtered 47 transiting vessels down to 2 candidate vessels of interest.</p>
                <p>5. Multi-factor attribution established MT NORDIC POLARIS as highest consistency candidate (92/100).</p>
                <p>6. Counterfactual simulation established physical boundary limits and centroid divergence under baseline parameters.</p>
              </div>
            </div>

            {/* Legal Disclaimer Footer */}
            <div className="pt-3 border-t border-border text-[10px] text-muted-foreground uppercase tracking-wider text-center">
              ATTRIBUTION CONSISTENCY IS AN INVESTIGATIVE HYPOTHESIS AND REQUIRES ANALYST VERIFICATION.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimulationPrimaryVisual;
