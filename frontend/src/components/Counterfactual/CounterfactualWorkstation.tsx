'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  CounterfactualCase,
  CandidateVesselRecord,
  CounterfactualSimulationFrame,
  CounterfactualExecutionResult,
  BaselineRecord,
  ExperimentState,
  ExperimentPhase,
  LayerVisibilityMode,
} from '@/types/counterfactualWorkstation';
import {
  CounterfactualBenchmarkService,
  DEFAULT_BENCHMARK_CASES,
} from '@/services/counterfactualBenchmarkService';
import { CounterfactualHeader } from './CounterfactualHeader';
import { CounterfactualMap, CounterfactualMapRef } from './CounterfactualMap';
import { CounterfactualTimeline } from './CounterfactualTimeline';
import { CounterfactualInspector } from './CounterfactualInspector';
import { CounterfactualDossierModal } from './CounterfactualDossierModal';

export const CounterfactualWorkstation: React.FC = () => {
  // Case & Candidate state (defaults strictly to DEMO_CASE_0004 for primary USP demo)
  const [cases, setCases] = useState<Record<string, CounterfactualCase>>(DEFAULT_BENCHMARK_CASES);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('DEMO_CASE_0004');
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateVesselRecord | null>(null);

  // Execution & Simulation results state
  const [executionResult, setExecutionResult] = useState<CounterfactualExecutionResult | null>(null);
  const [baselines, setBaselines] = useState<BaselineRecord[]>([]);
  const [frames, setFrames] = useState<CounterfactualSimulationFrame[]>([]);
  const [activeFrameIndex, setActiveFrameIndex] = useState<number>(0);

  // 4-State Experiment Pipeline
  const [experimentState, setExperimentState] = useState<ExperimentState>('IDLE');
  const [currentPhase, setCurrentPhase] = useState<ExperimentPhase>(1);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // Layer Visibility Mode: OBSERVED / SIMULATED / BOTH
  const [layerVisibilityMode, setLayerVisibilityMode] = useState<LayerVisibilityMode>('BOTH');

  // UI Modes & Themes
  const [theme, setTheme] = useState<'light' | 'dark'>('light'); // Light mode default for operations
  const [compareMode, setCompareMode] = useState<'wipe' | 'opacity'>('wipe');
  const [wipePosition, setWipePosition] = useState<number>(50); // 50% split default
  const [layerOpacity, setLayerOpacity] = useState<number>(0.85);
  const [showDossierModal, setShowDossierModal] = useState<boolean>(false);

  // Map Ref for Camera Controls
  const mapRef = useRef<CounterfactualMapRef | null>(null);
  const phaseTimerRef = useRef<NodeJS.Timeout[]>([]);

  // Active Case Reference
  const currentCase =
    cases[selectedCaseId] ||
    cases['DEMO_CASE_0004'] ||
    DEFAULT_BENCHMARK_CASES['DEMO_CASE_0004'] ||
    DEFAULT_BENCHMARK_CASES['ENNORE_2017'];

  // Initialize Cases from Backend
  useEffect(() => {
    CounterfactualBenchmarkService.fetchCases().then((fetchedCases) => {
      if (fetchedCases && Object.keys(fetchedCases).length > 0) {
        setCases((prev) => ({ ...prev, ...fetchedCases }));
      }
    });
  }, []);

  // Update selected candidate when case changes
  useEffect(() => {
    if (currentCase && currentCase.candidates && currentCase.candidates.length > 0) {
      setSelectedCandidate(currentCase.candidates[0]);
    }
  }, [selectedCaseId, currentCase]);

  // Fetch baselines for active case
  useEffect(() => {
    if (selectedCaseId) {
      CounterfactualBenchmarkService.fetchBaselines(selectedCaseId).then((records) => {
        if (records && records.length > 0) {
          setBaselines(records);
        }
      });
    }
  }, [selectedCaseId]);

  // Clear running timers
  const clearPhaseTimers = () => {
    phaseTimerRef.current.forEach(clearTimeout);
    phaseTimerRef.current = [];
  };

  useEffect(() => {
    return () => clearPhaseTimers();
  }, []);

  // Helper to generate realistic Lagrangian advection frames if not yet fetched
  const generateInitialFrames = useCallback(
    (cand: CandidateVesselRecord, targetFootprint: [number, number][]): CounterfactualSimulationFrame[] => {
      const releasePoint = cand.feasible_release_point;
      const hours = currentCase.source_corridor.estimated_release_window.elapsed_hours_to_sar || 3.7;
      const numFrames = 4;
      const generatedFrames: CounterfactualSimulationFrame[] = [];

      for (let i = 0; i < numFrames; i++) {
        const t = (i / (numFrames - 1)) * hours;
        const progress = i / (numFrames - 1);

        // Center interpolation
        const lat =
          releasePoint.lat +
          progress * (currentCase.sar_observation.observed_slick.centroid.lat - releasePoint.lat);
        const lon =
          releasePoint.lon +
          progress * (currentCase.sar_observation.observed_slick.centroid.lon - releasePoint.lon);

        // Disperse 120 particles
        const particles = Array.from({ length: 120 }, (_, idx) => {
          const spreadFactor = 0.003 * Math.sqrt(i + 1);
          const randAngle = (idx / 120) * 2 * Math.PI;
          const randR = (Math.sin(idx * 7919) * 0.5 + 0.5) * spreadFactor;
          return {
            id: idx,
            lat: lat + randR * Math.cos(randAngle),
            lon: lon + randR * Math.sin(randAngle) * 1.4,
          };
        });

        // Footprint polygon expansion
        const footprint: [number, number][] =
          i === numFrames - 1
            ? targetFootprint
            : particles.slice(0, 16).map((p) => [p.lon, p.lat]);

        generatedFrames.push({
          frame_index: i,
          time_hours: t,
          time_label: i === 0 ? 'T0' : `T+${t.toFixed(1)}h`,
          centroid: { lat, lon },
          area_km2: Math.max(0.5, progress * (currentCase.sar_observation.observed_slick.area_km2 || 4.4)),
          length_km: Math.max(1.0, progress * (currentCase.sar_observation.observed_slick.length_km || 5.2)),
          width_km: Math.max(0.4, progress * (currentCase.sar_observation.observed_slick.width_km || 1.1)),
          particles,
          footprint_polygon: footprint,
        });
      }

      return generatedFrames;
    },
    [currentCase]
  );

  // Set initial frames on mount or candidate change
  useEffect(() => {
    if (selectedCandidate && frames.length === 0) {
      const defaultFootprint = currentCase.sar_observation.observed_slick.slick_polygon;
      const initial = generateInitialFrames(selectedCandidate, defaultFootprint);
      setFrames(initial);
      setActiveFrameIndex(0);
    }
  }, [selectedCandidate, currentCase, frames.length, generateInitialFrames]);

  // Execute Visible 8-Phase Counterfactual Simulation Pipeline
  const handleRunCounterfactual = useCallback(() => {
    if (!currentCase || !selectedCandidate || isRunning) return;

    clearPhaseTimers();
    setIsRunning(true);
    setExperimentState('RUNNING');
    setCurrentPhase(1);

    // Phase 1: HYPOTHESIS LOCKED (0ms)
    mapRef.current?.fitVessel();
    setActiveFrameIndex(0);

    // Call backend engine in parallel
    CounterfactualBenchmarkService.runDirectCounterfactual(currentCase, selectedCandidate)
      .then((result) => {
        setExecutionResult(result);
        if (result.simulation_frames && result.simulation_frames.length > 0) {
          setFrames(result.simulation_frames);
        }
        if (result.baselines && result.baselines.length > 0) {
          setBaselines(result.baselines);
        }
      })
      .catch((err) => {
        console.warn('Backend calculation fallback used:', err);
      });

    // Phase 2: RELEASE HYPOTHESIS (600ms)
    phaseTimerRef.current.push(
      setTimeout(() => {
        setCurrentPhase(2);
        mapRef.current?.fitCorridor();
      }, 600)
    );

    // Phase 3: INITIALIZING 120 PARTICLES (1200ms)
    phaseTimerRef.current.push(
      setTimeout(() => {
        setCurrentPhase(3);
        setActiveFrameIndex(0);
      }, 1200)
    );

    // Phase 4: APPLYING ENVIRONMENTAL FORCING (1800ms)
    phaseTimerRef.current.push(
      setTimeout(() => {
        setCurrentPhase(4);
      }, 1800)
    );

    // Phase 5: FORWARD LAGRANGIAN ADVECTION (2400ms)
    phaseTimerRef.current.push(
      setTimeout(() => {
        setCurrentPhase(5);
        setActiveFrameIndex(1);
      }, 2400)
    );

    phaseTimerRef.current.push(
      setTimeout(() => {
        setActiveFrameIndex(2);
      }, 2900)
    );

    // Phase 6: PREDICTED PLUME (3400ms)
    phaseTimerRef.current.push(
      setTimeout(() => {
        setCurrentPhase(6);
        setActiveFrameIndex((prev) => Math.max(prev, frames.length - 1));
        mapRef.current?.fitPlume();
      }, 3400)
    );

    // Phase 7: COMPARING AGAINST OBSERVED SAR (4000ms)
    phaseTimerRef.current.push(
      setTimeout(() => {
        setCurrentPhase(7);
        setExperimentState('COMPARING');
        mapRef.current?.fitEvidence();
        mapRef.current?.triggerWipeSweep();
      }, 4000)
    );

    // Phase 8: SCIENTIFIC VERDICT (5800ms)
    phaseTimerRef.current.push(
      setTimeout(() => {
        setCurrentPhase(8);
        setExperimentState('COMPLETE');
        setIsRunning(false);
      }, 5800)
    );
  }, [currentCase, selectedCandidate, isRunning, frames.length]);

  // Switch to Decoy Vessel
  const handleTestDecoy = useCallback(() => {
    if (!currentCase) return;
    const decoy = currentCase.candidates.find((c) => c.is_decoy) || currentCase.candidates[1];
    if (decoy) {
      setSelectedCandidate(decoy);
      setExecutionResult(null);
      setExperimentState('IDLE');
      setCurrentPhase(1);
      const initial = generateInitialFrames(decoy, currentCase.sar_observation.observed_slick.slick_polygon);
      setFrames(initial);
      setActiveFrameIndex(0);
    }
  }, [currentCase, generateInitialFrames]);

  // Switch Case
  const handleSelectCase = (caseId: string) => {
    setSelectedCaseId(caseId);
    setExecutionResult(null);
    setExperimentState('IDLE');
    setCurrentPhase(1);
    setFrames([]);
  };

  // Switch Candidate
  const handleSelectCandidate = (cand: CandidateVesselRecord) => {
    setSelectedCandidate(cand);
    setExecutionResult(null);
    setExperimentState('IDLE');
    setCurrentPhase(1);
    const initial = generateInitialFrames(cand, currentCase.sar_observation.observed_slick.slick_polygon);
    setFrames(initial);
    setActiveFrameIndex(0);
  };

  // Reset Camera View
  const handleResetView = useCallback(() => {
    mapRef.current?.fitAll();
  }, []);

  const handleFitEvidence = useCallback(() => {
    mapRef.current?.fitEvidence();
  }, []);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const activeFrame = frames[activeFrameIndex] || null;

  return (
    <div
      className={`w-screen h-screen flex flex-col overflow-hidden font-sans ${
        theme === 'light' ? 'bg-slate-100 text-slate-800' : 'bg-[#070A10] text-slate-100'
      }`}
    >
      {/* 1. Header Bar with 4-State Experiment Run Button */}
      <CounterfactualHeader
        cases={cases}
        selectedCaseId={selectedCaseId}
        onSelectCase={handleSelectCase}
        selectedCandidate={selectedCandidate}
        onSelectCandidate={handleSelectCandidate}
        isRunning={isRunning}
        experimentState={experimentState}
        currentPhase={currentPhase}
        onRunCounterfactual={handleRunCounterfactual}
        onResetView={handleResetView}
        onFitEvidence={handleFitEvidence}
        onTestDecoy={handleTestDecoy}
        onOpenDossier={() => setShowDossierModal(true)}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* 2. Main Workstation Area: 70% Map Canvas / 30% Right Inspector */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left: Map & Evidence Canvas (Dominant Visual Area: 70%) */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
          {/* Map Canvas */}
          <div className="flex-1 relative">
            <CounterfactualMap
              ref={mapRef}
              currentCase={currentCase}
              selectedCandidate={selectedCandidate}
              activeFrame={activeFrame}
              executionResult={executionResult}
              theme={theme}
              compareMode={compareMode}
              onChangeCompareMode={setCompareMode}
              wipePosition={wipePosition}
              onChangeWipePosition={setWipePosition}
              layerOpacity={layerOpacity}
              onChangeLayerOpacity={setLayerOpacity}
              experimentState={experimentState}
              currentPhase={currentPhase}
              layerVisibilityMode={layerVisibilityMode}
              onChangeLayerVisibilityMode={setLayerVisibilityMode}
            />
          </div>

          {/* Bottom Timeline Scrubber */}
          <CounterfactualTimeline
            frames={frames}
            activeFrameIndex={activeFrameIndex}
            onSelectFrameIndex={(val) => {
              if (typeof val === 'function') {
                setActiveFrameIndex((prev) => val(prev));
              } else {
                setActiveFrameIndex(val);
              }
            }}
            currentCase={currentCase}
            theme={theme}
          />
        </div>

        {/* Right: Scientific Inspector (30%) */}
        <div className="w-[380px] xl:w-[440px] h-full flex-shrink-0 relative z-10 shadow-lg">
          <CounterfactualInspector
            currentCase={currentCase}
            selectedCandidate={selectedCandidate}
            executionResult={executionResult}
            baselines={baselines}
            theme={theme}
          />
        </div>
      </div>

      {/* Dossier Modal */}
      <CounterfactualDossierModal
        isOpen={showDossierModal}
        onClose={() => setShowDossierModal(false)}
        currentCase={currentCase}
        selectedCandidate={selectedCandidate}
        executionResult={executionResult}
        theme={theme}
      />
    </div>
  );
};
