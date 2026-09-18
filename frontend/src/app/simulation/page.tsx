'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { SimulationHeaderBar } from '@/components/Header/SimulationHeaderBar';
import { SimulationPipelineNav } from '@/components/Simulation/SimulationPipelineNav';
import { SimulationPrimaryVisual } from '@/components/Simulation/SimulationPrimaryVisual';
import { SimulationInspector } from '@/components/Simulation/SimulationInspector';
import { IncidentReportModal } from '@/components/Simulation/IncidentReportModal';
import { EvidenceGraphModal } from '@/components/Simulation/EvidenceGraphModal';
import {
  SIMULATION_STEPS,
  CASE_0004_SAR_METADATA,
  CASE_0004_METOCEAN,
  CASE_0004_SOURCE_RECONSTRUCTION,
  CASE_0004_CANDIDATES,
  CASE_0004_COUNTERFACTUAL_SCENARIOS,
  CASE_0004_IMPACT,
  CASE_0004_REPORT,
  CASE_0004_EVIDENCE_GRAPH,
} from '@/data/case0004Data';
import { SimulationStepId, CandidateVessel, SarMetadata } from '@/types/simulation';
import { CounterfactualEngine } from '@/services/simulationEngines/CounterfactualEngine';
import { AttributionEngine } from '@/services/simulationEngines/AttributionEngine';
import { buildDynamicEvidenceGraph } from '@/services/evidenceGraphBuilder';

const fallbackCounterfactualEngine = new CounterfactualEngine();
const attributionEngine = new AttributionEngine();

interface ScreeningIncident {
  incident_id: string;
  acquisition_id: string;
  product_id: string;
  zone_id: string;
  acquisition_time_utc: string;
  platform?: string;
  instrument_mode?: string;
  orbit_direction?: string;
  polarization?: string[];
  footprint?: any;
  bbox?: number[];
  candidate_geometry?: any;
  candidate_area_km2?: number | null;
  candidate_centroid?: [number, number] | null;
  triage_status: string;
  triage_source: string;
  triage_rationale?: string;
  model_version: string;
  quality_result?: {
    passed: boolean;
    reasons?: string[];
  };
  investigation_state?: string;
  created_at?: string;
  updated_at?: string;
}

function SimulationPageContent() {
  const searchParams = useSearchParams();
  const incidentId = searchParams?.get('incidentId') || null;

  const [incident, setIncident] = useState<ScreeningIncident | null>(null);
  const [incidentLoading, setIncidentLoading] = useState<boolean>(false);
  const [incidentError, setIncidentError] = useState<string | null>(null);
  const [candidatesList, setCandidatesList] = useState<CandidateVessel[]>(CASE_0004_CANDIDATES);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateVessel | null>(
    CASE_0004_CANDIDATES[0]
  );
  const [dynamicCounterfactual, setDynamicCounterfactual] = useState<any>(null);
  const [counterfactualLoading, setCounterfactualLoading] = useState<boolean>(false);
  const [historicalAisAvailable, setHistoricalAisAvailable] = useState<boolean>(false);
  const [aisLimitationNote, setAisLimitationNote] = useState<string | null>(null);

  // Dynamic parameter-driven counterfactual engine executor
  const runDynamicCounterfactual = useCallback(
    async (candidateToTest?: CandidateVessel | null, incidentObj?: ScreeningIncident | null) => {
      const activeInc = incidentObj !== undefined ? incidentObj : incident;
      const target = candidateToTest || selectedCandidate;
      if (!target) return;

      setCounterfactualLoading(true);

      const centerLat = activeInc ? (activeInc.candidate_centroid?.[1] ?? 3.5) : 55.2443;
      const centerLon = activeInc ? (activeInc.candidate_centroid?.[0] ?? 101.5) : 5.8856;
      const obsArea = activeInc ? (activeInc.candidate_area_km2 || 4.4) : 4.41;

      let candLat = target.trackWaypoints?.[0]?.lat ?? (target as any).lat;
      let candLon = target.trackWaypoints?.[0]?.lon ?? (target as any).lon;

      if (candLat === undefined || candLon === undefined || isNaN(Number(candLat)) || isNaN(Number(candLon))) {
        if (target.mmsi === '244710000') {
          candLat = 55.1884;
          candLon = 5.8122;
        } else if (target.mmsi === '311000245') {
          candLat = 55.3200;
          candLon = 5.7500;
        } else {
          candLat = centerLat - 0.05;
          candLon = centerLon - 0.05;
        }
      }

      const sogKn = target.speedAtClosestApproachKn ?? (target as any).sog ?? 12.0;
      const cogDeg = target.courseAtClosestApproachDeg ?? (target as any).cog ?? 52.0;

      const payload = {
        incident_id: activeInc ? activeInc.incident_id : 'CASE-0004-SAR-20180803-1725',
        candidate: {
          mmsi: target.mmsi,
          name: target.name,
          lat: Number(candLat),
          lon: Number(candLon),
          sog: Number(sogKn),
          cog: Number(cogDeg),
        },
        observed_slick: {
          centroid: { lat: centerLat, lon: centerLon },
          areaKm2: obsArea,
          axisHeadingDeg: 52.0,
        },
        duration_hours: 0.25,
        environment_source: 'PROTOTYPE_BASELINE',
      };

      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
        const res = await fetch(`${backendUrl}/api/simulation/counterfactual`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const data = await res.json();
          setDynamicCounterfactual({
            ...data,
            isDynamic: true,
            source: 'BACKEND COMPUTED',
          });
          setCounterfactualLoading(false);
          return;
        }
      } catch (err) {
        console.warn('Backend counterfactual endpoint unavailable; running dynamic local simulation fallback:', err);
      }

      // Mathematical local simulation fallback
      try {
        const localSim = fallbackCounterfactualEngine.runDynamicSimulation({
          vesselMmsi: target.mmsi,
          vesselName: target.name,
          candidateCoords: {
            lat: Number(candLat),
            lon: Number(candLon),
            sogKn: Number(sogKn),
            cogDeg: Number(cogDeg),
          },
          observedSlick: {
            centroid: { lat: centerLat, lon: centerLon },
            areaKm2: obsArea,
            axisHeadingDeg: 52.0,
          },
        });

        setDynamicCounterfactual({
          ...localSim,
          isDynamic: true,
          source: 'LOCAL PROTOTYPE FALLBACK',
        });
      } catch (fallbackErr) {
        console.error('Local counterfactual fallback failed:', fallbackErr);
      } finally {
        setCounterfactualLoading(false);
      }
    },
    [incident, selectedCandidate]
  );

  // Fetch incident and candidates if incidentId is provided in URL
  useEffect(() => {
    if (!incidentId) {
      setIncident(null);
      setCandidatesList(CASE_0004_CANDIDATES);
      setSelectedCandidate(CASE_0004_CANDIDATES[0]);
      runDynamicCounterfactual(CASE_0004_CANDIDATES[0], null);
      return;
    }

    let isMounted = true;
    setIncidentLoading(true);
    setIncidentError(null);

    const fetchIncidentAndCandidates = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
        const res = await fetch(`${backendUrl}/api/incidents/${encodeURIComponent(incidentId)}`);
        if (!res.ok) {
          throw new Error(`Incident not found (HTTP ${res.status})`);
        }
        const data = await res.json();
        if (isMounted) {
          setIncident(data);

          // Fetch dynamic candidate vessels correlated for this incident
          try {
            const candRes = await fetch(`${backendUrl}/api/incidents/${encodeURIComponent(incidentId)}/candidates`);
            if (candRes.ok) {
              const candData = await candRes.json();
              if (candData.candidates && candData.candidates.length > 0) {
                setCandidatesList(candData.candidates);
                setSelectedCandidate(candData.candidates[0]);
                setHistoricalAisAvailable(candData.historical_ais_available || false);
                setAisLimitationNote(candData.limitation_note || null);
                // Immediately trigger dynamic counterfactual for primary candidate
                runDynamicCounterfactual(candData.candidates[0], data);
              } else {
                setCandidatesList([]);
                setSelectedCandidate(null);
                setDynamicCounterfactual(null);
              }
            } else {
              setCandidatesList([]);
              setSelectedCandidate(null);
            }
          } catch (candErr) {
            console.warn('Could not fetch candidate vessels for incident:', candErr);
            setCandidatesList([]);
            setSelectedCandidate(null);
          }

          setIncidentLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setIncidentError(err.message || 'Failed to load incident');
          setIncidentLoading(false);
        }
      }
    };

    fetchIncidentAndCandidates();
    return () => {
      isMounted = false;
    };
  }, [incidentId, runDynamicCounterfactual]);

  // Dynamically derive SAR metadata when viewing a real screened incident
  const sarMetadata: SarMetadata = useMemo(() => {
    if (!incident) return CASE_0004_SAR_METADATA;

    const bbox = incident.bbox || [];
    const minLon = bbox[0] ?? 100.0;
    const minLat = bbox[1] ?? 1.0;
    const maxLon = bbox[2] ?? 105.0;
    const maxLat = bbox[3] ?? 4.0;
    const centerLat = incident.candidate_centroid?.[1] ?? (minLat + maxLat) / 2;
    const centerLon = incident.candidate_centroid?.[0] ?? (minLon + maxLon) / 2;

    return {
      sampleId: incident.incident_id,
      productId: incident.product_id,
      platform: incident.platform || 'Sentinel-1',
      sensorMode: incident.instrument_mode || 'IW (Interferometric Wide Swath)',
      polarizations: Array.isArray(incident.polarization) ? incident.polarization : ['VV', 'VH'],
      orbitNumber: incident.orbit_direction || 'Ascending',
      passDirection: incident.orbit_direction || 'Ascending',
      acquisitionTimestamp: incident.acquisition_time_utc,
      geographicBbox: {
        minLat,
        maxLat,
        minLon,
        maxLon,
        centerLat,
        centerLon,
      },
      slickBbox: {
        minLat: centerLat - 0.04,
        maxLat: centerLat + 0.04,
        minLon: centerLon - 0.04,
        maxLon: centerLon + 0.04,
        centerLat,
        centerLon,
      },
      pixelCount: 12500,
      slickAreaKm2: incident.candidate_area_km2 || 1.85,
      sceneDimensions: { width: 2048, height: 2048 },
      contrastDamping: {
        vvWaterDb: -22.5,
        vvOilDb: -28.2,
        vvDampingDb: 5.7,
        vhWaterDb: -24.0,
        vhOilDb: -30.0,
        vhDampingDb: 6.0,
      },
    };
  }, [incident]);

  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeOverlayMode, setActiveOverlayMode] = useState<
    'none' | 'vv' | 'composite' | 'mask' | 'overlay'
  >('none');
  const [overlayOpacity, setOverlayOpacity] = useState<number>(0.85);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [isEvidenceGraphOpen, setIsEvidenceGraphOpen] = useState<boolean>(false);

  // Stage 11 Impact Prioritization live forecast state
  const [impactHours, setImpactHours] = useState<number>(0);
  const [isImpactPlaying, setIsImpactPlaying] = useState<boolean>(false);
  const [impactLayers, setImpactLayers] = useState({
    coastalExposure: true,
    ecological: false,
    fisheries: false,
    population: false,
  });

  const currentStep = SIMULATION_STEPS[currentStepIndex];

  // Adjust default map overlays when advancing steps
  useEffect(() => {
    if (currentStep.id === 'sar_acquisition' || currentStep.id === 'sar_processing') {
      setActiveOverlayMode('vv');
    } else if (currentStep.id === 'detection') {
      setActiveOverlayMode('composite');
    } else if (currentStep.id === 'segmentation') {
      setActiveOverlayMode('overlay');
    }
  }, [currentStep.id]);

  // Step advancement handlers
  const handlePrevStep = useCallback(() => {
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNextStep = useCallback(() => {
    setCurrentStepIndex((prev) => Math.min(SIMULATION_STEPS.length - 1, prev + 1));
  }, []);

  const handleSelectStep = useCallback((stepId: SimulationStepId) => {
    const idx = SIMULATION_STEPS.findIndex((s) => s.id === stepId);
    if (idx !== -1) {
      setCurrentStepIndex(idx);
    }
  }, []);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setCurrentStepIndex(0);
    setActiveOverlayMode('none');
    setSelectedCandidate(CASE_0004_CANDIDATES[0]);
    setImpactHours(0);
    setIsImpactPlaying(false);
  }, []);

  const handleTogglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const handleOpenEvidenceGraph = useCallback(() => {
    setIsEvidenceGraphOpen(true);
  }, []);

  const handleNavigateFromGraph = useCallback(
    (stepId: SimulationStepId) => {
      handleSelectStep(stepId);
      setIsEvidenceGraphOpen(false);
    },
    [handleSelectStep]
  );

  // Auto-play timer for smooth 2-3 minute presentation
  // 12 stages x 11 seconds = 132 seconds (~2.2 minutes total demo duration)
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < SIMULATION_STEPS.length - 1) {
          return prev + 1;
        } else {
          setIsPlaying(false);
          setIsReportModalOpen(true); // Automatically open formal report at completion
          return prev;
        }
      });
    }, 11000);

    return () => clearInterval(interval);
  }, [isPlaying]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        handleNextStep();
      } else if (e.key === 'ArrowLeft') {
        handlePrevStep();
      } else if (e.key === ' ' && (e.target as HTMLElement)?.tagName !== 'INPUT') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.key === 'Escape') {
        setIsReportModalOpen(false);
        setIsEvidenceGraphOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNextStep, handlePrevStep, handleTogglePlay]);

  // Dynamically constructed 9-node evidence chain graph reflecting active case state
  const dynamicEvidenceGraph = useMemo(() => {
    const cand = selectedCandidate || (candidatesList && candidatesList[0]) || CASE_0004_CANDIDATES[0];
    const attrExecution = attributionEngine.execute({
      vessel: cand,
      counterfactualResult: dynamicCounterfactual,
      slickAxisDeg: 52.0,
    });
    return buildDynamicEvidenceGraph({
      sarMetadata,
      metocean: CASE_0004_METOCEAN,
      sourceRecon: CASE_0004_SOURCE_RECONSTRUCTION,
      candidate: cand,
      counterfactualResult: dynamicCounterfactual?.testResult || null,
      attributionScore: attrExecution.result.attributionScore,
      impact: CASE_0004_IMPACT,
      isLiveDerived: Boolean(incident),
    });
  }, [sarMetadata, selectedCandidate, candidatesList, dynamicCounterfactual, incident]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#070A10] select-none flex flex-col">
      {/* Top Header with Mode Switcher and Prominent MODE: SIMULATION / INCIDENT Banner */}
      <SimulationHeaderBar
        currentStep={currentStep}
        currentStepIndex={currentStepIndex}
        totalSteps={SIMULATION_STEPS.length}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        onPrevStep={handlePrevStep}
        onNextStep={handleNextStep}
        onReset={handleReset}
        onOpenReport={() => setIsReportModalOpen(true)}
        onOpenEvidenceGraph={handleOpenEvidenceGraph}
        incidentId={incident ? incident.incident_id : null}
        zoneName={incident ? incident.zone_id : null}
      />

      {/* Main Workspace (Offset below fixed header) */}
      <div className="pt-16 flex flex-col flex-1 h-full overflow-hidden">
        {/* Real vs Derived vs Prototype Provenance HUD Strip */}
        {incident && (
          <div className="bg-[#0A0E18] border-b border-amber-500/30 px-4 py-2 flex flex-wrap items-center justify-between text-xs font-mono gap-2 z-20 shadow-md">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="flex items-center gap-1.5 font-bold text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                INCIDENT: {incident.incident_id}
              </span>
              <span className="text-zinc-600 hidden sm:inline">|</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold" title="Sentinel-1 SAR acquisition, radar damping, geographic bounding box, and AIS telemetry">
                REAL: Sentinel-1 SAR Metadata · AIS Telemetry · Incident Geometry
              </span>
              <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[10px] font-semibold" title="Kinematic vessel tracking, forward Lagrangian plume, geometric consistency, and hypothesis verdict">
                DERIVED: Counterfactual Vessel Drift · Plume Cloud · Consistency Metrics · Verdict
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-semibold" title="Calm sea-state kinematic forcing baseline (CMEMS / ERA5 pending integration)">
                PROTOTYPE: Environmental Baseline Forcing
              </span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="/simulation"
                className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white border border-white/15 text-[10px] font-bold tracking-wider transition-colors cursor-pointer"
                title="Switch back to static Case 0004 benchmark"
              >
                ← CASE 0004 BENCHMARK
              </a>
            </div>
          </div>
        )}

        {/* 12-Stage Interactive Pipeline Navigation Bar */}
        <SimulationPipelineNav
          steps={SIMULATION_STEPS}
          currentStepId={currentStep.id}
          onSelectStep={handleSelectStep}
        />

        {/* 70 / 30 Investigation Split View */}
        <div className="flex flex-1 h-full overflow-hidden relative">
          {/* Left ~70%: Primary Visual (Dominates Screen) */}
          <div className="flex-1 h-full relative overflow-hidden">
            <SimulationPrimaryVisual
              currentStepId={currentStep.id}
              sarMetadata={sarMetadata}
              metocean={CASE_0004_METOCEAN}
              sourceRecon={CASE_0004_SOURCE_RECONSTRUCTION}
              candidates={incident ? candidatesList : CASE_0004_CANDIDATES}
              counterfactual={CASE_0004_COUNTERFACTUAL_SCENARIOS}
              impact={CASE_0004_IMPACT}
              selectedCandidate={selectedCandidate}
              onSelectCandidate={(cand) => {
                setSelectedCandidate(cand);
                runDynamicCounterfactual(cand, incident);
              }}
              activeOverlayMode={activeOverlayMode}
              onChangeOverlayMode={setActiveOverlayMode}
              overlayOpacity={overlayOpacity}
              onChangeOverlayOpacity={setOverlayOpacity}
              onOpenReport={() => setIsReportModalOpen(true)}
              onOpenEvidenceGraph={handleOpenEvidenceGraph}
              impactHours={impactHours}
              onChangeImpactHours={setImpactHours}
              isImpactPlaying={isImpactPlaying}
              onToggleImpactPlay={() => setIsImpactPlaying(!isImpactPlaying)}
              impactLayers={impactLayers}
              onToggleImpactLayer={(key) =>
                setImpactLayers((prev) => ({ ...prev, [key]: !prev[key] }))
              }
              dynamicCounterfactual={dynamicCounterfactual}
              onRunCounterfactual={(cand) =>
                runDynamicCounterfactual(cand || selectedCandidate, incident)
              }
            />
          </div>

          {/* Forensic Telemetry & Analysis Side Inspector */}
          <SimulationInspector
            currentStep={currentStep}
            currentStepIndex={currentStepIndex}
            totalSteps={SIMULATION_STEPS.length}
            sarMetadata={sarMetadata}
            metocean={CASE_0004_METOCEAN}
            sourceRecon={CASE_0004_SOURCE_RECONSTRUCTION}
            candidates={incident ? candidatesList : CASE_0004_CANDIDATES}
            counterfactual={CASE_0004_COUNTERFACTUAL_SCENARIOS}
            impact={CASE_0004_IMPACT}
            selectedCandidate={selectedCandidate}
            onSelectCandidate={(cand) => {
              setSelectedCandidate(cand);
              runDynamicCounterfactual(cand, incident);
            }}
            activeOverlayMode={activeOverlayMode}
            onChangeOverlayMode={setActiveOverlayMode}
            overlayOpacity={overlayOpacity}
            onChangeOverlayOpacity={setOverlayOpacity}
            onPrevStep={handlePrevStep}
            onNextStep={handleNextStep}
            onOpenReport={() => setIsReportModalOpen(true)}
            onOpenEvidenceGraph={handleOpenEvidenceGraph}
            impactHours={impactHours}
            dynamicCounterfactual={dynamicCounterfactual}
          />
        </div>
      </div>

      {/* Official Incident Investigation Report Modal */}
      <IncidentReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        report={CASE_0004_REPORT}
        sarMetadata={sarMetadata}
        metocean={CASE_0004_METOCEAN}
        sourceRecon={CASE_0004_SOURCE_RECONSTRUCTION}
        primarySuspect={selectedCandidate || CASE_0004_CANDIDATES[0]}
        impact={CASE_0004_IMPACT}
        counterfactualResult={dynamicCounterfactual?.testResult || null}
      />

      {/* Interactive Evidence Chain Graph Modal */}
      <EvidenceGraphModal
        isOpen={isEvidenceGraphOpen}
        onClose={() => setIsEvidenceGraphOpen(false)}
        graphData={dynamicEvidenceGraph}
        onNavigateToStep={handleNavigateFromGraph}
      />
    </main>
  );
}

export default function SimulationPage() {
  return (
    <Suspense fallback={
      <div className="w-screen h-screen bg-[#070A10] flex items-center justify-center text-zinc-400 font-mono text-xs">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>LOADING AQUATRACE INVESTIGATION WORKSTATION...</span>
        </div>
      </div>
    }>
      <SimulationPageContent />
    </Suspense>
  );
}
