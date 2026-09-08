'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useAisSocket } from '@/hooks/useAisSocket';
import { Vessel, ShipCategory, CategoryFilterState } from '@/types/vessel';
import { HeaderBar, SECTOR_PRESETS } from '@/components/Header/HeaderBar';
import { MapWrapper } from '@/components/Map/MapWrapper';
import { VesselDetailDrawer } from '@/components/VesselDrawer/VesselDetailDrawer';
import { VesselLegend } from '@/components/Legend/VesselLegend';
import { SatelliteSurveillancePanel } from '@/components/Surveillance/SatelliteSurveillancePanel';
import { useSentinelSar } from '@/hooks/useSentinelSar';
import { Activity, Navigation, Satellite, Crop } from 'lucide-react';

const INITIAL_FILTERS: CategoryFilterState = {
  Tanker: true,
  Cargo: true,
  Fishing: true,
  Passenger: true,
  Other: true,
  Pending: true,
};

export default function LiveOperationsPage() {
  const {
    vessels,
    connectionStatus,
    systemStatus,
    lastUpdateTime,
    categoryCounts,
    changeSector,
  } = useAisSocket();

  const sarState = useSentinelSar(true);

  const [selectedVessel, setSelectedVessel] = useState<Vessel | null>(null);
  const [filterState, setFilterState] = useState<CategoryFilterState>(INITIAL_FILTERS);
  const [panTarget, setPanTarget] = useState<{ lat: number; lon: number; zoom?: number } | null>(null);
  const [isSarPanelOpen, setIsSarPanelOpen] = useState<boolean>(true); // Default open on landing to showcase SAR capabilities
  const [isSelectingAoi, setIsSelectingAoi] = useState<boolean>(false);

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

  const currentSectorName = systemStatus?.preset_name || SECTOR_PRESETS.find((p) => p.key === activePreset)?.name || 'Maritime Corridor';

  const handleAoiComplete = useCallback(
    (bbox: [number, number, number, number]) => {
      setIsSelectingAoi(false);
      setIsSarPanelOpen(true);
      sarState.checkAoiCoverage(bbox);

      // Center map on selected AOI
      const centerLon = (bbox[0] + bbox[2]) / 2;
      const centerLat = (bbox[1] + bbox[3]) / 2;
      setPanTarget({ lat: centerLat, lon: centerLon, zoom: 8 });
    },
    [sarState]
  );

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#070A10] select-none">
      {/* Top Header with Sector Dropdown, SAR Recon, and SELECT AREA Buttons */}
      <HeaderBar
        connectionStatus={connectionStatus}
        vessels={vessels}
        onSelectVessel={handleSelectVessel}
        onRecenterSector={handleRecenterSector}
        lastUpdateTime={lastUpdateTime}
        activePresetKey={activePreset}
        onChangeSector={handleChangeSector}
        isSarPanelOpen={isSarPanelOpen}
        onToggleSarPanel={() => setIsSarPanelOpen((prev) => !prev)}
        isSelectingAoi={isSelectingAoi}
        onToggleSelectAoi={() => setIsSelectingAoi((prev) => !prev)}
      />

      {/* Interactive AOI Mode Top HUD Banner */}
      {isSelectingAoi && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[600] flex items-center gap-3 px-4 py-2 rounded-xl bg-[#080C14]/95 border border-amber-400 text-amber-300 font-mono text-xs shadow-2xl shadow-amber-950/60 backdrop-blur-md animate-pulse select-none">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span>CLICK &amp; DRAG ON MAP TO DRAW AREA OF INTEREST (AOI)</span>
          <button
            onClick={() => setIsSelectingAoi(false)}
            className="ml-2 px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white text-[10px] border border-white/20 cursor-pointer font-bold"
          >
            CANCEL [ESC]
          </button>
        </div>
      )}

      {/* Main Full-Screen Map Canvas */}
      <div className="absolute inset-0 pt-14 z-0">
        <MapWrapper
          vessels={vessels}
          selectedVessel={selectedVessel}
          onSelectVessel={handleSelectVessel}
          filterState={filterState}
          panTarget={panTarget}
          sectorBounds={sectorBounds}
          sarBounds={sarState.leafletBounds}
          sarLabel={sarState.identifiedSector.name}
          sarAcquisitionTime={sarState.formattedAcquisitionTime}
          onSelectSarFootprint={() => setIsSarPanelOpen(true)}
          isSelectingAoi={isSelectingAoi}
          selectedAoi={sarState.activeAoiBbox}
          onAoiComplete={handleAoiComplete}
          onCancelAoi={() => setIsSelectingAoi(false)}
        />
      </div>

      {/* Floating Tactical Satellite Surveillance Quick-Launch Trigger (Visible if closed) */}
      {!isSarPanelOpen && (
        <div className="absolute top-18 right-6 z-[450] flex items-center gap-2">
          {/* Quick Select Area Button */}
          <button
            onClick={() => setIsSelectingAoi((prev) => !prev)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl font-mono text-xs shadow-xl backdrop-blur-md transition-all hover:scale-105 cursor-pointer ${
              isSelectingAoi
                ? 'bg-amber-500/25 border border-amber-400 text-amber-300 shadow-amber-950/50 animate-pulse'
                : 'bg-[#080C14]/90 hover:bg-[#0c121e] border border-white/15 text-zinc-300 hover:text-white'
            }`}
            title="Click and drag to select an Area of Interest on map"
          >
            <Crop className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold">SELECT AREA</span>
          </button>

          {/* Quick Open SAR Surveillance Panel */}
          <button
            onClick={() => setIsSarPanelOpen(true)}
            className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-[#080C14]/90 hover:bg-[#0c121e] border border-cyan-500/40 text-cyan-300 font-mono text-xs shadow-xl shadow-cyan-950/40 backdrop-blur-md transition-all hover:scale-105 cursor-pointer group"
            title="Open Copernicus Sentinel-1 SAR Surveillance Panel"
          >
            <div className="relative flex items-center justify-center w-5 h-5 rounded bg-cyan-500/20 text-cyan-400">
              <Satellite className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <span className="font-semibold tracking-wider">SAR RECON</span>
          </button>
        </div>
      )}

      {/* Dedicated Copernicus Sentinel-1 SAR Surveillance Panel */}
      <SatelliteSurveillancePanel
        isOpen={isSarPanelOpen}
        onClose={() => setIsSarPanelOpen(false)}
        activeSectorName={currentSectorName}
        sarState={sarState}
        onStartAoiSelect={() => setIsSelectingAoi(true)}
        onFocusCoverage={(bounds) => {
          const centerLat = (bounds[0][0] + bounds[1][0]) / 2;
          const centerLon = (bounds[0][1] + bounds[1][1]) / 2;
          setPanTarget({ lat: centerLat, lon: centerLon, zoom: 8 });
        }}
      />

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
