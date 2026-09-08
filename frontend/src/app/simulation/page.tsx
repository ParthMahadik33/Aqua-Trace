'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import { SimulationStepId, CandidateVessel } from '@/types/simulation';

export default function SimulationPage() {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateVessel | null>(
    CASE_0004_CANDIDATES[0]
  );
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

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#070A10] select-none flex flex-col">
      {/* Top Header with Mode Switcher and Prominent MODE: SIMULATION Banner */}
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
      />

      {/* Main Workspace (Offset below fixed header) */}
      <div className="pt-16 flex flex-col flex-1 h-full overflow-hidden">
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
              sarMetadata={CASE_0004_SAR_METADATA}
              metocean={CASE_0004_METOCEAN}
              sourceRecon={CASE_0004_SOURCE_RECONSTRUCTION}
              candidates={CASE_0004_CANDIDATES}
              counterfactual={CASE_0004_COUNTERFACTUAL_SCENARIOS}
              impact={CASE_0004_IMPACT}
              selectedCandidate={selectedCandidate}
              onSelectCandidate={setSelectedCandidate}
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
            />
          </div>

          {/* Forensic Telemetry & Analysis Side Inspector */}
          <SimulationInspector
            currentStep={currentStep}
            currentStepIndex={currentStepIndex}
            totalSteps={SIMULATION_STEPS.length}
            sarMetadata={CASE_0004_SAR_METADATA}
            metocean={CASE_0004_METOCEAN}
            sourceRecon={CASE_0004_SOURCE_RECONSTRUCTION}
            candidates={CASE_0004_CANDIDATES}
            counterfactual={CASE_0004_COUNTERFACTUAL_SCENARIOS}
            impact={CASE_0004_IMPACT}
            selectedCandidate={selectedCandidate}
            onSelectCandidate={setSelectedCandidate}
            activeOverlayMode={activeOverlayMode}
            onChangeOverlayMode={setActiveOverlayMode}
            overlayOpacity={overlayOpacity}
            onChangeOverlayOpacity={setOverlayOpacity}
            onPrevStep={handlePrevStep}
            onNextStep={handleNextStep}
            onOpenReport={() => setIsReportModalOpen(true)}
            onOpenEvidenceGraph={handleOpenEvidenceGraph}
            impactHours={impactHours}
          />
        </div>
      </div>

      {/* Official Incident Investigation Report Modal */}
      <IncidentReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        report={CASE_0004_REPORT}
        sarMetadata={CASE_0004_SAR_METADATA}
        metocean={CASE_0004_METOCEAN}
        sourceRecon={CASE_0004_SOURCE_RECONSTRUCTION}
        primarySuspect={CASE_0004_CANDIDATES[0]}
        impact={CASE_0004_IMPACT}
      />

      {/* Interactive Evidence Chain Graph Modal */}
      <EvidenceGraphModal
        isOpen={isEvidenceGraphOpen}
        onClose={() => setIsEvidenceGraphOpen(false)}
        graphData={CASE_0004_EVIDENCE_GRAPH}
        onNavigateToStep={handleNavigateFromGraph}
      />
    </main>
  );
}
