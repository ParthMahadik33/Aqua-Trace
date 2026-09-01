export interface Sentinel1Metadata {
  id: string;
  datetime: string;
  platform: string;
  collection: string;
  bbox: [number, number, number, number];
  geometry?: {
    type: string;
    coordinates: number[][][] | number[][][][];
    crs?: {
      type: string;
      properties: { name: string };
    };
  };
  orbit_direction?: 'ascending' | 'descending' | string;
  polarization?: string[] | string;
  instrument_mode?: string;
  product_type?: string;
  timeliness?: string;
  resolution?: string | { range?: number; azimuth?: number };
}

export interface LatestAcquisitionResponse {
  success: boolean;
  product?: Sentinel1Metadata;
  search_criteria?: {
    bbox: [number, number, number, number];
    collection: string;
    time_window_days: number;
    matched_count: number;
  };
  error?: string;
  message?: string;
}

export interface SarImageMetadata {
  processedBbox?: [number, number, number, number];
  requestedBbox?: [number, number, number, number];
  productBbox?: [number, number, number, number];
  timeRange?: string;
  productId?: string;
}

export type AoiCoverageStatus = 'IDLE' | 'CHECKING' | 'AVAILABLE' | 'NO_COVERAGE' | 'ERROR';

