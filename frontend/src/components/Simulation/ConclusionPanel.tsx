'use client';

import React from 'react';
import { SimulationStepId } from '@/types/simulation';
import { ProvenanceTag, ProvenanceType } from './ProvenanceTag';
import { ArrowRight, CheckCircle2, AlertTriangle, HelpCircle, Info } from 'lucide-react';

export interface StageStory {
  observation: string;
  analysis: string;
  conclusion: string;
  conclusionHighlight?: string;
  status?: 'SUPPORTED' | 'INCONCLUSIVE' | 'WEAK' | 'NOMINAL' | 'FLAGGED';
  nextStep: string;
  provenance: ProvenanceType;
}

export const STAGE_STORIES: Record<SimulationStepId, StageStory> = {
  surveillance: {
    observation: 'Automated optical and SAR surveillance monitoring German Bight traffic lanes.',
    analysis: '24h telemetry ingested. Radiometric anomaly flagged Sentinel-1B pass at 17:25 UTC.',
    conclusion: 'Sentinel-1B IW pass intersects an anomalous dark surface feature.',
    conclusionHighlight: 'High-priority SAR acquisition scheduled for ingestion.',
    status: 'NOMINAL',
    nextStep: 'Retrieve Copernicus Sentinel-1 SAR level-1 GRD product.',
    provenance: 'REAL SATELLITE DATA',
  },
  sar_acquisition: {
    observation: 'Copernicus Sentinel-1B SAR scene acquired over German Bight AOI (VV+VH).',
    analysis: 'Calibrated to sigma-0 backscatter; georeferenced to WGS84 at 10m pixel spacing.',
    conclusion: 'SAR scene verified with valid calibration noise floor and clean sea coverage.',
    conclusionHighlight: 'Calibrated backscatter ready for screening.',
    status: 'NOMINAL',
    nextStep: 'Execute automated quality and weather screening.',
    provenance: 'REAL SATELLITE DATA',
  },
  sar_processing: {
    observation: 'Low backscatter sigma-0 patch observed within operational offshore wind boundary.',
    analysis: 'Lee speckle filter, local contrast drop (5.8 dB), and ERA5 wind speed (4.2 m/s).',
    conclusion: 'Scene passed quality checks and is suitable for forensic investigation.',
    conclusionHighlight: 'Surface wind within 3–10 m/s valid detection window.',
    status: 'NOMINAL',
    nextStep: 'Run oil vs look-alike candidate classification.',
    provenance: 'DERIVED RESULT',
  },
  detection: {
    observation: 'Elongated dark anomaly measuring 14.8 km with characteristic curvilinear shape.',
    analysis: 'Spatial gradient and texture analysis differentiated feature from biogenic look-alikes.',
    conclusion: 'Possible oil slick detected. Mode: Prototype baseline.',
    conclusionHighlight: 'Mineral oil hypothesis supported by damping ratio and aspect ratio.',
    status: 'SUPPORTED',
    nextStep: 'Execute morphological segmentation to extract surface footprint.',
    provenance: 'DERIVED RESULT',
  },
  segmentation: {
    observation: 'Contiguous low-backscatter area with feathered edges aligned with historical tidal flow.',
    analysis: 'Morphological contouring calculated total surface area, centroid, and major axis orientation.',
    conclusion: 'Surface slick delineated at 4.41 km² with centroid at 55.244°N, 5.886°E.',
    conclusionHighlight: 'Geometric perimeter locked for hydrodynamic back-tracking.',
    status: 'NOMINAL',
    nextStep: 'Ingest oceanographic currents and wind context.',
    provenance: 'DERIVED RESULT',
  },
  environmental: {
    observation: 'Surface current setting east-northeast at 0.35 m/s; surface wind 4.8 m/s from 245° SW.',
    analysis: 'Coupled CMEMS hydrodynamic velocity field with ECMWF 3.1% wind drift leeway factor.',
    conclusion: 'Net surface transport vector established at 0.58 m/s towards 068° ENE.',
    conclusionHighlight: 'Stable unidirectional advection provides high trajectory persistence.',
    status: 'NOMINAL',
    nextStep: 'Compute Lagrangian backward hindcast to identify potential discharge window.',
    provenance: 'REAL SATELLITE DATA',
  },
  source_reconstruction: {
    observation: 'Current slick position represents accumulated drift since initial discharge.',
    analysis: '5-ensemble Lagrangian backward trajectory model executed 18 hours reverse in 15-min steps.',
    conclusion: 'Source corridor reconstructed approximately 18 hours backward.',
    conclusionHighlight: 'Estimated release window: 11:45–13:20 UTC (origin centroid 55.19°N, 5.81°E).',
    status: 'NOMINAL',
    nextStep: 'Correlate historical AIS vessel tracks with reconstructed release corridor.',
    provenance: 'DERIVED RESULT',
  },
  ais_correlation: {
    observation: 'AIS telemetry records 47 vessels transiting German Bight within ±24 hours of observation.',
    analysis: 'Spatiotemporal bounding filter applied against the 18-hour reverse trajectory corridor.',
    conclusion: '2 candidate vessels remain after spatial and temporal filtering.',
    conclusionHighlight: 'MT Nordic Polaris and MV Baltic Horizon identified for candidate evaluation.',
    status: 'NOMINAL',
    nextStep: 'Compute multi-factor Attribution Consistency scores.',
    provenance: 'CURATED CASE DATA',
  },
  attribution: {
    observation: 'Two candidate tracks intersect the backward hindcast envelope in time and space.',
    analysis: 'Evaluated spatial proximity, timing, trajectory alignment, speed anomaly, and metocean drift.',
    conclusion: 'MT Nordic Polaris demonstrates highest consistency (Score: 92/100).',
    conclusionHighlight: 'Attribution hypothesis supported for MT Nordic Polaris; weak for MV Baltic Horizon.',
    status: 'SUPPORTED',
    nextStep: 'Execute hydrodynamic counterfactual simulation to test physical viability.',
    provenance: 'PROTOTYPE MODEL',
  },
  counterfactual: {
    observation: 'Hypothetical discharge modeled along candidate vessel track at estimated transit time.',
    analysis: 'Forward hydrodynamic simulation compared synthetic plume against observed SAR slick.',
    conclusion: 'Hypothesis INCONCLUSIVE.',
    conclusionHighlight: '8.72 NM centroid offset · 15.4° orientation divergence under prototype forcing.',
    status: 'INCONCLUSIVE',
    nextStep: 'Compare remaining candidate hypotheses or inspect environmental sensitivity.',
    provenance: 'PROTOTYPE MODEL',
  },
  impact_prioritization: {
    observation: 'Surface slick drifting towards North Frisian coastal and conservation zones.',
    analysis: 'Ensemble 48-hour forward trajectory computed across core and dispersion uncertainty envelopes.',
    conclusion: 'Coastal interaction becomes plausible near T+31h.',
    conclusionHighlight: 'High environmental priority assigned to Sylt-Rømø Wadden Sea conservation boundary.',
    status: 'NOMINAL',
    nextStep: 'Compile formal Incident Investigation Dossier.',
    provenance: 'DERIVED RESULT',
  },
  report: {
    observation: 'Complete multi-source forensic evidence chain assembled from detection to impact forecast.',
    analysis: 'Synthesized satellite observations, metocean drift, AIS telemetry, and physical consistency testing.',
    conclusion: 'Investigation dossier completed with source attribution and coastal risk profile.',
    conclusionHighlight: 'Defensible evidentiary summary prepared for maritime authorities.',
    status: 'SUPPORTED',
    nextStep: 'Export technical brief or archive investigation dossier.',
    provenance: 'DERIVED RESULT',
  },
};

interface ConclusionPanelProps {
  stepId: SimulationStepId;
  storyOverride?: Partial<StageStory>;
  onNextStep?: () => void;
  className?: string;
}

export const ConclusionPanel: React.FC<ConclusionPanelProps> = ({
  stepId,
  storyOverride,
  onNextStep,
  className = '',
}) => {
  const baseStory = STAGE_STORIES[stepId] || STAGE_STORIES.surveillance;
  const story: StageStory = { ...baseStory, ...storyOverride };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'SUPPORTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 uppercase">
            <CheckCircle2 className="w-3 h-3" />
            SUPPORTED
          </span>
        );
      case 'INCONCLUSIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 uppercase">
            <AlertTriangle className="w-3 h-3" />
            INCONCLUSIVE
          </span>
        );
      case 'WEAK':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 uppercase">
            <HelpCircle className="w-3 h-3" />
            WEAK FIT
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/15 text-sky-800 dark:text-sky-300 border border-sky-500/30 uppercase">
            <Info className="w-3 h-3" />
            VERIFIED
          </span>
        );
    }
  };

  return (
    <div
      className={`rounded bg-surface border border-border px-3.5 py-2.5 transition-colors select-none ${className}`}
      data-testid="conclusion-panel"
    >
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        {/* Left: Dominant Conclusion Region */}
        <div className="flex-1 min-w-0 flex items-start gap-3">
          <div className="flex-shrink-0 flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold tracking-wider text-muted-foreground uppercase">
                CONCLUSION
              </span>
              {getStatusBadge(story.status)}
            </div>
            <div className="text-xs font-mono font-bold text-sky-700 dark:text-sky-300">
              {story.conclusionHighlight}
            </div>
          </div>

          {/* Divider */}
          <div className="hidden sm:block w-px h-10 bg-border/60 self-center flex-shrink-0" />

          {/* Middle: Brief Narrative Synthesis */}
          <div className="flex-1 min-w-0 text-[11px] font-sans text-foreground leading-relaxed">
            <div className="font-semibold text-foreground truncate">
              {story.conclusion}
            </div>
            <div className="text-muted-foreground text-[10px] line-clamp-1 mt-0.5">
              {story.observation} &middot; {story.analysis}
            </div>
          </div>
        </div>

        {/* Right: Provenance Tag + Contextual Next Action */}
        <div className="flex-shrink-0 flex items-center gap-2.5 w-full lg:w-auto justify-between lg:justify-end border-t lg:border-t-0 border-border/40 pt-2 lg:pt-0">
          <ProvenanceTag type={story.provenance} />

          {onNextStep && (
            <button
              type="button"
              onClick={onNextStep}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white font-mono text-[10px] font-bold tracking-wider transition-colors cursor-pointer shadow-sm flex-shrink-0"
              title={story.nextStep}
            >
              <span>NEXT STEP</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConclusionPanel;
