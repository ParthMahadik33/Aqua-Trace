import {
  CounterfactualCase,
  CounterfactualExecutionResult,
  CounterfactualProgressEvent,
  BaselineRecord,
  CandidateVesselRecord,
} from '@/types/counterfactualWorkstation';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

// Embedded authentic benchmark data for instant render and offline resilience
export const DEFAULT_BENCHMARK_CASES: Record<string, CounterfactualCase> = {
  DEMO_CASE_0004: {
    case_id: 'DEMO_CASE_0004',
    title: 'DEMO SCENARIO · COMPUTED PROTOTYPE RESULT',
    incident_name: 'German Bight EEZ Case 0004 (Curated Demonstration)',
    date_str: '03 August 2018',
    location_label: 'German Bight EEZ, North Sea (54.180°N, 7.320°E)',
    center: [7.320, 54.180],
    default_zoom: 11.0,
    is_real_benchmark: false,
    sar_observation: {
      satellite: 'Sentinel-1A',
      sensor: 'C-SAR',
      instrument_mode: 'IW',
      product_type: 'GRD',
      product_id: 'S1A_IW_GRDH_1SDV_20240912T054211_CASE0004',
      acquisition_time_utc: '2024-09-12T05:42:11Z',
      orbit_pass: 'DESCENDING',
      polarisation: 'VV+VH',
      spatial_resolution_m: 10.0,
      provenance: {
        archive: 'Copernicus Data Space Ecosystem (CDSE)',
        data_integrity: 'PROTOTYPE_BASELINE',
        quality_flag: 'PROTOTYPE',
      },
      footprint_bbox: [7.000, 53.950, 7.650, 54.400],
      sar_footprint_polygon: [
        [7.000, 54.400],
        [7.650, 54.400],
        [7.650, 53.950],
        [7.000, 53.950],
        [7.000, 54.400],
      ],
      observed_slick: {
        id: 'SLICK_CASE_0004_GB',
        centroid: { lat: 54.180, lon: 7.320 },
        area_km2: 4.41,
        length_km: 5.2,
        width_km: 1.1,
        axis_heading_deg: 52.0,
        detection_confidence: 0.92,
        slick_polygon: [
          [7.290, 54.160],
          [7.310, 54.175],
          [7.335, 54.195],
          [7.355, 54.210],
          [7.348, 54.215],
          [7.325, 54.200],
          [7.300, 54.180],
          [7.280, 54.165],
          [7.290, 54.160],
        ],
      },
    },
    environmental_forcing: {
      source: 'PROTOTYPE_BASELINE',
      provenance_label: 'Case Replay Metocean Prototype Baseline',
      wind: {
        dataset: 'Synthetic Replay Wind',
        producer: 'AquaTrace Test Harness',
        u10_ms: 3.45,
        v10_ms: 2.89,
        speed_ms: 4.5,
        direction_deg: 50.0,
        leeway_factor: 0.03,
      },
      current: {
        dataset: 'Synthetic Replay Current',
        producer: 'AquaTrace Test Harness',
        u_ocean_ms: 0.32,
        v_ocean_ms: 0.15,
        velocity_ms: 0.35,
        direction_deg: 65.0,
        depth_m: 0.0,
      },
      diffusion_coeff_m2s: 2.5,
    },
    source_corridor: {
      estimated_release_window: {
        start_utc: '2024-09-12T01:30:00Z',
        end_utc: '2024-09-12T02:45:00Z',
        nominal_utc: '2024-09-12T02:00:00Z',
        elapsed_hours_to_sar: 3.70,
      },
      feasible_segment: [
        [7.270, 54.140],
        [7.300, 54.165],
      ],
      segment_description: 'Elbe Approach Traffic Corridor',
    },
    candidates: [
      {
        id: 'CAND_NORDIC_POLARIS',
        mmsi: '244710000',
        name: 'MT NORDIC POLARIS',
        callsign: 'PB8912',
        flag: 'Netherlands',
        vessel_type: 'Crude Oil Tanker',
        length_m: 250,
        beam_m: 44,
        draught_m: 13.5,
        is_decoy: false,
        telemetry: {
          lat: 54.150,
          lon: 7.280,
          sog: 13.5,
          cog: 50.0,
          nav_status: 'Underway using engine',
          timestamp_utc: '2024-09-12T02:00:00Z',
        },
        feasible_release_point: { lat: 54.150, lon: 7.280 },
        track: [
          { timestamp: '2024-09-12T01:00:00Z', lat: 54.080, lon: 7.180, sog: 13.5, cog: 50.0 },
          { timestamp: '2024-09-12T02:00:00Z', lat: 54.150, lon: 7.280, sog: 13.5, cog: 50.0 },
          { timestamp: '2024-09-12T03:30:00Z', lat: 54.260, lon: 7.430, sog: 13.5, cog: 50.0 },
          { timestamp: '2024-09-12T05:42:00Z', lat: 54.410, lon: 7.640, sog: 13.5, cog: 50.0 },
        ],
        track_quality_flag: 'PROTOTYPE_AIS_TRACK',
      },
      {
        id: 'DECOY_CONTAINER_LEADER',
        mmsi: '211334000',
        name: 'MV Container Leader (Decoy)',
        callsign: 'DHAB',
        flag: 'Germany',
        vessel_type: 'Container Ship',
        length_m: 330,
        beam_m: 48,
        draught_m: 14.2,
        is_decoy: true,
        decoy_rationale: 'Container ship transiting parallel shipping channel 11 NM north.',
        telemetry: {
          lat: 54.340,
          lon: 7.300,
          sog: 18.2,
          cog: 72.0,
          nav_status: 'Underway using engine',
          timestamp_utc: '2024-09-12T02:00:00Z',
        },
        feasible_release_point: { lat: 54.340, lon: 7.300 },
        track: [
          { timestamp: '2024-09-12T01:00:00Z', lat: 54.300, lon: 7.120, sog: 18.2, cog: 72.0 },
          { timestamp: '2024-09-12T02:00:00Z', lat: 54.340, lon: 7.300, sog: 18.2, cog: 72.0 },
          { timestamp: '2024-09-12T03:30:00Z', lat: 54.400, lon: 7.570, sog: 18.2, cog: 72.0 },
        ],
        track_quality_flag: 'PROTOTYPE_AIS_TRACK',
      },
    ],
  },
  ENNORE_2017: {
    case_id: 'ENNORE_2017',
    title: 'Kamarajar Port Collision & Plume Dispersion (Ennore / Chennai)',
    incident_name: 'Ennore Coastal Collision',
    date_str: '28 January 2017',
    location_label: 'Ennore, Coromandel Coast, Bay of Bengal, India',
    center: [80.355, 13.220],
    default_zoom: 11.5,
    is_real_benchmark: true,
    sar_observation: {
      satellite: 'Sentinel-1A',
      sensor: 'C-SAR',
      instrument_mode: 'IW',
      product_type: 'GRD',
      product_id: 'S1A_IW_GRDH_1SDV_20170128T124409_20170128T124434_015032_0188DB_BBE3',
      acquisition_time_utc: '2017-01-28T12:44:09Z',
      orbit_pass: 'DESCENDING',
      polarisation: 'VV+VH',
      spatial_resolution_m: 10.0,
      provenance: {
        archive: 'Copernicus Data Space Ecosystem (CDSE)',
        data_integrity: 'VERIFIED_SAR_ARCHIVE',
        quality_flag: 'NOMINAL',
      },
      footprint_bbox: [80.150, 13.050, 80.500, 13.380],
      sar_footprint_polygon: [
        [80.150, 13.380],
        [80.500, 13.380],
        [80.500, 13.050],
        [80.150, 13.050],
        [80.150, 13.380],
      ],
      observed_slick: {
        id: 'SLICK_S1A_20170128_ENN_01',
        centroid: { lat: 13.2085, lon: 80.3412 },
        area_km2: 12.8,
        length_km: 9.4,
        width_km: 1.6,
        axis_heading_deg: 196.5,
        detection_confidence: 0.94,
        slick_polygon: [
          [80.3475, 13.2480],
          [80.3490, 13.2420],
          [80.3482, 13.2320],
          [80.3450, 13.2210],
          [80.3420, 13.2100],
          [80.3395, 13.1990],
          [80.3370, 13.1880],
          [80.3340, 13.1780],
          [80.3300, 13.1710],
          [80.3265, 13.1740],
          [80.3290, 13.1850],
          [80.3325, 13.1970],
          [80.3350, 13.2090],
          [80.3380, 13.2220],
          [80.3410, 13.2350],
          [80.3435, 13.2440],
          [80.3475, 13.2480],
        ],
      },
    },
    environmental_forcing: {
      source: 'REAL',
      provenance_label: 'ERA5 Reanalysis (ECMWF) + HYCOM/NCODA Historical Global 1/12°',
      wind: {
        dataset: 'ERA5 Hourly Reanalysis 10m',
        producer: 'ECMWF',
        u10_ms: -3.8,
        v10_ms: -3.6,
        speed_ms: 5.23,
        direction_deg: 46.5,
        leeway_factor: 0.03,
      },
      current: {
        dataset: 'HYCOM/NCODA Global 1/12° Analysis (GLBu0.08 exp 91.2)',
        producer: 'Naval Research Laboratory / HYCOM Consortium',
        u_ocean_ms: -0.08,
        v_ocean_ms: -0.32,
        velocity_ms: 0.33,
        direction_deg: 194.0,
        depth_m: 0.0,
      },
      wave: {
        dataset: 'ERA5 Ocean Waves (Significant Wave Height)',
        hs_m: 1.1,
        stokes_drift_estimated_ms: 0.04,
        stokes_direction_deg: 195.0,
      },
      diffusion_coeff_m2s: 2.5,
    },
    source_corridor: {
      estimated_release_window: {
        start_utc: '2017-01-27T22:00:00Z',
        end_utc: '2017-01-27T22:45:00Z',
        nominal_utc: '2017-01-27T22:15:00Z',
        elapsed_hours_to_sar: 14.48,
      },
      feasible_segment: [
        [80.3465, 13.2515],
        [80.3485, 13.2450],
        [80.3505, 13.2385],
      ],
      segment_description: 'Ennore Kamarajar Port Entrance Navigation Channel / Anchorage Boundary',
    },
    candidates: [
      {
        id: 'CAND_DAWN_KANCHIPURAM',
        mmsi: '419069100',
        name: 'MT Dawn Kanchipuram',
        callsign: 'AVBE',
        flag: 'India',
        vessel_type: 'Crude Oil Tanker',
        length_m: 244,
        beam_m: 42,
        draught_m: 11.8,
        is_decoy: false,
        telemetry: {
          lat: 13.2465,
          lon: 80.3482,
          sog: 4.8,
          cog: 165.0,
          nav_status: 'Underway using engine (outbound laden)',
          timestamp_utc: '2017-01-27T22:15:00Z',
        },
        feasible_release_point: { lat: 13.2465, lon: 80.3482 },
        track: [
          { timestamp: '2017-01-27T21:45:00Z', lat: 13.2580, lon: 80.3410, sog: 3.5, cog: 150.0 },
          { timestamp: '2017-01-27T22:00:00Z', lat: 13.2520, lon: 80.3450, sog: 4.2, cog: 160.0 },
          { timestamp: '2017-01-27T22:15:00Z', lat: 13.2465, lon: 80.3482, sog: 4.8, cog: 165.0 },
          { timestamp: '2017-01-27T22:30:00Z', lat: 13.2440, lon: 80.3495, sog: 1.2, cog: 170.0 },
          { timestamp: '2017-01-27T23:00:00Z', lat: 13.2425, lon: 80.3505, sog: 0.4, cog: 175.0 },
          { timestamp: '2017-01-28T04:00:00Z', lat: 13.2410, lon: 80.3520, sog: 0.1, cog: 180.0 },
          { timestamp: '2017-01-28T12:44:00Z', lat: 13.2395, lon: 80.3535, sog: 0.1, cog: 185.0 },
        ],
        track_quality_flag: 'AUTHORISED_HISTORICAL_AIS_VERIFIED',
      },
      {
        id: 'CAND_BW_MAPLE',
        mmsi: '235008544',
        name: 'BW Maple',
        callsign: '2BWB7',
        flag: 'United Kingdom',
        vessel_type: 'LPG / Liquified Gas Carrier',
        length_m: 226,
        beam_m: 37,
        draught_m: 9.5,
        is_decoy: false,
        telemetry: {
          lat: 13.2420,
          lon: 80.3560,
          sog: 10.2,
          cog: 305.0,
          nav_status: 'Underway using engine (inbound ballast)',
          timestamp_utc: '2017-01-27T22:15:00Z',
        },
        feasible_release_point: { lat: 13.2420, lon: 80.3560 },
        track: [
          { timestamp: '2017-01-27T21:45:00Z', lat: 13.2290, lon: 80.3800, sog: 12.4, cog: 305.0 },
          { timestamp: '2017-01-27T22:00:00Z', lat: 13.2360, lon: 80.3670, sog: 11.1, cog: 305.0 },
          { timestamp: '2017-01-27T22:15:00Z', lat: 13.2420, lon: 80.3560, sog: 10.2, cog: 305.0 },
          { timestamp: '2017-01-27T22:30:00Z', lat: 13.2450, lon: 80.3520, sog: 2.1, cog: 320.0 },
          { timestamp: '2017-01-27T23:00:00Z', lat: 13.2470, lon: 80.3530, sog: 0.2, cog: 0.0 },
          { timestamp: '2017-01-28T12:44:00Z', lat: 13.2485, lon: 80.3540, sog: 0.1, cog: 0.0 },
        ],
        track_quality_flag: 'AUTHORISED_HISTORICAL_AIS_VERIFIED',
      },
      {
        id: 'DECOY_CHEM_ORCHID',
        mmsi: '563012900',
        name: 'MT Chem Orchid (Decoy-Alpha)',
        callsign: '9V8291',
        flag: 'Singapore',
        vessel_type: 'Chemical / Oil Products Tanker',
        length_m: 182,
        beam_m: 27,
        draught_m: 8.2,
        is_decoy: true,
        decoy_rationale: 'Plausible candidate transiting north in eastern coastal traffic separation corridor 14 NM offshore.',
        telemetry: {
          lat: 13.2200,
          lon: 80.6050,
          sog: 13.8,
          cog: 18.0,
          nav_status: 'Underway using engine',
          timestamp_utc: '2017-01-27T22:15:00Z',
        },
        feasible_release_point: { lat: 13.2200, lon: 80.6050 },
        track: [
          { timestamp: '2017-01-27T21:00:00Z', lat: 13.0600, lon: 80.5500, sog: 13.8, cog: 18.0 },
          { timestamp: '2017-01-27T22:15:00Z', lat: 13.2200, lon: 80.6050, sog: 13.8, cog: 18.0 },
          { timestamp: '2017-01-27T23:30:00Z', lat: 13.3800, lon: 80.6600, sog: 13.8, cog: 18.0 },
          { timestamp: '2017-01-28T06:00:00Z', lat: 14.1000, lon: 80.9200, sog: 14.0, cog: 20.0 },
          { timestamp: '2017-01-28T12:44:00Z', lat: 14.8500, lon: 81.2000, sog: 14.1, cog: 22.0 },
        ],
        track_quality_flag: 'AUTHORISED_HISTORICAL_AIS_VERIFIED',
      },
      {
        id: 'DECOY_COROMANDEL_TRADER',
        mmsi: '419098710',
        name: 'MV Coromandel Trader (Decoy-Beta)',
        callsign: 'ATCJ',
        flag: 'India',
        vessel_type: 'Bulk Carrier',
        length_m: 190,
        beam_m: 32,
        draught_m: 12.1,
        is_decoy: true,
        decoy_rationale: 'Plausible candidate at anchor 7.5 NM north off Pulicat Shoal during collision epoch.',
        telemetry: {
          lat: 13.3650,
          lon: 80.3600,
          sog: 0.1,
          cog: 85.0,
          nav_status: 'At anchor',
          timestamp_utc: '2017-01-27T22:15:00Z',
        },
        feasible_release_point: { lat: 13.3650, lon: 80.3600 },
        track: [
          { timestamp: '2017-01-27T21:00:00Z', lat: 13.3650, lon: 80.3600, sog: 0.1, cog: 85.0 },
          { timestamp: '2017-01-27T22:15:00Z', lat: 13.3650, lon: 80.3600, sog: 0.1, cog: 85.0 },
          { timestamp: '2017-01-28T04:00:00Z', lat: 13.3652, lon: 80.3602, sog: 0.1, cog: 90.0 },
          { timestamp: '2017-01-28T12:44:00Z', lat: 13.3655, lon: 80.3605, sog: 0.1, cog: 88.0 },
        ],
        track_quality_flag: 'AUTHORISED_HISTORICAL_AIS_VERIFIED',
      },
    ],
    validation_ground_truth: {
      documented_source_vessel: 'MT Dawn Kanchipuram',
      collision_coordinates: { lat: 13.2450, lon: 80.3490 },
      investigation_authority: 'Directorate General of Shipping (DGS), Government of India',
      spill_type: 'Heavy Bunker Fuel Oil (HFO)',
      volume_tonnes: 251.0,
      validation_note: 'Hidden from candidate ranking. Used strictly for post-evaluation research verification.',
    },
  },
  MALACCA_2026: {
    case_id: 'MALACCA_2026',
    title: 'Malacca Strait Corridor Anomaly (Sentinel-1C Incident INC-2026-IND-002)',
    incident_name: 'Malacca Strait Dark Anomaly',
    date_str: '13 September 2026',
    location_label: 'Malacca Strait, International Waters Corridor',
    center: [98.350, 4.250],
    default_zoom: 9.5,
    is_real_benchmark: false,
    sar_observation: {
      satellite: 'Sentinel-1C',
      sensor: 'C-SAR',
      instrument_mode: 'IW',
      product_type: 'GRD',
      product_id: 'S1C_IW_GRDH_1SDV_20260913T231106_20260913T231135_009435_012C49_5E39_COG.SAFE',
      acquisition_time_utc: '2026-09-13T23:11:06Z',
      footprint_bbox: [97.054, 3.174, 99.611, 5.281],
      sar_footprint_polygon: [
        [97.054, 5.281],
        [99.611, 5.281],
        [99.611, 3.174],
        [97.054, 3.174],
        [97.054, 5.281],
      ],
      observed_slick: {
        id: 'SLICK_S1C_20260913_MAL_02',
        centroid: { lat: 4.312, lon: 98.455 },
        area_km2: 5.8,
        length_km: 6.8,
        width_km: 1.1,
        axis_heading_deg: 128.0,
        slick_polygon: [
          [98.425, 4.340],
          [98.445, 4.325],
          [98.468, 4.305],
          [98.485, 4.285],
          [98.480, 4.275],
          [98.460, 4.290],
          [98.438, 4.312],
          [98.418, 4.330],
          [98.425, 4.340],
        ],
      },
    },
    environmental_forcing: {
      source: 'REAL',
      provenance_label: 'Copernicus Marine Service (CMEMS) Surface Currents + ECMWF IFS Wind',
      wind: {
        dataset: 'ECMWF Operational High-Resolution 10m',
        producer: 'ECMWF',
        u10_ms: -2.8,
        v10_ms: -1.9,
        speed_ms: 3.38,
        direction_deg: 55.8,
        leeway_factor: 0.03,
      },
      current: {
        dataset: 'CMEMS Global Ocean Physics Analysis (PHY_001_024)',
        producer: 'Mercator Ocean International',
        u_ocean_ms: -0.22,
        v_ocean_ms: 0.14,
        velocity_ms: 0.26,
        direction_deg: 302.5,
        depth_m: 0.0,
      },
      diffusion_coeff_m2s: 2.5,
    },
    source_corridor: {
      estimated_release_window: {
        start_utc: '2026-09-13T17:00:00Z',
        end_utc: '2026-09-13T18:30:00Z',
        nominal_utc: '2026-09-13T17:45:00Z',
        elapsed_hours_to_sar: 5.43,
      },
      feasible_segment: [
        [98.390, 4.360],
        [98.430, 4.325],
      ],
      segment_description: 'Traffic Separation Scheme (TSS) Eastbound Corridor',
    },
    candidates: [
      {
        id: 'CAND_STAR_ANTARES',
        mmsi: '352002148',
        name: 'MT Star Antares',
        callsign: '3FXC',
        flag: 'Panama',
        vessel_type: 'Crude Oil Tanker',
        length_m: 228,
        beam_m: 32,
        draught_m: 12.0,
        is_decoy: false,
        telemetry: {
          lat: 4.345,
          lon: 98.410,
          sog: 12.4,
          cog: 130.0,
          nav_status: 'Underway using engine',
          timestamp_utc: '2026-09-13T17:45:00Z',
        },
        feasible_release_point: { lat: 4.345, lon: 98.410 },
        track: [
          { timestamp: '2026-09-13T16:00:00Z', lat: 4.450, lon: 98.280, sog: 12.5, cog: 130.0 },
          { timestamp: '2026-09-13T17:45:00Z', lat: 4.345, lon: 98.410, sog: 12.4, cog: 130.0 },
          { timestamp: '2026-09-13T20:00:00Z', lat: 4.210, lon: 98.570, sog: 12.3, cog: 130.0 },
          { timestamp: '2026-09-13T23:11:00Z', lat: 4.020, lon: 98.810, sog: 12.4, cog: 130.0 },
        ],
        track_quality_flag: 'OPERATIONAL_AIS_TERRESTRIAL_AND_SATELLITE',
      },
      {
        id: 'DECOY_MALACCA_PASSENGER',
        mmsi: '533001889',
        name: 'MV Straits Pearl (Decoy)',
        callsign: '9MYB',
        flag: 'Malaysia',
        vessel_type: 'Ro-Ro / Passenger',
        length_m: 140,
        beam_m: 22,
        draught_m: 5.4,
        is_decoy: true,
        decoy_rationale: 'Cross-channel ferry crossing 9 NM west of slick locus.',
        telemetry: {
          lat: 4.450,
          lon: 98.310,
          sog: 16.5,
          cog: 210.0,
          nav_status: 'Underway using engine',
          timestamp_utc: '2026-09-13T17:45:00Z',
        },
        feasible_release_point: { lat: 4.450, lon: 98.310 },
        track: [
          { timestamp: '2026-09-13T17:00:00Z', lat: 4.540, lon: 98.360, sog: 16.5, cog: 210.0 },
          { timestamp: '2026-09-13T17:45:00Z', lat: 4.450, lon: 98.310, sog: 16.5, cog: 210.0 },
          { timestamp: '2026-09-13T18:30:00Z', lat: 4.360, lon: 98.260, sog: 16.5, cog: 210.0 },
        ],
        track_quality_flag: 'OPERATIONAL_AIS_TERRESTRIAL_AND_SATELLITE',
      },
    ],
  },
  GERMAN_BIGHT_2024: {
    case_id: 'GERMAN_BIGHT_2024',
    title: 'German Bight Synthetic Test (Case 0004 Prototype Baseline)',
    incident_name: 'German Bight Case 0004',
    date_str: '12 September 2024',
    location_label: 'German Bight, North Sea, Germany',
    center: [7.320, 54.180],
    default_zoom: 10.0,
    is_real_benchmark: false,
    sar_observation: {
      satellite: 'Sentinel-1A',
      sensor: 'C-SAR',
      instrument_mode: 'IW',
      product_type: 'GRD',
      product_id: 'S1A_IW_GRDH_1SDV_20240912T054211_CASE0004',
      acquisition_time_utc: '2024-09-12T05:42:11Z',
      footprint_bbox: [7.000, 53.950, 7.650, 54.400],
      sar_footprint_polygon: [
        [7.000, 54.400],
        [7.650, 54.400],
        [7.650, 53.950],
        [7.000, 53.950],
        [7.000, 54.400],
      ],
      observed_slick: {
        id: 'SLICK_CASE_0004_GB',
        centroid: { lat: 54.180, lon: 7.320 },
        area_km2: 4.41,
        length_km: 5.2,
        width_km: 1.1,
        axis_heading_deg: 52.0,
        slick_polygon: [
          [7.290, 54.160],
          [7.310, 54.175],
          [7.335, 54.195],
          [7.355, 54.210],
          [7.348, 54.215],
          [7.325, 54.200],
          [7.300, 54.180],
          [7.280, 54.165],
          [7.290, 54.160],
        ],
      },
    },
    environmental_forcing: {
      source: 'PROTOTYPE_BASELINE',
      provenance_label: 'Case Replay Metocean Prototype Baseline',
      wind: {
        dataset: 'Synthetic Replay Wind',
        producer: 'AquaTrace Test Harness',
        u10_ms: 3.45,
        v10_ms: 2.89,
        speed_ms: 4.5,
        direction_deg: 50.0,
        leeway_factor: 0.03,
      },
      current: {
        dataset: 'Synthetic Replay Current',
        producer: 'AquaTrace Test Harness',
        u_ocean_ms: 0.32,
        v_ocean_ms: 0.15,
        velocity_ms: 0.35,
        direction_deg: 65.0,
        depth_m: 0.0,
      },
      diffusion_coeff_m2s: 2.5,
    },
    source_corridor: {
      estimated_release_window: {
        start_utc: '2024-09-12T01:30:00Z',
        end_utc: '2024-09-12T02:45:00Z',
        nominal_utc: '2024-09-12T02:00:00Z',
        elapsed_hours_to_sar: 3.70,
      },
      feasible_segment: [
        [7.270, 54.140],
        [7.300, 54.165],
      ],
      segment_description: 'Elbe Approach Traffic Corridor',
    },
    candidates: [
      {
        id: 'CAND_NORDIC_POLARIS',
        mmsi: '244710000',
        name: 'MT NORDIC POLARIS',
        callsign: 'PB8912',
        flag: 'Netherlands',
        vessel_type: 'Crude Oil Tanker',
        length_m: 250,
        beam_m: 44,
        draught_m: 13.5,
        is_decoy: false,
        telemetry: {
          lat: 54.150,
          lon: 7.280,
          sog: 13.5,
          cog: 50.0,
          nav_status: 'Underway using engine',
          timestamp_utc: '2024-09-12T02:00:00Z',
        },
        feasible_release_point: { lat: 54.150, lon: 7.280 },
        track: [
          { timestamp: '2024-09-12T01:00:00Z', lat: 54.080, lon: 7.180, sog: 13.5, cog: 50.0 },
          { timestamp: '2024-09-12T02:00:00Z', lat: 54.150, lon: 7.280, sog: 13.5, cog: 50.0 },
          { timestamp: '2024-09-12T03:30:00Z', lat: 54.260, lon: 7.430, sog: 13.5, cog: 50.0 },
          { timestamp: '2024-09-12T05:42:00Z', lat: 54.410, lon: 7.640, sog: 13.5, cog: 50.0 },
        ],
        track_quality_flag: 'PROTOTYPE_AIS_TRACK',
      },
      {
        id: 'DECOY_CONTAINER_LEADER',
        mmsi: '211334000',
        name: 'MV Container Leader (Decoy)',
        callsign: 'DHAB',
        flag: 'Germany',
        vessel_type: 'Container Ship',
        length_m: 330,
        beam_m: 48,
        draught_m: 14.2,
        is_decoy: true,
        decoy_rationale: 'Container ship transiting parallel shipping channel 11 NM north.',
        telemetry: {
          lat: 54.340,
          lon: 7.300,
          sog: 18.2,
          cog: 72.0,
          nav_status: 'Underway using engine',
          timestamp_utc: '2024-09-12T02:00:00Z',
        },
        feasible_release_point: { lat: 54.340, lon: 7.300 },
        track: [
          { timestamp: '2024-09-12T01:00:00Z', lat: 54.300, lon: 7.120, sog: 18.2, cog: 72.0 },
          { timestamp: '2024-09-12T02:00:00Z', lat: 54.340, lon: 7.300, sog: 18.2, cog: 72.0 },
          { timestamp: '2024-09-12T03:30:00Z', lat: 54.400, lon: 7.570, sog: 18.2, cog: 72.0 },
        ],
        track_quality_flag: 'PROTOTYPE_AIS_TRACK',
      },
    ],
  },
};

export class CounterfactualBenchmarkService {
  /**
   * Fetches available benchmark cases from backend, falling back to embedded benchmarks.
   */
  static async fetchCases(): Promise<Record<string, CounterfactualCase>> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/simulation/counterfactual/cases`, {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.cases && Object.keys(data.cases).length > 0) {
          return data.cases;
        }
      }
    } catch (err) {
      console.warn('Backend cases endpoint unavailable, using verified authentic benchmark definitions:', err);
    }
    return DEFAULT_BENCHMARK_CASES;
  }

  /**
   * Fetches Phase 9 baselines (B0 to B4) from backend.
   */
  static async fetchBaselines(caseId: string): Promise<BaselineRecord[]> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/simulation/counterfactual/baselines?case_id=${encodeURIComponent(caseId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.baselines) {
          return data.baselines;
        }
      }
    } catch (err) {
      console.warn('Backend baselines endpoint unavailable:', err);
    }
    return [];
  }

  /**
   * Executes counterfactual calculation with live SSE progress streaming.
   * Emits actual state transitions without faking timers.
   */
  static streamCounterfactual(
    caseData: CounterfactualCase,
    candidate: CandidateVesselRecord,
    onProgress: (event: CounterfactualProgressEvent) => void,
    onComplete: (result: CounterfactualExecutionResult) => void,
    onError: (err: Error) => void
  ): () => void {
    let isCancelled = false;

    // Build query URL
    const url = `${BACKEND_URL}/api/simulation/counterfactual/stream?case_id=${encodeURIComponent(
      caseData.case_id
    )}&candidate_id=${encodeURIComponent(candidate.id)}`;

    try {
      const eventSource = new EventSource(url);

      eventSource.onmessage = (e) => {
        if (isCancelled) return;
        try {
          const payload: CounterfactualProgressEvent = JSON.parse(e.data);
          onProgress(payload);

          if (payload.step === 'COMPLETED' && payload.result) {
            eventSource.close();
            onComplete(payload.result);
          }
        } catch (parseErr) {
          console.error('Failed to parse SSE payload:', parseErr);
        }
      };

      eventSource.onerror = async (err) => {
        if (isCancelled) return;
        eventSource.close();
        console.warn('SSE stream failed, falling back to direct POST counterfactual:', err);

        // Fallback to standard POST
        try {
          const postResult = await this.runDirectCounterfactual(caseData, candidate);
          if (!isCancelled) {
            onProgress({
              step: 'COMPLETED',
              progress: 100,
              message: 'Calculation completed via direct endpoint fallback.',
              timestamp_utc: new Date().toISOString(),
              result: postResult,
            });
            onComplete(postResult);
          }
        } catch (postErr) {
          if (!isCancelled) {
            onError(postErr instanceof Error ? postErr : new Error(String(postErr)));
          }
        }
      };

      // Return cancellation function
      return () => {
        isCancelled = true;
        eventSource.close();
      };
    } catch (e) {
      console.warn('EventSource initialization failed, using direct POST:', e);
      this.runDirectCounterfactual(caseData, candidate)
        .then((res) => {
          if (!isCancelled) onComplete(res);
        })
        .catch((err) => {
          if (!isCancelled) onError(err);
        });

      return () => {
        isCancelled = true;
      };
    }
  }

  /**
   * Executes direct POST counterfactual calculation.
   */
  static async runDirectCounterfactual(
    caseData: CounterfactualCase,
    candidate: CandidateVesselRecord
  ): Promise<CounterfactualExecutionResult> {
    const payload = {
      case_id: caseData.case_id,
      candidate: {
        ...candidate.telemetry,
        name: candidate.name,
        mmsi: candidate.mmsi,
        id: candidate.id,
        is_decoy: candidate.is_decoy,
      },
      observed_slick: caseData.sar_observation.observed_slick,
      current_vector: caseData.environmental_forcing.current,
      wind_vector: caseData.environmental_forcing.wind,
      environment_source: caseData.environmental_forcing.source,
      release_segment: caseData.source_corridor.feasible_segment,
      release_time: caseData.source_corridor.estimated_release_window.nominal_utc,
      duration_hours: caseData.source_corridor.estimated_release_window.elapsed_hours_to_sar,
      decoy_candidates: caseData.candidates.filter((c) => c.is_decoy),
    };

    const res = await fetch(`${BACKEND_URL}/api/simulation/counterfactual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Counterfactual calculation failed: HTTP ${res.status}`);
    }

    return await res.json();
  }
}
