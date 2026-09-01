/**
 * Geographic sector identification and coordinate formatting utilities
 * for Sentinel-1 Synthetic Aperture Radar (SAR) surveillance footprints.
 */

export interface IdentifiedSector {
  name: string;
  isIdentified: boolean;
  coordinatesFormatted: string;
}

/**
 * Derives a human-readable geographic sector name from a WGS84 bounding box
 * [min_lon, min_lat, max_lon, max_lat].
 */
export function getSarSectorName(
  bbox: [number, number, number, number] | null | undefined
): IdentifiedSector {
  if (!bbox || bbox.length !== 4) {
    return {
      name: 'SAR Acquisition Coverage Area',
      isIdentified: false,
      coordinatesFormatted: 'N/A',
    };
  }

  const [minLon, minLat, maxLon, maxLat] = bbox;
  const centerLon = (minLon + maxLon) / 2;
  const centerLat = (minLat + maxLat) / 2;

  const formatCoord = (deg: number, isLat: boolean) => {
    const dir = isLat ? (deg >= 0 ? '°N' : '°S') : (deg >= 0 ? '°E' : '°W');
    return `${Math.abs(deg).toFixed(2)}${dir}`;
  };

  const coordinatesFormatted = `${formatCoord(minLat, true)}–${formatCoord(maxLat, true)}, ${formatCoord(minLon, false)}–${formatCoord(maxLon, false)}`;

  // 1. Malacca Strait & Southeast Asian Maritime Corridors
  if (centerLon >= 98.0 && centerLon <= 106.0 && centerLat >= 4.5 && centerLat <= 8.5) {
    return {
      name: 'Northern Malacca Strait Sector',
      isIdentified: true,
      coordinatesFormatted,
    };
  }

  if (centerLon >= 99.5 && centerLon <= 105.5 && centerLat >= 0.5 && centerLat < 4.5) {
    return {
      name: 'Southern Malacca / Singapore Strait Sector',
      isIdentified: true,
      coordinatesFormatted,
    };
  }

  if (centerLon >= 94.0 && centerLon <= 99.5 && centerLat >= 1.5 && centerLat <= 7.0) {
    return {
      name: 'North Sumatra / Malacca Western Approaches',
      isIdentified: true,
      coordinatesFormatted,
    };
  }

  // 2. Arabian Sea / India West Coast Corridors
  if (centerLon >= 67.0 && centerLon <= 74.0 && centerLat >= 17.5 && centerLat <= 21.5) {
    return {
      name: 'Mumbai / Maharashtra Offshore Sector',
      isIdentified: true,
      coordinatesFormatted,
    };
  }

  if (centerLon >= 67.5 && centerLon <= 72.0 && centerLat > 21.5 && centerLat <= 24.5) {
    return {
      name: 'Gulf of Kutch / Gujarat Maritime Sector',
      isIdentified: true,
      coordinatesFormatted,
    };
  }

  if (centerLon >= 71.5 && centerLon <= 77.0 && centerLat >= 8.0 && centerLat < 17.5) {
    return {
      name: 'Goa / Karnataka / Kerala Coastal Sector',
      isIdentified: true,
      coordinatesFormatted,
    };
  }

  if (centerLon >= 53.0 && centerLon <= 61.0 && centerLat >= 22.5 && centerLat <= 28.0) {
    return {
      name: 'Strait of Hormuz / Gulf of Oman Sector',
      isIdentified: true,
      coordinatesFormatted,
    };
  }

  // 3. Bay of Bengal / India East Coast Corridors
  if (centerLon >= 79.0 && centerLon <= 85.0 && centerLat >= 12.0 && centerLat <= 16.5) {
    return {
      name: 'Chennai / Andhra Coastal Sector',
      isIdentified: true,
      coordinatesFormatted,
    };
  }

  if (centerLon >= 81.5 && centerLon <= 88.5 && centerLat > 16.5 && centerLat <= 21.5) {
    return {
      name: 'Visakhapatnam / Odisha Offshore Sector',
      isIdentified: true,
      coordinatesFormatted,
    };
  }

  if (centerLon >= 86.5 && centerLon <= 93.0 && centerLat > 21.5 && centerLat <= 24.0) {
    return {
      name: 'Northern Bay of Bengal / Delta Sector',
      isIdentified: true,
      coordinatesFormatted,
    };
  }

  if (centerLon >= 91.0 && centerLon <= 95.0 && centerLat >= 6.0 && centerLat <= 14.5) {
    return {
      name: 'Andaman & Nicobar Waters Sector',
      isIdentified: true,
      coordinatesFormatted,
    };
  }

  // Default fallback if outside specific geographic sectors
  return {
    name: 'SAR Acquisition Coverage Area',
    isIdentified: false,
    coordinatesFormatted,
  };
}

/**
 * Formats an ISO datetime string into tactical military UTC format:
 * Example: "29 AUG 2026 • 11:17 UTC"
 */
export function formatUtcAcquisition(isoString?: string): string {
  if (!isoString) return 'PENDING ACQUISITION';
  try {
    const d = new Date(isoString);
    const day = d.getUTCDate().toString().padStart(2, '0');
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const month = months[d.getUTCMonth()];
    const year = d.getUTCFullYear();
    const hours = d.getUTCHours().toString().padStart(2, '0');
    const mins = d.getUTCMinutes().toString().padStart(2, '0');
    return `${day} ${month} ${year} • ${hours}:${mins} UTC`;
  } catch {
    return isoString;
  }
}

/**
 * Converts a WGS84 bbox [min_lon, min_lat, max_lon, max_lat] to
 * Leaflet LatLngBoundsExpression: [[min_lat, min_lon], [max_lat, max_lon]]
 */
export function bboxToLeafletBounds(
  bbox: [number, number, number, number] | null | undefined
): [[number, number], [number, number]] | null {
  if (!bbox || bbox.length !== 4) return null;
  const [minLon, minLat, maxLon, maxLat] = bbox;
  return [
    [minLat, minLon],
    [maxLat, maxLon],
  ];
}
