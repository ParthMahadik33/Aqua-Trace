export type SimulationStepId =
  | 'surveillance'
  | 'sar_acquisition'
  | 'sar_processing'
  | 'detection'
  | 'segmentation'
  | 'environmental'
  | 'source_reconstruction'
  | 'ais_correlation'
  | 'attribution'
  | 'counterfactual'
  | 'impact_prioritization'
  | 'report';

export type SimulationStatusTag =
  | 'REAL SAR DATA'
  | 'REAL METADATA'
  | 'LIVE AIS'
  | 'PROTOTYPE MODEL'
  | 'SIMULATED INPUT'
  | 'MODEL ESTIMATE'
  | 'SIMULATED HINDCAST'
  | 'DERIVED RESULT'
  | 'ANALYST REVIEW REQUIRED';

export interface SimulationStepConfig {
  id: SimulationStepId;
  index: number;
  numberStr: string;
  title: string;
  shortTitle: string;
  statusTag: SimulationStatusTag;
  statusColor: 'cyan' | 'purple' | 'amber' | 'emerald' | 'rose' | 'blue';
  badgeLabel: string;
  headline: string;
  subheadline: string;
  description: string;
  bulletFindings: string[];
  primaryMetrics: {
    label: string;
    value: string;
    sublabel?: string;
    highlight?: boolean;
    color?: string;
  }[];
}

export interface SarMetadata {
  sampleId: string;
  productId: string;
  platform: string;
  sensorMode: string;
  polarizations: string[];
  orbitNumber: string;
  passDirection: string;
  acquisitionTimestamp: string;
  geographicBbox: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
    centerLat: number;
    centerLon: number;
  };
  slickBbox: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
    centerLat: number;
    centerLon: number;
  };
  pixelCount: number;
  slickAreaKm2: number;
  sceneDimensions: {
    width: number;
    height: number;
  };
  contrastDamping: {
    vvWaterDb: number;
    vvOilDb: number;
    vvDampingDb: number;
    vhWaterDb: number;
    vhOilDb: number;
    vhDampingDb: number;
  };
}

export interface SurveillanceFeedItem {
  id: string;
  satellite: string;
  timeUtc: string;
  date: string;
  status: 'PROCESSED' | 'ALERT_NEW' | 'INGESTING';
  sector: string;
  swathKm: number;
  orbit: string;
  anomalyDetected: boolean;
}

export interface SarVisualStage {
  id: string;
  name: string;
  shortCode: string;
  statusTag: SimulationStatusTag;
  description: string;
  previewUrl: string;
  attributes: { label: string; value: string }[];
}

export interface MetoceanContext {
  timestamp: string;
  windSpeedMs: number;
  windSpeedKnots: number;
  windDirectionDeg: number;
  windCompass: string;
  currentVelocityMs: number;
  currentVelocityKnots: number;
  currentDirectionDeg: number;
  currentCompass: string;
  seaSurfaceTempC: number;
  significantWaveHeightM: number;
  atmosphericPressureHpa: number;
  visibilityKm: number;
  chlorophyllConcentration: string;
  naturalSeepRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  biogenicLookalikeRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  lowWindShadowRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  dampingSuitability: 'OPTIMAL' | 'MARGINAL' | 'UNSUITABLE';
  contextConsistency: 'HIGH' | 'MODERATE' | 'LOW';
  interpretationVerdict: string; // e.g. "PROBABLE OIL-LIKE ANOMALY"
}

export interface EnsembleTrajectory {
  ensembleId: number;
  weight: number;
  color: string;
  waypoints: {
    hoursAgo: number;
    timestamp: string;
    lat: number;
    lon: number;
    windVectorMs: number;
    currentVectorMs: number;
  }[];
}

export interface SourceReconstructionModel {
  originCentroid: {
    lat: number;
    lon: number;
  };
  originEllipse: {
    semiMajorNm: number;
    semiMinorNm: number;
    orientationDeg: number;
  };
  estimatedReleaseStartUtc: string;
  estimatedReleaseEndUtc: string;
  estimatedSpillVolumeM3: number;
  spillVolumeRange: [number, number];
  oilTypeEstimate: string;
  bonnAppearanceCode: number;
  bonnDescription: string;
  sourceConfidenceScore: number;
  sourceHypothesisStatus: string;
  parameters: {
    simulationHorizonHours: number;
    timeStepMinutes: number;
    windForcingModel: string;
    currentForcingModel: string;
    windageCoeffPercent: number;
    diffusionDispersionM2s: number;
    ensembleSize: number;
  };
  ensembleTrajectories: EnsembleTrajectory[];
  trajectoryPoints: {
    hoursAgo: number;
    timestamp: string;
    lat: number;
    lon: number;
    windComponentMs: number;
    currentVelocityMs: number;
    confidenceRadiusNm: number;
  }[];
}

export interface AisFunnelStep {
  stepNumber: number;
  title: string;
  count: number;
  filterCriteria: string;
  eliminatedCount: number;
  status: string;
}

export interface CandidateVessel {
  mmsi: string;
  imo: string;
  name: string;
  vesselType: string;
  flag: string;
  dwt: number;
  lengthM: number;
  beamM: number;
  builtYear: number;
  originPort: string;
  destinationPort: string;
  closestApproachDistanceNm: number;
  closestApproachTimeUtc: string;
  speedAtClosestApproachKn: number;
  courseAtClosestApproachDeg: number;
  speedAnomalyDipKn: number;
  attributionScore: number; // 0-100%
  isPrimarySuspect: boolean;
  funnelStageSurvived: number; // 1-5
  eliminationReason?: string;
  attributionFactors: {
    name: string;
    score: number; // 0-100
    weight: number;
    assessment: string;
  }[];
  supportingEvidence: string[];
  limitations: string[];
  trackWaypoints: {
    timestamp: string;
    lat: number;
    lon: number;
    speedKn: number;
    courseDeg: number;
  }[];
}

export interface CounterfactualTestResult {
  hypothesisTested: string;
  candidateMmsi: string;
  candidateName: string;
  simulatedReleaseTimeUtc: string;
  simulatedReleaseCoords: { lat: number; lon: number };
  simulatedDischargeRateM3h: number;
  overlapDiceCoefficient: number; // 0.0 - 1.0
  orientationDeltaDeg: number;
  centroidOffsetDistanceNm: number;
  volumePlausibilityScore: number; // 0-100
  verdict: 'SUPPORTED' | 'WEAK' | 'INCONCLUSIVE';
  verdictLabel: string;
  summaryExplanation: string;
  observedSlickStats: {
    areaKm2: number;
    lengthKm: number;
    widthKm: number;
    axisHeadingDeg: number;
  };
  simulatedSlickStats: {
    areaKm2: number;
    lengthKm: number;
    widthKm: number;
    axisHeadingDeg: number;
  };
}

export interface CounterfactualScenario {
  id: string;
  name: string;
  description: string;
  driftProjectionHours: number;
  forecastCentroidT12: { lat: number; lon: number };
  forecastCentroidT24: { lat: number; lon: number };
  forecastCentroidT48: { lat: number; lon: number };
  projectedSurfaceAreaKm2: number;
  recoveryVolumeM3: number;
  beachingProbabilityPercent: number;
  nearestShorelineImpactHours: number;
  coastalZoneImpacted: string;
  mitigationEffectiveness: string;
}

export interface ImpactPrioritization {
  overallRiskScore: number; // 0-100
  responsePriority: 'HIGH (TIER-2 REGIONAL INTERVENTION)' | 'MODERATE' | 'LOW';
  ecologicalVulnerabilityIndex: number; // 0-100
  economicExposureUsdM: number;
  protectedAreasNearby: {
    name: string;
    distanceKm: number;
    designation: string;
    status: 'IMMINENT THREAT' | 'MONITORED' | 'LOW RISK';
  }[];
  biologicalResourcesAtRisk: string[];
  recommendedActionPlan: string[];
  uncertaintyFactors: string[];
}

export interface EvidenceGraphNode {
  id: string;
  stepId: SimulationStepId;
  label: string;
  stageName: string;
  sourceStatus: SimulationStatusTag;
  statusBadgeColor: 'cyan' | 'purple' | 'amber' | 'emerald' | 'rose';
  valueSummary: string;
  confidenceScore: number; // 0-100%
  supportingMetrics: { label: string; value: string }[];
  limitationsOrNotes: string;
}

export interface EvidenceGraphEdge {
  from: string;
  to: string;
  relationLabel: string;
}

export interface IncidentReportDossier {
  caseId: string;
  incidentRef: string;
  generatedDate: string;
  reportingOfficer: string;
  leadInvestigator: string;
  classificationAuthority: string;
  cryptographicEvidenceHash: string;
  executiveSummary: string;
  vesselOfInterestParticulars: {
    name: string;
    imo: string;
    mmsi: string;
    flag: string;
    type: string;
    dwt: number;
    attributionScore: number;
  };
  attributionStatement: string;
  mandatoryVerificationClause: string;
  legalViolations: string[];
  chainOfCustody: {
    step: string;
    source: string;
    timestamp: string;
    integrityVerified: boolean;
  }[];
}
