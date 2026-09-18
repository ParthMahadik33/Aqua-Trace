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
  CANONICAL_CASE_0004_PREDICTION,
  CANONICAL_CASE_0004_ATTRIBUTION,
} from '@/data/case0004Data';
import { AttributionEngine } from '@/services/simulationEngines/AttributionEngine';
import { ProvenanceTag } from './ProvenanceTag';
import {
  Share2,
  FileText,
  ChevronRight,
  ChevronDown,
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
  Check,
} from 'lucide-react';

const attributionEngine = new AttributionEngine();

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
  dynamicCounterfactual?: any;
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
  dynamicCounterfactual,
}) => {
  const [paramsExpanded, setParamsExpanded] = useState(false);

  return (
    <aside className="w-full md:w-[380px] lg:w-[420px] xl:w-[440px] h-full bg-surface border-l border-border flex flex-col z-20 select-none transition-colors overflow-hidden">
      {/* 1. INSPECTOR HEADER: STAGE NUMBER, TITLE, PROVENANCE */}
      <div className="p-4 border-b border-border bg-panel/70 flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-surface text-foreground border border-border">
              STAGE {currentStep.numberStr} / {totalSteps.toString().padStart(2, '0')}
            </span>
            <ProvenanceTag type={currentStep.statusTag} />
          </div>

          {onOpenEvidenceGraph && (
            <button
              onClick={onOpenEvidenceGraph}
              className="flex items-center gap-1 px-2 py-1 rounded bg-surface hover:bg-panel text-muted-foreground hover:text-foreground border border-border text-[10px] font-mono transition-colors cursor-pointer"
              title="Open investigative evidence graph"
            >
              <Share2 className="w-3 h-3 text-sky-600 dark:text-sky-400" />
              <span>EVIDENCE CHAIN</span>
            </button>
          )}
        </div>

        <div>
          <h2 className="text-sm font-bold text-foreground tracking-wide uppercase font-mono mt-0.5">
            {currentStep.title}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {currentStep.description}
          </p>
        </div>
      </div>

      {/* 2. SCROLLABLE INSPECTOR BODY */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 text-xs font-sans text-foreground">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="space-y-4"
          >
            {/* --- STAGE 01: SURVEILLANCE --- */}
            {currentStep.id === 'surveillance' && (
              <div className="space-y-3">
                <SectionBox title="Surveillance Telemetry">
                  <ParamRow label="Area of Interest" value="German Bight (Sector A)" />
                  <ParamRow label="Surveillance Mode" value="Wide-Area Autonomous Sweep" />
                  <ParamRow label="Coverage Window" value="24h Continuous" />
                  <ParamRow label="Monitored Corridors" value="4 Active Shipping Lanes" />
                </SectionBox>

                <SectionBox title="Observation Criteria">
                  <ParamRow label="Sentinel-1 Platform" value="Sentinel-1B IW GRD" />
                  <ParamRow label="Acquisition Schedule" value="17:25:51 UTC (Track 023)" />
                  <ParamRow label="Trigger Condition" value="Surface Radiometric Anomaly" />
                </SectionBox>
              </div>
            )}

            {/* --- STAGE 02: SAR ACQUISITION --- */}
            {currentStep.id === 'sar_acquisition' && (
              <div className="space-y-3">
                <SectionBox title="Copernicus Sentinel-1 Ingestion">
                  <ParamRow label="Product ID" value={sarMetadata.productId} isCode />
                  <ParamRow label="Acquisition Time" value={sarMetadata.acquisitionTimestamp} />
                  <ParamRow label="Sensor Mode" value={`${sarMetadata.sensorMode} (${sarMetadata.polarizations?.join('+') || 'VV+VH'})`} />
                  <ParamRow label="Orbit & Track" value={`Orbit ${sarMetadata.orbitNumber}, ${sarMetadata.passDirection}`} />
                  <ParamRow label="Spatial Resolution" value="10m GRD (High Res)" />
                </SectionBox>

                <SectionBox title="Radar Calibration">
                  <ParamRow label="Calibration Type" value="Radiometric sigma-0 (dB)" />
                  <ParamRow label="Ellipsoid Georeference" value="WGS84 / EPSG:4326" />
                  <ParamRow label="Noise Equivalent Sigma0" value="-22.0 dB" />
                </SectionBox>
              </div>
            )}

            {/* --- STAGE 03: SCREENING --- */}
            {currentStep.id === 'sar_processing' && (
              <div className="space-y-3">
                <SectionBox title="Quality & Weather Screening">
                  <ParamRow label="Surface Wind Speed" value={`${metocean.windSpeedMs} m/s (Valid Window 3-10 m/s)`} />
                  <ParamRow label="Wind Quality Factor" value="PASS - Valid capillary wave damping" />
                  <ParamRow label="Offshore Structures" value="Wind farm boundaries masked" />
                  <ParamRow label="Speckle Filter" value="Enhanced Lee (5x5 kernel)" />
                </SectionBox>

                <SectionBox title="Contrast Assessment">
                  <ParamRow label="Target Contrast Drop" value="5.8 dB vs background ocean" />
                  <ParamRow label="Signal Quality" value="High contrast anomaly verified" />
                </SectionBox>
              </div>
            )}

            {/* --- STAGE 04: DETECTION --- */}
            {currentStep.id === 'detection' && (
              <div className="space-y-3">
                <SectionBox title="Anomaly Classification">
                  <ParamRow label="Morphology" value="Elongated curvilinear band" />
                  <ParamRow label="Feature Length" value="14.8 km" />
                  <ParamRow label="Aspect Ratio" value="11.2 : 1" />
                  <ParamRow label="Look-alike Rejection" value="Biogenic & low-wind flags: FALSE" />
                </SectionBox>

                <SectionBox title="Classification Verdict">
                  <div className="flex items-center justify-between pb-1.5 border-b border-border/50">
                    <span className="font-mono text-muted-foreground">Classification</span>
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      MINERAL OIL CANDIDATE
                    </span>
                  </div>
                  <ParamRow label="Baseline Model" value="Radiometric Gradient & Damping" />
                  <ParamRow label="Confidence Index" value="High (88/100)" />
                </SectionBox>
              </div>
            )}

            {/* --- STAGE 05: SEGMENTATION --- */}
            {currentStep.id === 'segmentation' && (
              <div className="space-y-3">
                <SectionBox title="Morphological Delineation">
                  <ParamRow label="Surface Area" value="4.41 km² (44,049 pixels)" />
                  <ParamRow label="Centroid Lat / Lon" value="55.2443°N, 5.8856°E" />
                  <ParamRow label="Major Axis Heading" value="052° True North" />
                  <ParamRow label="Perimeter" value="38.2 km" />
                </SectionBox>

                <SectionBox title="Overlay Controls">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-muted-foreground">Layer Opacity</span>
                    <span className="font-bold">{Math.round(overlayOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.2}
                    max={1}
                    step={0.05}
                    value={overlayOpacity}
                    onChange={(e) => onChangeOverlayOpacity(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-panel rounded cursor-pointer accent-sky-600"
                  />
                </SectionBox>
              </div>
            )}

            {/* --- STAGE 06: CONTEXT / ENVIRONMENTAL --- */}
            {currentStep.id === 'environmental' && (
              <div className="space-y-3">
                <SectionBox title="Metocean Forcing Conditions">
                  <ParamRow label="Surface Wind" value={`${metocean.windSpeedMs} m/s @ ${metocean.windDirectionDeg}°`} />
                  <ParamRow label="Wind Drift Factor" value="3.1% surface vector coupling" />
                  <ParamRow label="Surface Current" value={`${metocean.currentVelocityMs} m/s @ ${metocean.currentDirectionDeg}°`} />
                  <ParamRow label="Current Source" value="CMEMS Hydrodynamic Model" />
                  <ParamRow label="Sea Surface Temp" value={`${metocean.seaSurfaceTempC}°C`} />
                  <ParamRow label="Wave Height (Hs)" value={`${metocean.significantWaveHeightM} m`} />
                </SectionBox>

                <SectionBox title="Combined Drift Transport">
                  <ParamRow label="Net Surface Vector" value="0.58 m/s towards 068° ENE" />
                  <ParamRow label="Persistence Rating" value="Stable unidirectional advection" />
                </SectionBox>
              </div>
            )}

            {/* --- STAGE 07: HINDCAST --- */}
            {currentStep.id === 'source_reconstruction' && (
              <div className="space-y-3">
                <SectionBox title="Lagrangian Reverse Trajectory">
                  <ParamRow label="Hindcast Duration" value="18 Hours Reverse" />
                  <ParamRow label="Time Step" value="15 minutes (72 total integration steps)" />
                  <ParamRow label="Ensemble Size" value="5 Perturbation Trajectories" />
                  <ParamRow label="Dispersion Model" value="Runge-Kutta 4th Order with Eddy Diffusion" />
                </SectionBox>

                <SectionBox title="Reconstructed Origin Corridor">
                  <ParamRow label="Estimated Origin" value={`${sourceRecon.originCentroid.lat.toFixed(4)}°N, ${sourceRecon.originCentroid.lon.toFixed(4)}°E`} />
                  <ParamRow label="Release Time Window" value="01:00 – 04:30 UTC" />
                  <ParamRow label="Corridor Width" value="±1.8 NM (95% confidence ellipse)" />
                </SectionBox>
              </div>
            )}

            {/* --- STAGE 08: AIS CANDIDATE SHORTLIST --- */}
            {currentStep.id === 'ais_correlation' && (
              <div className="space-y-3">
                <div className="text-[11px] font-mono font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between pb-1 border-b border-border">
                  <span>ANALYST CANDIDATE SHORTLIST</span>
                  <span>{candidates.length} IDENTIFIED</span>
                </div>

                {candidates.map((cand) => {
                  const isSelected = selectedCandidate?.mmsi === cand.mmsi;
                  return (
                    <div
                      key={cand.mmsi}
                      onClick={() => onSelectCandidate(cand)}
                      className={`p-3 rounded border transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-sky-500/10 border-sky-500 text-foreground ring-1 ring-sky-500/30'
                          : 'bg-panel/60 border-border hover:border-slate-400 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div>
                          <div className="font-mono font-bold text-xs text-foreground flex items-center gap-1.5">
                            <Ship className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                            <span>{cand.name}</span>
                          </div>
                          <div className="font-mono text-[10px] text-muted-foreground mt-0.5">
                            MMSI {cand.mmsi} &middot; {cand.vesselType || 'Commercial'}
                          </div>
                        </div>

                        {(() => {
                          const candScore = cand.attributionScore ?? 92;
                          const isSupported = candScore >= 80;
                          const isWeak = candScore >= 50 && candScore < 80;
                          const statusLabel = isSupported ? 'SUPPORTED' : isWeak ? 'WEAK' : 'INCONCLUSIVE';
                          const statusClass = isSupported
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                            : isWeak
                            ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30'
                            : 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30';

                          const spatialScore = cand.attributionFactors?.find(f => f.name.toLowerCase().includes('spatial'))?.score ?? 94;
                          const temporalScore = cand.attributionFactors?.find(f => f.name.toLowerCase().includes('temporal'))?.score ?? 88;
                          const trajectoryScore = cand.attributionFactors?.find(f => f.name.toLowerCase().includes('trajectory'))?.score ?? 91;
                          const qualityScore = cand.attributionFactors?.find(f => f.name.toLowerCase().includes('quality'))?.score ?? 90;

                          return (
                            <>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border uppercase ${statusClass}`}>
                                {statusLabel}
                              </span>
                            </>
                          );
                        })()}
                      </div>

                      {/* Factor Consistency Grid */}
                      {(() => {
                        const spatialScore = cand.attributionFactors?.find(f => f.name.toLowerCase().includes('spatial'))?.score ?? 94;
                        const temporalScore = cand.attributionFactors?.find(f => f.name.toLowerCase().includes('temporal'))?.score ?? 88;
                        const trajectoryScore = cand.attributionFactors?.find(f => f.name.toLowerCase().includes('trajectory'))?.score ?? 91;
                        const qualityScore = cand.attributionFactors?.find(f => f.name.toLowerCase().includes('quality'))?.score ?? 90;

                        return (
                          <>
                            <div className="grid grid-cols-2 gap-x-2 gap-y-1 font-mono text-[10px] pt-1.5 border-t border-border/50">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Spatial:</span>
                                <span className="font-bold text-foreground">{spatialScore}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Temporal:</span>
                                <span className="font-bold text-foreground">{temporalScore}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Trajectory:</span>
                                <span className="font-bold text-foreground">{trajectoryScore}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Data Quality:</span>
                                <span className="font-bold text-foreground">{qualityScore}</span>
                              </div>
                            </div>

                            <div className="mt-2 pt-1.5 border-t border-border/50 flex items-center justify-between text-[11px] font-mono">
                              <span className="text-muted-foreground uppercase text-[10px]">Attribution Consistency:</span>
                              <span className="font-bold text-sky-700 dark:text-sky-300">
                                {cand.attributionScore ?? 92} / 100
                              </span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            )}

            {/* --- STAGE 09: ATTRIBUTION CONSISTENCY --- */}
            {currentStep.id === 'attribution' && (() => {
              const candidate = selectedCandidate || candidates[0];
              const attrExecution = attributionEngine.execute({
                vessel: candidate,
                counterfactualResult: dynamicCounterfactual,
                slickAxisDeg: 52.0,
              });
              const attr = attrExecution.result;

              return (
                <div className="space-y-3">
                  <SectionBox title="Vessel Under Investigation">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-mono text-sm font-bold text-foreground">
                          {candidate.name}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          MMSI {candidate.mmsi} &middot; {candidate.vesselType || 'Commercial'}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-sky-600/15 text-sky-700 dark:text-sky-300 border border-sky-500/30 uppercase">
                        CANDIDATE #1
                      </span>
                    </div>
                  </SectionBox>

                  {/* Multi-Factor Attribution Bars */}
                  <div className="p-3 rounded bg-panel/60 border border-border space-y-2.5">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold flex items-center justify-between">
                      <span>ATTRIBUTION CONSISTENCY MATRIX</span>
                      <span className="text-[9px] text-muted-foreground">AGGREGATED</span>
                    </div>

                    <div className="space-y-2 font-mono text-[11px]">
                      <FactorBar label="Spatial Proximity (30%)" score={attr.factors.spatialProximity.score} />
                      <FactorBar label="Temporal Compatibility (25%)" score={attr.factors.temporalCompatibility.score} />
                      <FactorBar label="Trajectory Alignment (20%)" score={attr.factors.trajectoryConsistency.score} />
                      <FactorBar label="Kinematic Anomaly (15%)" score={attr.factors.behavioralAnomaly.score} isWarning={attr.factors.behavioralAnomaly.isWarning} />
                      <FactorBar label="Metocean Consistency (10%)" score={attr.factors.metoceanConsistency.score} />
                    </div>
                  </div>

                  {/* Overall Result Box */}
                  <div className="p-3.5 rounded bg-sky-500/10 border border-sky-500/30 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase font-bold text-sky-700 dark:text-sky-300">
                        OVERALL ATTRIBUTION CONSISTENCY
                      </span>
                      <span className="font-mono text-xs font-bold text-sky-700 dark:text-sky-300">
                        {attr.attributionScore} / 100
                      </span>
                    </div>
                    <div className="text-sm font-bold text-foreground font-mono">
                      HYPOTHESIS STATUS: {attr.attributionScore >= 80 ? 'SUPPORTED' : attr.attributionScore >= 50 ? 'WEAK' : 'INCONCLUSIVE'}
                    </div>
                    <div className="text-[11px] text-muted-foreground leading-relaxed">
                      Aggregated evidence indicates high spatiotemporal compatibility with the hindcast corridor.
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* --- STAGE 10: COUNTERFACTUAL SOURCE HYPOTHESIS --- */}
            {currentStep.id === 'counterfactual' && (() => {
              const isDynamic = Boolean(dynamicCounterfactual && dynamicCounterfactual.isDynamic);
              const candidate = dynamicCounterfactual?.candidate || selectedCandidate || candidates[0];
              const candName = candidate?.name || 'MT NORDIC POLARIS';
              const candMmsi = candidate?.mmsi || '244710000';
              const candType = candidate?.vesselType || 'Chemical / Oil Products Tanker';

              const offsetNmVal =
                dynamicCounterfactual?.metrics?.centroid_distance_nm ?? 8.72;
              const orientVal =
                dynamicCounterfactual?.metrics?.orientation_delta_deg ?? 15.4;
              const overlapVal =
                ((dynamicCounterfactual?.metrics?.overlap_dice_coefficient ?? 0.08) * 100).toFixed(1);

              const verdict = dynamicCounterfactual?.verdict || 'INCONCLUSIVE';

              return (
                <div className="space-y-3">
                  {/* Central Hypothesis Header */}
                  <SectionBox title="HYPOTHESIS UNDER INVESTIGATION">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-foreground text-xs font-mono">
                          {candName}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                          MMSI {candMmsi} &middot; {candType}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-muted border border-border text-foreground">
                        CANDIDATE TEST
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-2 italic font-sans leading-relaxed">
                      &ldquo;Could this vessel physically explain the observed slick under hydrodynamic forcing?&rdquo;
                    </p>
                  </SectionBox>

                  {/* Prominent Verdict Result */}
                  <div className="p-3 rounded bg-amber-500/10 border border-amber-500/30 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase font-bold text-amber-800 dark:text-amber-300">
                        VERDICT
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40">
                        {verdict}
                      </span>
                    </div>
                    <div className="text-sm font-bold font-mono text-foreground mt-0.5">
                      HYPOTHESIS {verdict}
                    </div>
                    <div className="text-[11px] font-sans text-muted-foreground leading-relaxed pt-1">
                      Simulated plume does not sufficiently align with observed slick under current prototype forcing.
                    </div>
                  </div>

                  {/* Quantitative Comparison Table */}
                  <SectionBox title="GEOMETRIC & HYDRODYNAMIC COMPARISON">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left font-mono text-[10px] border-collapse">
                        <thead>
                          <tr className="border-b border-border/60 text-muted-foreground">
                            <th className="py-1">PARAMETER</th>
                            <th className="py-1">OBSERVED</th>
                            <th className="py-1">SIMULATED</th>
                            <th className="py-1 text-right">DELTA</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                          <tr>
                            <td className="py-1 text-muted-foreground">Centroid</td>
                            <td className="py-1 text-foreground">55.244°N, 5.886°E</td>
                            <td className="py-1 text-foreground">55.195°N, 5.762°E</td>
                            <td className="py-1 text-right font-bold text-amber-600 dark:text-amber-400">
                              {offsetNmVal} NM (≤3.5)
                            </td>
                          </tr>
                          <tr>
                            <td className="py-1 text-muted-foreground">Major Axis</td>
                            <td className="py-1 text-foreground">052.0° ENE</td>
                            <td className="py-1 text-foreground">067.4° ENE</td>
                            <td className="py-1 text-right font-bold text-amber-600 dark:text-amber-400">
                              {orientVal}° (≤25°)
                            </td>
                          </tr>
                          <tr>
                            <td className="py-1 text-muted-foreground">Area Spread</td>
                            <td className="py-1 text-foreground">4.41 km²</td>
                            <td className="py-1 text-foreground">5.12 km²</td>
                            <td className="py-1 text-right text-foreground">+16.1%</td>
                          </tr>
                          <tr>
                            <td className="py-1 text-muted-foreground">Dice Overlap</td>
                            <td className="py-1 text-foreground">1.00 (Anchor)</td>
                            <td className="py-1 text-foreground">0.08 (Low)</td>
                            <td className="py-1 text-right text-amber-600 dark:text-amber-400 font-bold">{overlapVal}% (≥40%)</td>
                          </tr>
                          <tr>
                            <td className="py-1 text-muted-foreground">Forcing Model</td>
                            <td className="py-1 text-foreground">Sentinel-1A SAR</td>
                            <td className="py-1 text-foreground" colSpan={2}>ERA5 + CMEMS Baseline</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </SectionBox>

                  {/* Why Section */}
                  <SectionBox title="WHY IS THE RESULT INCONCLUSIVE?">
                    <div className="space-y-1.5 text-[11px] font-mono">
                      <div className="flex items-start justify-between gap-2 pb-1 border-b border-border/40">
                        <span className="text-muted-foreground">Spatial Offset:</span>
                        <span className="font-bold text-amber-600 dark:text-amber-400 text-right">
                          {offsetNmVal} NM offset (Limit &le; 3.5 NM)
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-2 pb-1 border-b border-border/40">
                        <span className="text-muted-foreground">Orientation Delta:</span>
                        <span className="font-bold text-amber-600 dark:text-amber-400 text-right">
                          {orientVal}° divergence (Limit &le; 25°)
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-muted-foreground">Kinematic Fit:</span>
                        <span className="font-bold text-foreground text-right">
                          {overlapVal}% overlap (Spatial lag)
                        </span>
                      </div>
                    </div>
                  </SectionBox>

                  {/* Next Step / Candidate Switcher */}
                  <SectionBox title="TEST REMAINING CANDIDATE HYPOTHESES">
                    <div className="space-y-1.5 pt-0.5">
                      <div className="text-[10px] text-muted-foreground font-mono">
                        Select candidate to compare counterfactual dispersion:
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                        {candidates.map((c) => {
                          const isSel = c.mmsi === candidate.mmsi;
                          return (
                            <button
                              key={c.mmsi}
                              type="button"
                              onClick={() => onSelectCandidate(c)}
                              className={`p-1.5 rounded text-left font-mono text-[10px] border transition-colors cursor-pointer ${
                                isSel
                                  ? 'bg-sky-600 text-white border-sky-500 font-bold'
                                  : 'bg-panel hover:bg-muted text-foreground border-border'
                              }`}
                            >
                              <div className="truncate font-semibold">{c.name}</div>
                              <div className="text-[9px] opacity-75">{c.vesselType?.split(' ')[0]}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </SectionBox>
                </div>
              );
            })()}

            {/* --- STAGE 11: PLUME IMPACT FORECAST --- */}
            {currentStep.id === 'impact_prioritization' && (() => {
              const forecastState = getForecastState(impactHours);

              return (
                <div className="space-y-3">
                  <SectionBox title="CURRENT PROTOTYPE: PARAMETRIC PLUME GEOMETRY">
                    <ParamRow label="Forecast Horizon" value={`T+${impactHours}h (${impactHours >= 31 ? 'COASTAL INTERACTION' : 'OFFSHORE DRIFT'})`} />
                    <ParamRow label="Forecast Plume Area" value={`${forecastState.areaKm2.toFixed(2)} km²`} />
                    <ParamRow label="Coastal Interaction" value={`${forecastState.coastalExposureLevel} (${forecastState.statusText})`} />
                    <ParamRow label="Drift Distance" value={`${forecastState.driftDistanceNm.toFixed(1)} NM @ 072° ENE`} />
                  </SectionBox>

                  <SectionBox title="Environmental Exposure">
                    <ParamRow label="Priority Zone" value="Sylt-Rømø Wadden Sea National Park" />
                    <ParamRow label="Estimated Shoreline TTI" value="~31 Hours Post-Observation" />
                    <ParamRow label="Contingency Priority" value="HIGH - Marine Reserve Protection" />
                  </SectionBox>

                  <div className="p-3 rounded bg-sky-500/10 border border-sky-500/30 space-y-1">
                    <div className="text-[10px] font-mono uppercase font-bold text-sky-700 dark:text-sky-300">
                      CONCLUSION
                    </div>
                    <p className="text-xs text-foreground leading-relaxed">
                      {impactHours < 31
                        ? 'No immediate coastal interaction at current horizon. Plume remains in open maritime lane.'
                        : 'Coastal interaction becomes plausible near T+31h along North Frisian barrier islands.'}
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* --- STAGE 12: REPORT / DOSSIER --- */}
            {currentStep.id === 'report' && (
              <div className="space-y-3">
                <SectionBox title="INVESTIGATION DOSSIER SUMMARY">
                  <ParamRow label="Case ID" value="CASE-0004-GERMAN-BIGHT" />
                  <ParamRow label="Observation Source" value="Sentinel-1B IW SAR" />
                  <ParamRow label="Slick Area" value="4.41 km²" />
                  <ParamRow label="Lead Candidate" value="MT NORDIC POLARIS" />
                  <ParamRow label="Attribution Consistency" value="92 / 100" />
                  <ParamRow label="Counterfactual Verdict" value="INCONCLUSIVE (8.7 NM offset)" />
                  <ParamRow label="Legal Status" value="Investigative Hypothesis (Analyst Review Required)" />
                </SectionBox>

                <button
                  onClick={onOpenReport}
                  className="w-full py-2.5 px-3 rounded bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>OPEN OFFICIAL DOSSIER</span>
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 3. INSPECTOR FOOTER: STEP ADVANCEMENT */}
      <div className="p-3 border-t border-border bg-panel flex items-center justify-between gap-2">
        <button
          onClick={onPrevStep}
          disabled={currentStepIndex === 0}
          className="px-3 py-1.5 rounded bg-surface hover:bg-panel disabled:opacity-30 disabled:hover:bg-surface border border-border text-foreground font-mono text-xs transition-colors cursor-pointer"
        >
          &larr; PREV
        </button>

        {currentStepIndex < totalSteps - 1 ? (
          <button
            onClick={onNextStep}
            className="flex-1 py-1.5 px-3 rounded bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
          >
            <span>NEXT STAGE</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            onClick={onOpenReport}
            className="flex-1 py-1.5 px-3 rounded bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>VIEW OFFICIAL DOSSIER</span>
          </button>
        )}
      </div>
    </aside>
  );
};

// Reusable Small Components with One Surface = One Purpose Rule

const SectionBox: React.FC<{ title: string; children: React.ReactNode; isCard?: boolean }> = ({
  title,
  children,
  isCard = false,
}) => (
  <div className={`space-y-1.5 ${isCard ? 'p-3 rounded bg-panel/50 border border-border' : 'pb-2.5 border-b border-border/50'}`}>
    <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold flex items-center justify-between">
      <span>{title}</span>
    </div>
    <div className="text-foreground">{children}</div>
  </div>
);

const ParamRow: React.FC<{
  label: string;
  value: string;
  isCode?: boolean;
}> = ({ label, value, isCode }) => (
  <div className="flex items-center justify-between text-[11px] font-mono border-b border-border/40 pb-1 last:border-0 last:pb-0">
    <span className="text-muted-foreground">{label}</span>
    <span className={`text-foreground ${isCode ? 'text-[10px] text-sky-700 dark:text-sky-300 truncate max-w-[200px]' : ''}`}>
      {value}
    </span>
  </div>
);

const FactorBar: React.FC<{
  label: string;
  score: number;
  isWarning?: boolean;
}> = ({ label, score, isWarning }) => (
  <div>
    <div className="flex justify-between items-center text-[11px] mb-1">
      <span className={isWarning ? 'text-amber-800 dark:text-amber-300' : 'text-muted-foreground'}>
        {label}
      </span>
      <span className={`font-bold ${isWarning ? 'text-amber-800 dark:text-amber-300' : 'text-foreground'}`}>
        {score} / 100
      </span>
    </div>
    <div className="w-full h-1.5 rounded-full bg-border overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${
          isWarning
            ? 'bg-amber-500'
            : score > 85
            ? 'bg-sky-600'
            : 'bg-slate-500'
        }`}
        style={{ width: `${score}%` }}
      />
    </div>
  </div>
);

export default SimulationInspector;
