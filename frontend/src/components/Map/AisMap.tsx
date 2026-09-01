'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, useMap, Rectangle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Vessel, CategoryFilterState } from '@/types/vessel';
import { CustomShipMarker } from './CustomShipMarker';
import { VesselTrackLayer } from './VesselTrackLayer';
import { SarFootprintLayer } from './SarFootprintLayer';
import { AoiSelectionLayer } from './AoiSelectionLayer';

// Fix standard Leaflet default icon issues in bundlers
delete (L.Icon.Default.prototype as { _getIconUrl?: string })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface AisMapProps {
  vessels: Vessel[];
  selectedVessel: Vessel | null;
  onSelectVessel: (vessel: Vessel | null) => void;
  filterState: CategoryFilterState;
  panTarget: { lat: number; lon: number; zoom?: number } | null;
  sectorBounds?: [[number, number], [number, number]];
  sarBounds?: [[number, number], [number, number]] | null;
  sarLabel?: string;
  sarAcquisitionTime?: string;
  onSelectSarFootprint?: () => void;
  isSelectingAoi?: boolean;
  selectedAoi?: [number, number, number, number] | null;
  onAoiComplete?: (bbox: [number, number, number, number]) => void;
  onCancelAoi?: () => void;
}



// Map Controller for smooth flyTo and recentering
function MapController({
  panTarget,
  selectedVessel,
}: {
  panTarget: { lat: number; lon: number; zoom?: number } | null;
  selectedVessel: Vessel | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (panTarget) {
      map.flyTo([panTarget.lat, panTarget.lon], panTarget.zoom || 10, {
        duration: 1.5,
        easeLinearity: 0.25,
      });
    }
  }, [panTarget, map]);

  useEffect(() => {
    if (selectedVessel) {
      map.panTo([selectedVessel.lat, selectedVessel.lon], {
        animate: true,
        duration: 0.8,
      });
    }
  }, [selectedVessel, map]);

  return null;
}

const DEFAULT_SECTOR_BOUNDS: [[number, number], [number, number]] = [
  [6.0, 68.0],
  [24.0, 90.0],
];

export const AisMap: React.FC<AisMapProps> = ({
  vessels,
  selectedVessel,
  onSelectVessel,
  filterState,
  panTarget,
  sectorBounds = DEFAULT_SECTOR_BOUNDS,
  sarBounds,
  sarLabel,
  sarAcquisitionTime,
  onSelectSarFootprint,
  isSelectingAoi = false,
  selectedAoi = null,
  onAoiComplete,
  onCancelAoi,
}) => {
  // Filter vessels based on category toggle
  const visibleVessels = vessels.filter((v) => {
    const isCategoryVisible = filterState[v.ship_type] ?? true;
    return isCategoryVisible;
  });

  return (
    <div className="relative w-full h-full bg-[#070A10]">
      <MapContainer
        center={[15.5, 78.0]}
        zoom={5}
        minZoom={3}
        maxZoom={18}
        zoomControl={false}
        attributionControl={false}
        className="w-full h-full z-0 cursor-crosshair"
      >
        {/* Esri Dark Gray Tactical Basemap - 100% Free, Zero Watermark, No API Key Required */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          maxZoom={16}
          attribution="&copy; Esri &mdash; Esri, DeLorme, NAVTEQ"
        />

        {/* Global Monitoring Region Boundary Box */}
        <Rectangle
          bounds={sectorBounds}
          pathOptions={{
            color: '#00F0FF',
            weight: 1.5,
            dashArray: '4, 8',
            fillOpacity: 0.03,
            fillColor: '#00F0FF',
          }}
        />

        {/* Interactive Click-and-Drag AOI Selection Layer */}
        <AoiSelectionLayer
          isSelecting={isSelectingAoi}
          selectedAoi={selectedAoi}
          onAoiComplete={onAoiComplete || (() => {})}
          onCancelSelection={onCancelAoi || (() => {})}
        />

        {/* Real Sentinel-1 SAR Acquisition Coverage Footprint Layer */}
        {sarBounds && (
          <SarFootprintLayer
            bounds={sarBounds}
            sectorLabel={sarLabel}
            acquisitionTimeFormatted={sarAcquisitionTime}
            onSelectFootprint={onSelectSarFootprint}
          />
        )}



        {/* Selected Vessel Historical & Projected Dead-Reckoning Track */}
        <VesselTrackLayer vessel={selectedVessel} />

        {/* Map Controller for programmatic pan/fly animations */}
        <MapController panTarget={panTarget} selectedVessel={selectedVessel} />

        {/* Custom Ship Markers */}
        {visibleVessels.map((vessel) => (
          <CustomShipMarker
            key={vessel.mmsi}
            vessel={vessel}
            isSelected={selectedVessel?.mmsi === vessel.mmsi}
            onSelect={(v) => onSelectVessel(v)}
          />
        ))}
      </MapContainer>
    </div>
  );
};

export default AisMap;
