// Case 0004 - Deterministic Forward Dispersion Forecast Model & Geographic Features
// Origin: Observed SAR Slick at 55.244°N, 5.885°E (German Bight EEZ)
// Drift Axis: 065° ENE setting toward Wadden Sea Barrier Islands (Borkum / Juist / Norderney)

export interface ForecastState {
  hours: number;
  centerLat: number;
  centerLon: number;
  vertices: [number, number][];
  areaKm2: number;
  driftDistanceNm: number;
  timeToShorelineHours: number;
  isShorelineCritical: boolean;
  statusText: string;
  coastalExposureLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  ecologicalSensitivityLevel: 'MODERATE' | 'HIGH' | 'CRITICAL';
  fisheriesLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  populationLevel: 'LOW' | 'MEDIUM';
}

export interface ForecastMilestone {
  hours: number;
  label: string;
  isCritical?: boolean;
}

export const FORECAST_MILESTONES: ForecastMilestone[] = [
  { hours: 0, label: 'NOW (T0)' },
  { hours: 12, label: '+12h' },
  { hours: 24, label: '+24h' },
  { hours: 31, label: '+31h (SHORELINE)', isCritical: true },
  { hours: 36, label: '+36h' },
  { hours: 48, label: '+48h' },
];

export function getForecastState(hours: number): ForecastState {
  const clampedHours = Math.max(0, Math.min(48, hours));
  const tRatio = clampedHours / 48; // 0.0 to 1.0

  // Center trajectory (Lagrangian forward drift under CMEMS surface current 0.35m/s + ERA5 wind 4.8m/s leeway)
  // Origin: 55.244, 5.885 -> Shoreline encounter at ~54.02, 6.95
  const centerLat = 55.244 - tRatio * 1.25;
  const centerLon = 5.885 + tRatio * 1.15;

  // Plume dimensions expand over time
  // T0: length 0.08 nm, width 0.03 nm -> T48: length 0.30 nm, width 0.15 nm
  const lengthNm = 0.08 + tRatio * 0.22;
  const widthNm = 0.03 + tRatio * 0.12;

  // 8-point morphing polygon vertices
  const vertices: [number, number][] = [
    [centerLat + lengthNm, centerLon + widthNm * 0.5],
    [centerLat + lengthNm * 0.4, centerLon + widthNm],
    [centerLat - lengthNm * 0.3, centerLon + widthNm * 0.8],
    [centerLat - lengthNm, centerLon + widthNm * 0.2],
    [centerLat - lengthNm * 0.9, centerLon - widthNm * 0.3],
    [centerLat - lengthNm * 0.3, centerLon - widthNm * 0.7],
    [centerLat + lengthNm * 0.3, centerLon - widthNm * 0.6],
    [centerLat + lengthNm * 0.8, centerLon - widthNm * 0.2],
  ];

  // Exact deterministic area curve matching prompt specification:
  // T0: 4.4 km², T12: 6.2 km², T24: 10.1 km², T31: 13.6 km², T48: 18.6 km²
  let areaKm2 = 4.4;
  if (clampedHours <= 12) {
    areaKm2 = 4.4 + (clampedHours / 12) * (6.2 - 4.4);
  } else if (clampedHours <= 24) {
    areaKm2 = 6.2 + ((clampedHours - 12) / 12) * (10.1 - 6.2);
  } else if (clampedHours <= 31) {
    areaKm2 = 10.1 + ((clampedHours - 24) / 7) * (13.6 - 10.1);
  } else {
    areaKm2 = 13.6 + ((clampedHours - 31) / 17) * (18.6 - 13.6);
  }

  const driftDistanceNm = (clampedHours / 48) * 27.5;
  const timeToShorelineHours = Math.max(0, 31 - clampedHours);
  const isShorelineCritical = clampedHours >= 31;

  let statusText = 'OPEN WATER DRIFT';
  let coastalExposureLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'LOW';
  let ecologicalSensitivityLevel: 'MODERATE' | 'HIGH' | 'CRITICAL' = 'MODERATE';
  let fisheriesLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  let populationLevel: 'LOW' | 'MEDIUM' = 'LOW';

  if (clampedHours >= 31) {
    statusText = 'SHORELINE INTERACTION ZONE (WADDEN SEA)';
    coastalExposureLevel = 'CRITICAL';
    ecologicalSensitivityLevel = 'CRITICAL';
    fisheriesLevel = 'HIGH';
    populationLevel = 'MEDIUM';
  } else if (clampedHours >= 24) {
    statusText = 'COASTAL TRANSIT (BARRIER ISLAND APPROACH)';
    coastalExposureLevel = 'HIGH';
    ecologicalSensitivityLevel = 'HIGH';
    fisheriesLevel = 'MEDIUM';
  } else if (clampedHours >= 12) {
    statusText = 'OFFSHORE DISPERSION';
    coastalExposureLevel = 'MODERATE';
    fisheriesLevel = 'MEDIUM';
  }

  return {
    hours: clampedHours,
    centerLat,
    centerLon,
    vertices,
    areaKm2: parseFloat(areaKm2.toFixed(1)),
    driftDistanceNm: parseFloat(driftDistanceNm.toFixed(1)),
    timeToShorelineHours,
    isShorelineCritical,
    statusText,
    coastalExposureLevel,
    ecologicalSensitivityLevel,
    fisheriesLevel,
    populationLevel,
  };
}

// Geographic feature overlays
export const WADDEN_SEA_COASTLINE: [number, number][] = [
  [53.60, 6.55],
  [53.68, 6.75],
  [53.72, 7.15],
  [53.75, 7.55],
  [53.80, 7.95],
  [53.88, 8.40],
  [53.75, 8.35],
  [53.62, 7.80],
  [53.55, 7.20],
  [53.50, 6.60],
];

export const ECOLOGICAL_RESERVE_NATURA2000: [number, number][] = [
  [54.10, 7.40],
  [54.25, 7.85],
  [54.35, 8.30],
  [54.00, 8.25],
  [53.85, 7.60],
];

export const FISHERIES_ZONE_4B: [number, number][] = [
  [54.80, 5.20],
  [55.30, 5.40],
  [55.45, 6.10],
  [54.95, 5.95],
];

export const COASTAL_HARBORS: { name: string; lat: number; lon: number; type: string }[] = [
  { name: 'Norderney Coastal Resort', lat: 53.71, lon: 7.15, type: 'Tourist Beach / Marina' },
  { name: 'Wilhelmshaven Jade Port', lat: 53.52, lon: 8.14, type: 'Deepwater Tanker Port' },
  { name: 'Cuxhaven Outer Fairway', lat: 53.87, lon: 8.70, type: 'Commercial Estuary' },
  { name: 'Ems Dollart Gateway', lat: 53.35, lon: 6.95, type: 'Estuarine Sanctuary' },
];
