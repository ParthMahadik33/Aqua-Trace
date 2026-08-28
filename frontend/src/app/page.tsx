'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useAisSocket } from '@/hooks/useAisSocket';
import { Vessel, ShipCategory, CategoryFilterState } from '@/types/vessel';
import { HeaderBar, SECTOR_PRESETS } from '@/components/Header/HeaderBar';
import { MapWrapper } from '@/components/Map/MapWrapper';
import { VesselDetailDrawer } from '@/components/VesselDrawer/VesselDetailDrawer';
import { VesselLegend } from '@/components/Legend/VesselLegend';
import { Activity, Navigation } from 'lucide-react';

const INITIAL_FILTERS: CategoryFilterState = {
  Tanker: true,
  Cargo: true,
  Fishing: true,
  Passenger: true,
  Other: true,
  Pending: true,
};

export default function Home() {
  const {
    vessels,
    connectionStatus,
    systemStatus,
    lastUpdateTime,
    categoryCounts,
    changeSector,
  } = useAisSocket();

  const [selectedVessel, setSelectedVessel] = useState<Vessel | null>(null);
  const [filterState, setFilterState] = useState<CategoryFilterState>(INITIAL_FILTERS);
  const [panTarget, setPanTarget] = useState<{ lat: number; lon: number; zoom?: number } | null>(null);

  // Active sector preset key
  const activePreset = systemStatus?.preset || 'ALL_INDIA';

  const sectorBounds: [[number, number], [number, number]] = useMemo(() => {
    if (systemStatus?.bounding_boxes && systemStatus.bounding_boxes.length > 0) {
      const box = systemStatus.bounding_boxes[0];
      return [
        [box[0][0], box[0][1]],
        [box[1][0], box[1][1]],
      ];
    }
    return [
      [6.0, 68.0],
      [24.0, 90.0],
    ];
  }, [systemStatus]);

  const sectorCenter = useMemo(() => {
    if (systemStatus?.center) {
      return { lat: systemStatus.center[0], lon: systemStatus.center[1] };
    }
    const minLat = sectorBounds[0][0];
    const minLon = sectorBounds[0][1];
    const maxLat = sectorBounds[1][0];
    const maxLon = sectorBounds[1][1];
    return {
      lat: (minLat + maxLat) / 2,
      lon: (minLon + maxLon) / 2,
    };
  }, [sectorBounds, systemStatus]);

  const defaultZoom = systemStatus?.zoom || (activePreset === 'ALL_INDIA' ? 5 : 7);

  // Keep selected vessel updated with fresh telemetry when vessels state updates
  useEffect(() => {
    if (selectedVessel) {
      const updated = vessels.find((v) => v.mmsi === selectedVessel.mmsi);
      if (updated) {
        setSelectedVessel(updated);
      }
    }
  }, [vessels, selectedVessel]);

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedVessel(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleToggleCategory = useCallback((category: ShipCategory) => {
    setFilterState((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  }, []);

  const handleToggleAll = useCallback((enableAll: boolean) => {
    setFilterState({
      Tanker: enableAll,
      Cargo: enableAll,
      Fishing: enableAll,
      Passenger: enableAll,
      Other: enableAll,
      Pending: enableAll,
    });
  }, []);

  const handleSelectVessel = useCallback((vessel: Vessel | null) => {
    setSelectedVessel(vessel);
    if (vessel) {
      setPanTarget({ lat: vessel.lat, lon: vessel.lon, zoom: 11 });
    }
  }, []);

  const handleRecenterSector = useCallback(() => {
    setPanTarget({ lat: sectorCenter.lat, lon: sectorCenter.lon, zoom: defaultZoom });
  }, [sectorCenter, defaultZoom]);

  const handleChangeSector = useCallback(
    (presetKey: string) => {
      setSelectedVessel(null); // Clear selected drawer
      changeSector(presetKey);

      // Instantly recenter map to new preset's target
      const presetData = SECTOR_PRESETS.find((p) => p.key === presetKey.toUpperCase());
      if (presetData) {
        // Find approximate zoom & center
        if (presetKey === 'ALL_INDIA') setPanTarget({ lat: 15.5, lon: 78.0, zoom: 5 });
        else if (presetKey === 'MUMBAI_GUJARAT') setPanTarget({ lat: 20.5, lon: 71.0, zoom: 7 });
        else if (presetKey === 'CHENNAI_VIZAG') setPanTarget({ lat: 15.0, lon: 82.5, zoom: 7 });
        else if (presetKey === 'KANDLA_MUNDRA') setPanTarget({ lat: 22.8, lon: 69.5, zoom: 8 });
        else if (presetKey === 'STRAIT_OF_HORMUZ') setPanTarget({ lat: 25.8, lon: 56.5, zoom: 7 });
        else if (presetKey === 'MALACCA_STRAIT') setPanTarget({ lat: 3.5, lon: 101.8, zoom: 7 });
      }
    },
    [changeSector]
  );

  const totalVisibleCount = vessels.filter((v) => filterState[v.ship_type]).length;

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#070A10] select-none">
      {/* Top Header with Sector Dropdown */}
      <HeaderBar
        connectionStatus={connectionStatus}
        vessels={vessels}
        onSelectVessel={handleSelectVessel}
        onRecenterSector={handleRecenterSector}
        lastUpdateTime={lastUpdateTime}
        activePresetKey={activePreset}
        onChangeSector={handleChangeSector}
      />

      {/* Main Full-Screen Map Canvas */}
      <div className="absolute inset-0 pt-14 z-0">
        <MapWrapper
          vessels={vessels}
          selectedVessel={selectedVessel}
          onSelectVessel={handleSelectVessel}
          filterState={filterState}
          panTarget={panTarget}
          sectorBounds={sectorBounds}
        />
      </div>

      {/* Bottom Left Legend & Category Layer Toggles */}
      <VesselLegend
        filterState={filterState}
        onToggleCategory={handleToggleCategory}
        onToggleAll={handleToggleAll}
        categoryCounts={categoryCounts}
        totalVisible={totalVisibleCount}
      />

      {/* Bottom Right Tactical Telemetry HUD */}
      <div className="absolute bottom-6 right-6 z-[500] hidden md:flex items-center gap-3 bg-[#0A0E17]/90 border border-white/10 px-3.5 py-2 rounded-xl backdrop-blur-md text-xs font-mono text-zinc-400 shadow-xl">
        <div className="flex items-center gap-1.5 text-zinc-300">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span>VESSELS: <strong className="text-white">{vessels.length}</strong></span>
        </div>
        <span className="text-zinc-600">|</span>
        <div className="flex items-center gap-1.5 text-zinc-300">
          <Navigation className="w-3.5 h-3.5 text-emerald-400" />
          <span>STREAM: <strong className="text-emerald-400">{systemStatus?.status || connectionStatus}</strong></span>
        </div>
      </div>

      {/* Slide-in Right Side Panel / Vessel Dossier */}
      <VesselDetailDrawer
        vessel={selectedVessel}
        onClose={() => setSelectedVessel(null)}
        onFocusVessel={(v) => setPanTarget({ lat: v.lat, lon: v.lon, zoom: 12 })}
      />
    </main>
  );
}
