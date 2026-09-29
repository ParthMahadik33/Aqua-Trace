import { CounterfactualTestResult } from './simulation';

export type ExperimentState = 'IDLE' | 'RUNNING' | 'COMPARING' | 'COMPLETE';
export type ExperimentPhase = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type LayerVisibilityMode = 'OBSERVED' | 'SIMULATED' | 'BOTH';
export type CameraFitTarget = 'EVIDENCE' | 'VESSEL' | 'CORRIDOR' | 'PLUME' | 'ALL';

export interface CandidateVesselTrackPoint {
  timestamp: string;
  lat: number;
  lon: number;
  sog?: number;
  cog?: number;
  speed_kn?: number;
  course_deg?: number;
}

export interface CandidateVesselRecord {
  id: string;
  mmsi: string;
  name: string;
  callsign?: string;
  flag?: string;
  vessel_type?: string;
  length_m?: number;
  beam_m?: number;
  draught_m?: number;
  is_decoy: boolean;
  decoy_rationale?: string;
  telemetry: {
    lat: number;
    lon: number;
    sog: number;
    cog: number;
    nav_status?: string;
    timestamp_utc?: string;
  };
  feasible_release_point: { lat: number; lon: number };
  track: CandidateVesselTrackPoint[];
  track_quality_flag?: string;
}

export interface CounterfactualCase {
  case_id: string;
  title: string;
  incident_name: string;
  date_str: string;
  location_label: string;
  center: [number, number];
  default_zoom: number;
  is_real_benchmark: boolean;
  sar_observation: {
    satellite: string;
    sensor: string;
    instrument_mode: string;
    product_type: string;
    product_id: string;
    acquisition_time_utc: string;
    orbit_pass?: string;
    polarisation?: string;
    spatial_resolution_m?: number;
    provenance?: {
      archive: string;
      data_integrity: string;
      quality_flag: string;
    };
    footprint_bbox: [number, number, number, number];
    sar_footprint_polygon: [number, number][];
    observed_slick: {
      id: string;
      centroid: { lat: number; lon: number };
      area_km2: number;
      length_km: number;
      width_km: number;
      axis_heading_deg: number;
      detection_confidence?: number;
      slick_polygon: [number, number][];
    };
  };
  environmental_forcing: {
    source: 'REAL' | 'PROTOTYPE_BASELINE' | 'UNAVAILABLE';
    provenance_label: string;
    wind: {
      dataset: string;
      producer: string;
      u10_ms: number;
      v10_ms: number;
      speed_ms: number;
      direction_deg: number;
      leeway_factor: number;
    };
    current: {
      dataset: string;
      producer: string;
      u_ocean_ms: number;
      v_ocean_ms: number;
      velocity_ms: number;
      direction_deg: number;
      depth_m: number;
    };
    wave?: {
      dataset: string;
      hs_m: number;
      stokes_drift_estimated_ms: number;
      stokes_direction_deg: number;
    };
    diffusion_coeff_m2s: number;
  };
  source_corridor: {
    estimated_release_window: {
      start_utc: string;
      end_utc: string;
      nominal_utc: string;
      elapsed_hours_to_sar: number;
    };
    feasible_segment: [number, number][];
    segment_description: string;
  };
  candidates: CandidateVesselRecord[];
  validation_ground_truth?: {
    documented_source_vessel: string;
    collision_coordinates: { lat: number; lon: number };
    investigation_authority: string;
    spill_type: string;
    volume_tonnes: number;
    validation_note: string;
  };
}

export interface CounterfactualParticlePoint {
  id: number;
  lat: number;
  lon: number;
  time_offset_hours?: number;
}

export interface CounterfactualSimulationFrame {
  frame_index: number;
  time_hours: number;
  time_label: string;
  centroid: { lat: number; lon: number };
  area_km2: number;
  length_km: number;
  width_km: number;
  particles: CounterfactualParticlePoint[];
  footprint_polygon: [number, number][];
}

export interface BaselineRecord {
  candidate_id: string;
  mmsi: string;
  name: string;
  is_decoy: boolean;
  b0_distance_nm: number;
  b0_rank: number;
  b1_cpa_score: number;
  b1_rank: number;
  b2_drift_score: number;
  b2_rank: number;
  b3_counterfactual_score: number;
  b3_rank: number;
  b4_uncertainty_score: number;
  b4_rank: number;
  iou: number;
  centroid_offset_nm: number;
  orientation_delta_deg: number;
}

export interface CounterfactualExecutionResult {
  success: boolean;
  run_id: string;
  candidateId: string;
  candidate: {
    mmsi: string;
    name: string;
    lat: number;
    lon: number;
    sog: number;
    cog: number;
  };
  hypothesis: {
    candidate_name: string;
    candidate_mmsi: string;
    release_window_utc: string;
    feasible_segment: [number, number][];
    hypothesis_statement: string;
  };
  vessel_track: {
    timestamp: string;
    lat: number;
    lon: number;
    speed_kn: number;
    course_deg: number;
  }[];
  simulation: {
    model_type: string;
    engine_version: string;
    seed: number;
    num_particles: number;
    particles: CounterfactualParticlePoint[];
    plume_centroid: { lat: number; lon: number };
    plume_extent: [number, number, number, number];
    plume_area_km2: number;
    plume_axis_deg: number;
    predicted_footprint_polygon: [number, number][];
    environment: {
      source: string;
      source_label: string;
      current_speed_ms: number | null;
      current_direction_deg: number | null;
      wind_speed_ms: number | null;
      wind_direction_deg: number | null;
      forecast_status: string;
    };
  };
  simulation_frames: CounterfactualSimulationFrame[];
  predicted_footprint: {
    polygon: [number, number][];
    stats: {
      centroid: { lat: number; lon: number };
      area_km2: number;
      length_km: number;
      width_km: number;
      axis_heading_deg: number;
    };
  };
  uncertainty: {
    ensemble_size: number;
    p50_envelope: [number, number][];
    p95_envelope: [number, number][];
    p50_area_km2: number;
    p95_area_km2: number;
    spread_km: number;
    coverage_pct: number;
    sensitivity: {
      windage_plus_1pct_delta_km: number;
      current_plus_15pct_delta_km: number;
    };
  };
  metrics: {
    centroid_distance_nm: number;
    centroid_distance_km: number;
    normalized_centroid_error: number;
    orientation_delta_deg: number;
    overlap_dice_coefficient: number;
    overlap_iou: number;
    hausdorff_distance_km: number;
    chamfer_distance_km: number;
    temporal_error_minutes: number;
    null_separation_iou: number;
    null_separation_dist_nm: number;
    ensemble_coverage_pct: number;
  };
  evidenceFactors: {
    spatialConsistency: number;
    trajectoryConsistency: number;
    plumeConsistency: number;
    temporalConsistency: number;
  };
  evidence_factor_trace: {
    factor: string;
    calculated_value: string;
    normalized_score: number;
    explanation: string;
  }[];
  verdict: 'SUPPORTED' | 'WEAK' | 'INCONCLUSIVE';
  verdictLabel: string;
  summary_explanation: string;
  why_verdict?: string;
  what_would_change?: string;
  testResult: CounterfactualTestResult;
  forecastTimeline: any[];
  environment: any;
  assumptions: string[];
  provenance: {
    run_id: string;
    engine_version: string;
    created_at_utc: string;
    random_seed: number;
    model_type: string;
    observation_operator: string;
    sar_product_id: string;
    sar_acquisition_time: string;
    wind_source: string;
    current_source: string;
    ais_source: string;
    analyst_action: string;
  };
  baselines?: BaselineRecord[];
}

export type CounterfactualProgressStep =
  | 'QUEUED'
  | 'RETRIEVING_FORCING'
  | 'ALIGNING_AIS'
  | 'INITIALIZING_RELEASE'
  | 'INTEGRATING_PARTICLES'
  | 'BUILDING_FOOTPRINT'
  | 'COMPARING_OBSERVATION'
  | 'RUNNING_UNCERTAINTY'
  | 'COMPARING_DECOYS'
  | 'FINALIZING_EVIDENCE'
  | 'COMPLETED';

export interface CounterfactualProgressEvent {
  step: CounterfactualProgressStep;
  progress: number;
  message: string;
  timestamp_utc: string;
  result?: CounterfactualExecutionResult;
}
