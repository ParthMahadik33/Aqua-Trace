export type ShipCategory = 'Tanker' | 'Cargo' | 'Fishing' | 'Passenger' | 'Other' | 'Pending';

export interface VesselDimensions {
  A?: number;
  B?: number;
  C?: number;
  D?: number;
}

export interface Vessel {
  mmsi: string;
  name: string;
  lat: number;
  lon: number;
  sog: number; // Speed over ground in knots
  cog: number; // Course over ground in degrees (0-360)
  true_heading?: number;
  ship_type: ShipCategory;
  raw_type?: number | null;
  destination: string;
  callsign?: string;
  dimension?: VesselDimensions;
  is_demo?: boolean; // True only if loaded as offline sample fallback
  classification_status?: 'SYNCING' | 'RESOLVED';
  first_tracked_epoch?: number; // Epoch timestamp when first detected
  history?: [number, number][]; // Historical [lat, lon] coordinates (up to 20 points)
  last_updated: string; // ISO 8601 string
  last_updated_epoch: number; // Unix epoch seconds
}

export type ConnectionStatus = 'LIVE' | 'RECONNECTING' | 'OFFLINE' | 'CONNECTING';

export interface SectorPresetInfo {
  name: string;
  description: string;
  bounds: [[[number, number], [number, number]]];
  center: [number, number];
  zoom: number;
}

export interface SystemStatusPayload {
  status: 'CONNECTED' | 'CONNECTING' | 'RECONNECTING' | 'DISCONNECTED' | 'ERROR';
  message: string;
  vessel_count: number;
  total_messages: number;
  preset?: string;
  preset_name?: string;
  bounding_boxes?: [[[number, number], [number, number]]];
  center?: [number, number];
  zoom?: number;
  timestamp?: string;
}

export const SHIP_CATEGORY_COLORS: Record<
  ShipCategory,
  { hex: string; bg: string; border: string; text: string; label: string }
> = {
  Tanker: {
    hex: '#EF4444',
    bg: 'bg-red-500/15',
    border: 'border-red-500/40',
    text: 'text-red-400',
    label: 'Tanker (Petroleum & Chemicals)',
  },
  Cargo: {
    hex: '#3B82F6',
    bg: 'bg-blue-500/15',
    border: 'border-blue-500/40',
    text: 'text-blue-400',
    label: 'Cargo (Container & Bulk)',
  },
  Fishing: {
    hex: '#22C55E',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/40',
    text: 'text-emerald-400',
    label: 'Fishing Fleet',
  },
  Passenger: {
    hex: '#EAB308',
    bg: 'bg-yellow-500/15',
    border: 'border-yellow-500/40',
    text: 'text-yellow-400',
    label: 'Passenger & Ferry',
  },
  Other: {
    hex: '#A855F7',
    bg: 'bg-purple-500/15',
    border: 'border-purple-500/40',
    text: 'text-purple-400',
    label: 'Other (Tug, Pilot, Special)',
  },
  Pending: {
    hex: '#64748B',
    bg: 'bg-slate-500/15',
    border: 'border-slate-500/40',
    text: 'text-slate-400',
    label: 'Pending (Syncing AIS Specs)',
  },
};

export type CategoryFilterState = Record<ShipCategory, boolean>;
