'use client';

import React, { useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Rectangle,
  Polygon,
  CircleMarker,
  Polyline,
  Tooltip,
  Popup,
  useMap,
  ImageOverlay,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  SimulationStepId,
  SarMetadata,
  MetoceanContext,
  SourceReconstructionModel,
  CandidateVessel,
  CounterfactualScenario,
  ImpactPrioritization,
} from '@/types/simulation';
import { AisCorrelationMapLayer } from './AisCorrelationMapLayer';
import { ImpactForecastMapLayer } from './ImpactForecastMapLayer';
import { CounterfactualMapLayer } from './CounterfactualMapLayer';
import { useTheme } from '@/context/ThemeContext';

// Fix standard Leaflet default icon issues in bundlers
delete (L.Icon.Default.prototype as { _getIconUrl?: string })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface SimulationMapInnerProps {
  currentStepId: SimulationStepId;
  sarMetadata: SarMetadata;
  metocean: MetoceanContext;
  sourceRecon: SourceReconstructionModel;
  candidates: CandidateVessel[];
  counterfactual: CounterfactualScenario[];
  impact: ImpactPrioritization;
  selectedCandidate: CandidateVessel | null;
  onSelectCandidate: (candidate: CandidateVessel) => void;
  activeOverlayMode: 'none' | 'vv' | 'composite' | 'mask' | 'overlay';
  overlayOpacity: number;
  forecastHours?: number;
  forecastLayers?: {
    coastalExposure: boolean;
    ecological: boolean;
    fisheries: boolean;
    population: boolean;
  };
  dynamicCounterfactual?: any;
  counterfactualTimelineStep?: number;
}

import { SimulationMapControls } from './SimulationMapControls';

// Explicit Leaflet Custom Pane Configuration
// Strict Analytical Evidence Stacking Order (Bottom -> Top)
// 1. Base Map (tilePane: 200)
// 2. SAR Raster Imagery (sarRasterPane: 410)
// 3. SAR Footprint & Metocean (environmentPane: 420)
// 4. Source Corridor (corridorPane: 430)
// 5. Hindcast Trajectories (trajectoryPane: 440)
// 6. Vessel Tracks (vesselPane: 450)
// 7. Simulated Plume & Particles (plumePane: 460)
// 8. Observed Slick Polygon (slickPane: 470)
// 9. Centroids & Measurement Lines (annotationPane: 480)
// 10. Analytical Labels & Callouts (labelPane: 490)
// 11. Interactive Map Controls (controlPane: 1000)
interface LeafletPaneDef {
  name: string;
  zIndex: number;
  pointerEvents?: string;
}

export const SIMULATION_MAP_PANES: LeafletPaneDef[] = [
  { name: 'sarRasterPane', zIndex: 410, pointerEvents: 'none' },
  { name: 'environmentPane', zIndex: 420 },
  { name: 'corridorPane', zIndex: 430 },
  { name: 'trajectoryPane', zIndex: 440 },
  { name: 'vesselPane', zIndex: 450 },
  { name: 'plumePane', zIndex: 460 },
  { name: 'slickPane', zIndex: 470 },
  { name: 'annotationPane', zIndex: 480 },
  { name: 'labelPane', zIndex: 490, pointerEvents: 'none' },
  { name: 'controlPane', zIndex: 1000 },
];

function LeafletPanesSetup({ onReady }: { onReady?: () => void }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    SIMULATION_MAP_PANES.forEach(({ name, zIndex, pointerEvents }) => {
      let pane = map.getPane(name);
      if (!pane) {
        pane = map.createPane(name);
      }
      pane.style.zIndex = `${zIndex}`;
      if (pointerEvents) {
        pane.style.pointerEvents = pointerEvents;
      }
    });
    onReady?.();
  }, [map, onReady]);

  // Synchronous initialization on render so child layers never query non-existent panes
  if (map && typeof window !== 'undefined') {
    SIMULATION_MAP_PANES.forEach(({ name, zIndex, pointerEvents }) => {
      let pane = map.getPane(name);
      if (!pane) {
        pane = map.createPane(name);
      }
      pane.style.zIndex = `${zIndex}`;
      if (pointerEvents) {
        pane.style.pointerEvents = pointerEvents;
      }
    });
  }

  return null;
}

const STAGE_OPACITY_DEFAULTS: Partial<Record<SimulationStepId, number>> = {
  surveillance: 0.70,
  sar_acquisition: 0.75,
  sar_processing: 0.75,
  detection: 0.70,
  segmentation: 0.70,
  environmental: 0.65,
  source_reconstruction: 0.65,
  ais_correlation: 0.60,
  attribution: 0.60,
  counterfactual: 0.60,
  impact_prioritization: 0.55,
  report: 0.60,
};

// Controller for camera view transitions per simulation step (derived from active incident geometry)
function SimulationCameraController({
  stepId,
  sarMetadata,
  sourceRecon,
  selectedCandidate,
  dynamicCenter,
  dynamicCounterfactual,
}: {
  stepId: SimulationStepId;
  sarMetadata: SarMetadata;
  sourceRecon: SourceReconstructionModel;
  selectedCandidate?: CandidateVessel | null;
  dynamicCenter?: [number, number];
  dynamicCounterfactual?: any;
}) {
  const map = useMap();

  useEffect(() => {
    const slickLat = dynamicCenter?.[0] ?? sarMetadata.slickBbox.centerLat ?? 55.2443;
    const slickLon = dynamicCenter?.[1] ?? sarMetadata.slickBbox.centerLon ?? 5.8856;
    const slickCenter: [number, number] = [slickLat, slickLon];

    const sceneLat = (sarMetadata.geographicBbox.minLat + sarMetadata.geographicBbox.maxLat) / 2;
    const sceneLon = (sarMetadata.geographicBbox.minLon + sarMetadata.geographicBbox.maxLon) / 2;
    const sceneCenter: [number, number] = [sceneLat, sceneLon];

    const originLat = sourceRecon?.originCentroid?.lat ?? (slickLat - 0.05);
    const originLon = sourceRecon?.originCentroid?.lon ?? (slickLon - 0.07);
    const originCenter: [number, number] = [originLat, originLon];

    const vesselWp = selectedCandidate?.trackWaypoints?.[0];
    const vesselLat = vesselWp?.lat ?? (selectedCandidate as any)?.lat ?? originLat;
    const vesselLon = vesselWp?.lon ?? (selectedCandidate as any)?.lon ?? originLon;
    const vesselPos: [number, number] = [vesselLat, vesselLon];

    switch (stepId) {
      case 'surveillance':
        map.flyTo(sceneCenter, 8, { duration: 1.2 });
        break;
      case 'sar_acquisition':
      case 'sar_processing':
      case 'detection':
        map.flyTo(slickCenter, 11, { duration: 1.2 });
        break;
      case 'segmentation':
        map.flyTo(slickCenter, 12, { duration: 1.2 });
        break;
      case 'environmental':
        map.flyTo(slickCenter, 10, { duration: 1.2 });
        break;
      case 'source_reconstruction': {
        const points: [number, number][] = [
          [sarMetadata.slickBbox.minLat, sarMetadata.slickBbox.minLon],
          [sarMetadata.slickBbox.maxLat, sarMetadata.slickBbox.maxLon],
          [originLat, originLon],
        ];
        sourceRecon?.ensembleTrajectories?.forEach((ens) => {
          ens.waypoints?.forEach((w) => points.push([w.lat, w.lon]));
        });
        const bounds = L.latLngBounds(points);
        map.fitBounds(bounds, { padding: [55, 55], maxZoom: 13, animate: true, duration: 1.2 });
        break;
      }
      case 'ais_correlation': {
        const points: [number, number][] = [
          [55.13, 5.70],
          [55.24, 5.96],
        ];
        if (selectedCandidate?.trackWaypoints?.length) {
          selectedCandidate.trackWaypoints.forEach((w) => points.push([w.lat, w.lon]));
        } else {
          points.push(vesselPos);
        }
        const bounds = L.latLngBounds(points);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12, animate: true, duration: 1.2 });
        break;
      }
      case 'attribution':
        map.flyTo(vesselPos, 11, { duration: 1.2 });
        break;
      case 'counterfactual': {
        const points: [number, number][] = [
          [sarMetadata.slickBbox.minLat, sarMetadata.slickBbox.minLon],
          [sarMetadata.slickBbox.maxLat, sarMetadata.slickBbox.maxLon],
        ];
        if (selectedCandidate?.trackWaypoints?.length) {
          selectedCandidate.trackWaypoints.forEach((w) => points.push([w.lat, w.lon]));
        } else {
          points.push(vesselPos);
        }
        if (dynamicCounterfactual?.simulation?.plume_centroid) {
          points.push([
            dynamicCounterfactual.simulation.plume_centroid.lat,
            dynamicCounterfactual.simulation.plume_centroid.lon,
          ]);
        }
        const bounds = L.latLngBounds(points);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13, animate: true, duration: 1.2 });
        break;
      }
      case 'impact_prioritization': {
        const points: [number, number][] = [
          slickCenter,
          [54.20, 7.00],
          [54.85, 6.70],
          [55.30, 5.80],
        ];
        const bounds = L.latLngBounds(points);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10, animate: true, duration: 1.2 });
        break;
      }
      case 'report':
        map.flyTo(slickCenter, 10, { duration: 1.2 });
        break;
    }
  }, [stepId, map, dynamicCenter, sarMetadata, sourceRecon, selectedCandidate, dynamicCounterfactual]);

  return null;
}

export const SimulationMapInner: React.FC<SimulationMapInnerProps> = ({
  currentStepId,
  sarMetadata,
  metocean,
  sourceRecon,
  candidates,
  counterfactual,
  impact,
  selectedCandidate,
  onSelectCandidate,
  activeOverlayMode,
  overlayOpacity,
  forecastHours = 0,
  forecastLayers = {
    coastalExposure: true,
    ecological: false,
    fisheries: false,
    population: false,
  },
  dynamicCounterfactual,
  counterfactualTimelineStep = 0,
}) => {
  const [panesReady, setPanesReady] = React.useState<boolean>(false);

  const sarBounds: [[number, number], [number, number]] = [
    [sarMetadata.geographicBbox.minLat, sarMetadata.geographicBbox.minLon],
    [sarMetadata.geographicBbox.maxLat, sarMetadata.geographicBbox.maxLon],
  ];

  const slickBounds: [[number, number], [number, number]] = [
    [sarMetadata.slickBbox.minLat, sarMetadata.slickBbox.minLon],
    [sarMetadata.slickBbox.maxLat, sarMetadata.slickBbox.maxLon],
  ];

  // Derive dynamic geographic center for non-German Bight incidents
  const dynamicCenter: [number, number] | undefined =
    dynamicCounterfactual?.isDynamic && sarMetadata.slickBbox?.centerLat
      ? [sarMetadata.slickBbox.centerLat, sarMetadata.slickBbox.centerLon]
      : undefined;

  // Overlay URL based on mode
  let overlayImageUrl: string | null = null;
  if (activeOverlayMode === 'vv') {
    overlayImageUrl = '/prototype/case_0004/part1_oil_00004_vv.png';
  } else if (activeOverlayMode === 'composite') {
    overlayImageUrl = '/prototype/case_0004/part1_oil_00004_composite.png';
  } else if (activeOverlayMode === 'mask') {
    overlayImageUrl = '/prototype/case_0004/part1_oil_00004_slick_mask.png';
  } else if (activeOverlayMode === 'overlay') {
    overlayImageUrl = '/prototype/case_0004/part1_oil_00004_slick_overlay.png';
  }

  // Restrain SAR raster opacity to calibrated 0.55-0.75 band so analytical markings are always foregrounded
  const stageDefault = STAGE_OPACITY_DEFAULTS[currentStepId] ?? 0.65;
  const effectiveOpacity = Math.min(0.75, Math.max(0.20, overlayOpacity <= 0.85 ? overlayOpacity : stageDefault));

  const { theme } = useTheme();

  return (
      <MapContainer
        center={[sarMetadata.slickBbox.centerLat, sarMetadata.slickBbox.centerLon]}
        zoom={9}
        minZoom={4}
        maxZoom={16}
        zoomControl={false}
        attributionControl={false}
        className="w-full h-full z-0 cursor-crosshair"
      >
        {/* Synchronously establish explicit Leaflet pane z-index hierarchy */}
        <LeafletPanesSetup onReady={() => setPanesReady(true)} />

        {/* Dynamic Basemap: Light mode uses Esri Light Gray Canvas; Dark mode uses Esri Dark Gray Canvas (tilePane: 200) */}
        {theme === 'light' ? (
          <TileLayer
            key="esri-light"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
            maxZoom={16}
            attribution="&copy; Esri &mdash; Esri, DeLorme, NAVTEQ"
          />
        ) : (
          <TileLayer
            key="esri-dark"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
            maxZoom={16}
            attribution="&copy; Esri &mdash; Esri, DeLorme, NAVTEQ"
          />
        )}

        <SimulationCameraController
          stepId={currentStepId}
          sarMetadata={sarMetadata}
          sourceRecon={sourceRecon}
          selectedCandidate={selectedCandidate}
          dynamicCenter={dynamicCenter}
          dynamicCounterfactual={dynamicCounterfactual}
        />

        {/* Analyst Map Controls (Zoom, Fit Evidence, Fit Source, Fit Vessel, Fit Slick, Fit Plume) */}
        <SimulationMapControls
          currentStepId={currentStepId}
          sarMetadata={sarMetadata}
          selectedCandidate={selectedCandidate}
          sourceRecon={sourceRecon}
          dynamicCounterfactual={dynamicCounterfactual}
        />

        {/* 1. Sentinel-1 SAR Acquisition Footprint (environmentPane: 420) */}
        <Rectangle
          bounds={sarBounds}
          pathOptions={{
            color: '#00F0FF',
            weight: 1.5,
            dashArray: '5, 8',
            fillOpacity: 0.04,
            fillColor: '#00F0FF',
            pane: 'environmentPane',
          }}
        >
          <Tooltip direction="top" permanent opacity={0.85} className="tactical-tooltip" pane="labelPane">
            <div className="px-2 py-1 rounded bg-[#080C14]/90 border border-cyan-500/40 text-cyan-300 font-mono text-[10px] shadow-lg">
              SENTINEL-1A SAR FOOTPRINT // ORBIT #023085
            </div>
          </Tooltip>
        </Rectangle>

        {/* 2. SAR Raster Image Overlay (VV, Composite, Mask, Overlay) - ALWAYS IN sarRasterPane: 410 */}
        {overlayImageUrl && (
          <ImageOverlay
            url={overlayImageUrl}
            bounds={sarBounds}
            opacity={effectiveOpacity}
            pane="sarRasterPane"
            interactive={false}
          />
        )}

        {/* 3. Delineated Slick Polygon & Centroid (slickPane: 470, annotationPane: 480) */}
        {(currentStepId === 'segmentation' ||
          currentStepId === 'source_reconstruction' ||
          currentStepId === 'ais_correlation' ||
          currentStepId === 'attribution' ||
          currentStepId === 'impact_prioritization' ||
          currentStepId === 'report') && (
          <>
            <Rectangle
              bounds={slickBounds}
              pathOptions={{
                color: '#A855F7',
                weight: 2,
                dashArray: '3, 4',
                fillOpacity: 0.15,
                fillColor: '#7E22CE',
                pane: 'slickPane',
              }}
            >
              <Tooltip direction="bottom" opacity={0.9} className="tactical-tooltip" pane="labelPane">
                <div className="px-2 py-1 rounded bg-[#0B0914]/95 border border-purple-500/60 text-purple-300 font-mono text-[10px] shadow-lg">
                  OBSERVED SLICK: 44,049 PX // 4.41 KM²
                </div>
              </Tooltip>
            </Rectangle>

            {/* Slick Centroid Marker */}
            <CircleMarker
              center={[sarMetadata.slickBbox.centerLat, sarMetadata.slickBbox.centerLon]}
              radius={6}
              pathOptions={{
                color: '#C084FC',
                fillColor: '#A855F7',
                fillOpacity: 0.9,
                weight: 2,
                pane: 'annotationPane',
              }}
            >
              <Popup className="tactical-popup">
                <div className="p-2 font-mono text-xs bg-[#0C121E] text-white rounded border border-purple-500/40">
                  <div className="font-bold text-purple-300">OBSERVED OIL SLICK CENTROID</div>
                  <div className="text-[10px] text-zinc-400 mt-1">
                    55.2443°N, 5.8856°E
                  </div>
                  <div className="text-[10px] text-zinc-300 mt-0.5">
                    Acquisition: 17:25:51 UTC (Sentinel-1A)
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          </>
        )}

        {/* 4. Metocean Wind & Current Vectors (environmentPane: 420) */}
        {(currentStepId === 'environmental' || currentStepId === 'report') && (
          <>
            {/* Wind Vector Arrow */}
            <Polyline
              positions={[
                [sarMetadata.slickBbox.centerLat - 0.04, sarMetadata.slickBbox.centerLon - 0.08],
                [sarMetadata.slickBbox.centerLat - 0.01, sarMetadata.slickBbox.centerLon + 0.04],
              ]}
              pathOptions={{
                color: '#38BDF8',
                weight: 3,
                dashArray: '6, 6',
                pane: 'environmentPane',
              }}
            >
              <Tooltip permanent direction="right" className="tactical-tooltip" pane="labelPane">
                <div className="px-2 py-1 rounded bg-[#071324]/90 border border-sky-400/40 text-sky-300 font-mono text-[10px]">
                  WIND: {metocean?.windSpeedMs ?? 4.8} m/s ({((metocean?.windSpeedMs ?? 4.8) * 1.94384).toFixed(1)} kn) FROM {metocean?.windDirectionDeg ?? 245}° [CASE REPLAY METOCEAN]
                </div>
              </Tooltip>
            </Polyline>

            {/* Surface Current Vector */}
            <Polyline
              positions={[
                [sarMetadata.slickBbox.centerLat - 0.02, sarMetadata.slickBbox.centerLon - 0.06],
                [sarMetadata.slickBbox.centerLat, sarMetadata.slickBbox.centerLon + 0.02],
              ]}
              pathOptions={{
                color: '#34D399',
                weight: 2.5,
                pane: 'environmentPane',
              }}
            >
              <Tooltip permanent direction="bottom" className="tactical-tooltip" pane="labelPane">
                <div className="px-2 py-1 rounded bg-[#061814]/90 border border-emerald-400/40 text-emerald-300 font-mono text-[10px]">
                  CURRENT: {metocean?.currentVelocityMs ?? 0.35} m/s ({((metocean?.currentVelocityMs ?? 0.35) * 1.94384).toFixed(2)} kn) SET {metocean?.currentDirectionDeg ?? 112}° [CASE REPLAY METOCEAN]
                </div>
              </Tooltip>
            </Polyline>
          </>
        )}

        {/* 5. Backward Lagrangian Ensemble Trajectories (trajectoryPane: 440, corridorPane: 430) */}
        {(currentStepId === 'source_reconstruction' ||
          currentStepId === 'ais_correlation' ||
          currentStepId === 'attribution' ||
          currentStepId === 'report') && (
          <>
            {/* Render each of the 5 ensemble trajectories */}
            {sourceRecon.ensembleTrajectories.map((ens) => {
              const ensembleStyles: Record<number, { color: string; dash?: string; label: string; weight: number }> = {
                1: { color: '#10B981', label: 'ENS #1 (MEAN CONTROL - 35%)', weight: 3.5 },
                2: { color: '#06B6D4', dash: '4, 4', label: 'ENS #2 (+10% WINDAGE - 20%)', weight: 2.2 },
                3: { color: '#3B82F6', dash: '4, 4', label: 'ENS #3 (-10% WINDAGE - 20%)', weight: 2.2 },
                4: { color: '#F59E0B', dash: '5, 5', label: 'ENS #4 (+15% CURRENT N - 12.5%)', weight: 2.2 },
                5: { color: '#EC4899', dash: '5, 5', label: 'ENS #5 (-15% CURRENT S - 12.5%)', weight: 2.2 },
              };
              const style = ensembleStyles[ens.ensembleId] || {
                color: ens.color || '#10B981',
                dash: '4, 4',
                label: `ENS #${ens.ensembleId}`,
                weight: 2,
              };

              return (
                <Polyline
                  key={ens.ensembleId}
                  positions={ens.waypoints.map((w) => [w.lat, w.lon])}
                  pathOptions={{
                    color: style.color,
                    weight: style.weight,
                    dashArray: style.dash,
                    opacity: 0.9,
                    pane: 'trajectoryPane',
                  }}
                >
                  <Tooltip direction="top" className="tactical-tooltip" pane="labelPane">
                    <div className="px-2 py-1 rounded bg-[#061814]/95 border border-emerald-400/40 text-emerald-300 font-mono text-[9px] shadow-lg">
                      {style.label}
                    </div>
                  </Tooltip>
                </Polyline>
              );
            })}

            {/* Trajectory Time Waypoints on Primary Ensemble */}
            {sourceRecon.trajectoryPoints.map((pt, i) => (
              <CircleMarker
                key={i}
                center={[pt.lat, pt.lon]}
                radius={i === sourceRecon.trajectoryPoints.length - 1 ? 7 : 4}
                pathOptions={{
                  color: i === sourceRecon.trajectoryPoints.length - 1 ? '#EF4444' : '#10B981',
                  fillColor: i === sourceRecon.trajectoryPoints.length - 1 ? '#F87171' : '#34D399',
                  fillOpacity: 0.85,
                  weight: 1.5,
                  pane: 'trajectoryPane',
                }}
              >
                <Tooltip direction="left" opacity={0.9} className="tactical-tooltip" pane="labelPane">
                  <div className="px-1.5 py-0.5 rounded bg-[#061814]/95 border border-emerald-400/40 text-emerald-300 font-mono text-[9px]">
                    T - {pt.hoursAgo}h ({pt.timestamp.slice(11, 16)} UTC) [HINDCAST]
                  </div>
                </Tooltip>
              </CircleMarker>
            ))}

            {/* Reconstructed Source Corridor Geographic Polygon (corridorPane: 430) */}
            <Polygon
              positions={[
                [55.15, 5.70],
                [55.17, 5.74],
                [55.21, 5.83],
                [55.23, 5.92],
                [55.21, 5.96],
                [55.18, 5.90],
                [55.15, 5.82],
                [55.13, 5.75],
              ]}
              pathOptions={{
                color: '#EF4444',
                weight: 2,
                dashArray: '4, 6',
                fillColor: '#EF4444',
                fillOpacity: 0.12,
                pane: 'corridorPane',
              }}
            >
              <Tooltip permanent direction="top" className="tactical-tooltip" pane="labelPane">
                <div className="px-2 py-0.5 rounded bg-[#180A0A]/95 border border-red-500/70 text-red-300 font-mono text-[9px] shadow-xl">
                  SOURCE CORRIDOR // CONVERGENCE 11:45–13:20 UTC
                </div>
              </Tooltip>
            </Polygon>

            {/* Origin Centroid Locus Indicator (corridorPane: 430) */}
            <CircleMarker
              center={[sourceRecon.originCentroid.lat, sourceRecon.originCentroid.lon]}
              radius={32}
              pathOptions={{
                color: '#EF4444',
                fillColor: '#EF4444',
                fillOpacity: 0.18,
                weight: 2,
                dashArray: '3, 4',
                pane: 'corridorPane',
              }}
            >
              <Tooltip direction="bottom" className="tactical-tooltip" pane="labelPane">
                <div className="px-2 py-1 rounded bg-[#180A0A]/95 border border-red-500/70 text-red-300 font-mono text-[10px] shadow-xl">
                  ESTIMATED ORIGIN // 12:35 UTC · 215 m³
                </div>
              </Tooltip>
            </CircleMarker>
          </>
        )}

        {/* 6A. Interactive Animated AIS Fleet Correlation (Stage 08) */}
        {currentStepId === 'ais_correlation' && (
          <AisCorrelationMapLayer
            onSelectCandidate={onSelectCandidate}
            selectedCandidate={selectedCandidate}
          />
        )}

        {/* 6B. Candidate AIS Vessel Trajectories (Stages 09 Attribution, 12 Report - vesselPane: 450) */}
        {(currentStepId === 'attribution' ||
          currentStepId === 'report') && (
          <>
            {candidates.map((vessel) => {
              const isSelected = selectedCandidate?.mmsi === vessel.mmsi;
              const isPrimary = vessel.isPrimarySuspect;
              const trackPoints: [number, number][] = vessel.trackWaypoints.map((w) => [
                w.lat,
                w.lon,
              ]);

              const trackColor = isPrimary
                ? '#F59E0B' // Amber for primary suspect
                : vessel.mmsi === '211280000'
                ? '#38BDF8' // Sky blue for container
                : vessel.mmsi === '356910000'
                ? '#94A3B8' // Slate for bulk carrier
                : '#A78BFA'; // Violet for trawler

              return (
                <React.Fragment key={vessel.mmsi}>
                  {/* Vessel Track Polyline (vesselPane: 450) */}
                  <Polyline
                    positions={trackPoints}
                    pathOptions={{
                      color: trackColor,
                      weight: isSelected || isPrimary ? 3.5 : 1.5,
                      dashArray: isPrimary ? undefined : '4, 4',
                      opacity: isSelected || isPrimary ? 0.95 : 0.4,
                      pane: 'vesselPane',
                    }}
                  />

                  {/* Waypoint Markers */}
                  {vessel.trackWaypoints.map((wp, wIdx) => {
                    const isIntersectPoint = isPrimary && wp.timestamp === '12:35';

                    return (
                      <CircleMarker
                        key={wIdx}
                        center={[wp.lat, wp.lon]}
                        radius={isIntersectPoint ? 8 : 4}
                        pathOptions={{
                          color: isIntersectPoint ? '#EF4444' : trackColor,
                          fillColor: isIntersectPoint ? '#F87171' : trackColor,
                          fillOpacity: 0.9,
                          weight: isIntersectPoint ? 3 : 1,
                          pane: isIntersectPoint ? 'annotationPane' : 'vesselPane',
                        }}
                        eventHandlers={{
                          click: () => onSelectCandidate(vessel),
                        }}
                      >
                        {isIntersectPoint && (
                          <Tooltip permanent direction="top" className="tactical-tooltip" pane="labelPane">
                            <div className="px-2 py-1 rounded bg-[#180A0A]/95 border border-amber-400 text-amber-300 font-mono text-[10px] shadow-xl animate-pulse">
                              INTERSECT: {vessel.name} @ 12:35 UTC (0.38 nm)
                            </div>
                          </Tooltip>
                        )}
                      </CircleMarker>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </>
        )}

        {/* 7. Counterfactual Simulated Release Plume (Step 10 Counterfactual) */}
        {currentStepId === 'counterfactual' && (
          <CounterfactualMapLayer
            sarMetadata={sarMetadata}
            candidates={candidates}
            selectedCandidate={selectedCandidate}
            dynamicCounterfactual={dynamicCounterfactual}
            counterfactualTimelineStep={counterfactualTimelineStep}
            counterfactual={counterfactual}
          />
        )}
        {currentStepId === 'report' && (
          <Rectangle
            bounds={[
              [55.195, 5.860],
              [55.285, 5.902],
            ]}
            pathOptions={{
              color: '#10B981',
              weight: 2,
              dashArray: '4, 4',
              fillOpacity: 0.2,
              fillColor: '#059669',
              pane: 'plumePane',
            }}
          >
            <Tooltip permanent direction="right" className="tactical-tooltip" pane="labelPane">
              <div className="px-2 py-1 rounded bg-[#061810]/95 border border-emerald-400 text-emerald-300 font-mono text-[10px]">
                SIMULATED RELEASE PLUME // 91.4% DICE OVERLAP
              </div>
            </Tooltip>
          </Rectangle>
        )}

        {/* 8A. Interactive Forward Impact Forecast (Stage 11) */}
        {currentStepId === 'impact_prioritization' && (
          <ImpactForecastMapLayer
            counterfactual={counterfactual}
            impact={impact}
            forecastHours={forecastHours}
            layers={forecastLayers}
          />
        )}

        {/* 8B. Forward Dispersion Contours (Stage 12 Report - plumePane: 460) */}
        {currentStepId === 'report' && (
          <>
            {/* T+12h Projected Slick Plume */}
            <CircleMarker
              center={[
                counterfactual[0].forecastCentroidT12.lat,
                counterfactual[0].forecastCentroidT12.lon,
              ]}
              radius={16}
              pathOptions={{
                color: '#F59E0B',
                fillColor: '#F59E0B',
                fillOpacity: 0.15,
                weight: 1.5,
                dashArray: '3, 4',
                pane: 'plumePane',
              }}
            >
              <Tooltip direction="right" className="tactical-tooltip" pane="labelPane">
                <div className="px-1.5 py-0.5 rounded bg-[#181106]/95 border border-amber-400/40 text-amber-300 font-mono text-[9px]">
                  T + 12h SPREAD (7.2 km²)
                </div>
              </Tooltip>
            </CircleMarker>

            {/* T+48h Projected Baseline Beaching Envelope */}
            <CircleMarker
              center={[
                counterfactual[0].forecastCentroidT48.lat,
                counterfactual[0].forecastCentroidT48.lon,
              ]}
              radius={38}
              pathOptions={{
                color: '#DC2626',
                fillColor: '#DC2626',
                fillOpacity: 0.2,
                weight: 2,
                dashArray: '4, 4',
                pane: 'plumePane',
              }}
            >
              <Tooltip permanent direction="top" className="tactical-tooltip" pane="labelPane">
                <div className="px-2 py-1 rounded bg-[#1C0606]/95 border border-red-500/60 text-red-300 font-mono text-[10px]">
                  T + 48h BASELINE: 18.6 km² // 78% BEACHING RISK
                </div>
              </Tooltip>
            </CircleMarker>
          </>
        )}
      </MapContainer>

  );
};

export default SimulationMapInner;
