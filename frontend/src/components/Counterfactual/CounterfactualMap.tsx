'use client';

import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { motion, AnimatePresence } from 'motion/react';
import {
  Layers,
  Sliders,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  Compass,
  MoveHorizontal,
  Info,
  ZoomIn,
  ZoomOut,
  Crosshair,
  Navigation,
  Wind,
  Waves,
  Ship,
  Sparkles,
  GitCompare,
} from 'lucide-react';
import {
  CounterfactualCase,
  CandidateVesselRecord,
  CounterfactualSimulationFrame,
  CounterfactualExecutionResult,
  ExperimentState,
  ExperimentPhase,
  LayerVisibilityMode,
} from '@/types/counterfactualWorkstation';
import { CounterfactualProcessPanel } from './CounterfactualProcessPanel';

export interface CounterfactualMapRef {
  zoomIn: () => void;
  zoomOut: () => void;
  fitEvidence: () => void;
  fitVessel: () => void;
  fitCorridor: () => void;
  fitPlume: () => void;
  fitAll: () => void;
  triggerWipeSweep: () => void;
}

interface CounterfactualMapProps {
  currentCase: CounterfactualCase;
  selectedCandidate: CandidateVesselRecord | null;
  activeFrame: CounterfactualSimulationFrame | null;
  executionResult: CounterfactualExecutionResult | null;
  theme: 'light' | 'dark';
  compareMode: 'wipe' | 'opacity';
  onChangeCompareMode: (mode: 'wipe' | 'opacity') => void;
  wipePosition: number; // 0 to 100
  onChangeWipePosition: (pos: number) => void;
  layerOpacity: number; // 0.0 to 1.0
  onChangeLayerOpacity: (opacity: number) => void;
  experimentState: ExperimentState;
  currentPhase: ExperimentPhase;
  layerVisibilityMode: LayerVisibilityMode;
  onChangeLayerVisibilityMode: (mode: LayerVisibilityMode) => void;
}

// Local MapLibre web worker
if (typeof window !== 'undefined') {
  try {
    (maplibregl as unknown as { setWorkerUrl: (url: string) => void }).setWorkerUrl('/maplibre/maplibre-gl-worker.mjs');
  } catch {
    // Graceful fallback
  }
}

const LIGHT_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'esri-light': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution: '&copy; Esri &mdash; Light Gray Canvas',
    },
  },
  layers: [
    {
      id: 'esri-light-layer',
      type: 'raster',
      source: 'esri-light',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

const DARK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'esri-dark': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution: '&copy; Esri &mdash; Dark Gray Canvas',
    },
  },
  layers: [
    {
      id: 'esri-dark-layer',
      type: 'raster',
      source: 'esri-dark',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

const PHASE_LABELS: Record<ExperimentPhase, { title: string; subtitle: string }> = {
  1: {
    title: 'PHASE 1: HYPOTHESIS LOCKED',
    subtitle: 'Candidate vessel AIS trajectory and feasible spatio-temporal boundary identified',
  },
  2: {
    title: 'PHASE 2: RELEASE HYPOTHESIS',
    subtitle: 'Hypothetical discharge point positioned on candidate corridor at T0 epoch',
  },
  3: {
    title: 'PHASE 3: INITIALIZING 120 PARTICLES',
    subtitle: '120 discrete Lagrangian parcels seeded along vessel discharge segment',
  },
  4: {
    title: 'PHASE 4: APPLYING ENVIRONMENTAL FORCING',
    subtitle: 'Metocean boundary fields loaded: 10m windage, surface ocean current, horizontal diffusion',
  },
  5: {
    title: 'PHASE 5: FORWARD LAGRANGIAN ADVECTION',
    subtitle: 'Numerical RK4 particle transport advancing across hourly integration time steps',
  },
  6: {
    title: 'PHASE 6: PREDICTED PLUME',
    subtitle: 'Continuous Gaussian kernel density plume footprint reconstructed from parcel ensemble',
  },
  7: {
    title: 'PHASE 7: COMPARING AGAINST OBSERVED SAR',
    subtitle: 'Spatial intersection, IoU overlap, centroid offset, and orientation deviation calculated',
  },
  8: {
    title: 'PHASE 8: SCIENTIFIC VERDICT',
    subtitle: 'Empirical hypothesis assessment evaluated against falsification criteria',
  },
};

export const CounterfactualMap = forwardRef<CounterfactualMapRef, CounterfactualMapProps>(
  (
    {
      currentCase,
      selectedCandidate,
      activeFrame,
      executionResult,
      theme,
      compareMode,
      onChangeCompareMode,
      wipePosition,
      onChangeWipePosition,
      layerOpacity,
      onChangeLayerOpacity,
      experimentState,
      currentPhase,
      layerVisibilityMode,
      onChangeLayerVisibilityMode,
    },
    ref
  ) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [isDraggingWipe, setIsDraggingWipe] = useState(false);
    const wipeContainerRef = useRef<HTMLDivElement>(null);

    // Fine-grained layer visibility states
    const [visibleLayers, setVisibleLayers] = useState({
      sarFootprint: true,
      observedSlick: true,
      aisTrack: true,
      feasibleCorridor: true,
      simulatedParticles: true,
      predictedFootprint: true,
      uncertaintyEnvelope: true,
      releaseMarker: true,
    });

    const toggleLayer = (key: keyof typeof visibleLayers) => {
      setVisibleLayers((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    // Camera action implementations
    const zoomIn = useCallback(() => {
      mapRef.current?.zoomIn({ duration: 300 });
    }, []);

    const zoomOut = useCallback(() => {
      mapRef.current?.zoomOut({ duration: 300 });
    }, []);

    const fitEvidence = useCallback(() => {
      const map = mapRef.current;
      if (!map) return;
      const slickCoords = currentCase.sar_observation.observed_slick.slick_polygon;
      const footprintCoords =
        activeFrame?.footprint_polygon || executionResult?.predicted_footprint?.polygon || [];

      const allCoords = [...slickCoords, ...footprintCoords];
      if (allCoords.length === 0) return;

      const bounds = allCoords.reduce(
        (acc, coord) => acc.extend(coord as [number, number]),
        new maplibregl.LngLatBounds(allCoords[0] as [number, number], allCoords[0] as [number, number])
      );
      map.fitBounds(bounds, { padding: 90, maxZoom: 13.5, duration: 1000 });
    }, [currentCase, activeFrame, executionResult]);

    const fitVessel = useCallback(() => {
      const map = mapRef.current;
      if (!map || !selectedCandidate || selectedCandidate.track.length === 0) return;
      const coords = selectedCandidate.track.map((pt) => [pt.lon, pt.lat] as [number, number]);
      const bounds = coords.reduce(
        (acc, coord) => acc.extend(coord),
        new maplibregl.LngLatBounds(coords[0], coords[0])
      );
      map.fitBounds(bounds, { padding: 90, maxZoom: 14, duration: 1000 });
    }, [selectedCandidate]);

    const fitCorridor = useCallback(() => {
      const map = mapRef.current;
      if (!map) return;
      const coords = currentCase.source_corridor.feasible_segment as [number, number][];
      if (coords.length === 0) return;
      const bounds = coords.reduce(
        (acc, coord) => acc.extend(coord),
        new maplibregl.LngLatBounds(coords[0], coords[0])
      );
      map.fitBounds(bounds, { padding: 120, maxZoom: 14, duration: 1000 });
    }, [currentCase]);

    const fitPlume = useCallback(() => {
      const map = mapRef.current;
      if (!map) return;
      const footprintCoords =
        activeFrame?.footprint_polygon || executionResult?.predicted_footprint?.polygon || [];
      if (footprintCoords.length === 0) return;
      const bounds = footprintCoords.reduce(
        (acc, coord) => acc.extend(coord as [number, number]),
        new maplibregl.LngLatBounds(footprintCoords[0] as [number, number], footprintCoords[0] as [number, number])
      );
      map.fitBounds(bounds, { padding: 90, maxZoom: 13.5, duration: 1000 });
    }, [activeFrame, executionResult]);

    const fitAll = useCallback(() => {
      const map = mapRef.current;
      if (!map) return;
      const slickCoords = currentCase.sar_observation.observed_slick.slick_polygon;
      const corridorCoords = currentCase.source_corridor.feasible_segment;
      const vesselCoords = (selectedCandidate?.track || []).map((pt) => [pt.lon, pt.lat]);
      const plumeCoords =
        activeFrame?.footprint_polygon || executionResult?.predicted_footprint?.polygon || [];

      const combined = [...slickCoords, ...corridorCoords, ...vesselCoords, ...plumeCoords];
      if (combined.length === 0) return;

      const bounds = combined.reduce(
        (acc, coord) => acc.extend(coord as [number, number]),
        new maplibregl.LngLatBounds(combined[0] as [number, number], combined[0] as [number, number])
      );
      map.fitBounds(bounds, { padding: 80, maxZoom: 12.5, duration: 1000 });
    }, [currentCase, selectedCandidate, activeFrame, executionResult]);

    // Automated Compare-Wipe Sweep Animation
    const triggerWipeSweep = useCallback(() => {
      onChangeCompareMode('wipe');
      let start: number | null = null;
      const duration = 2400; // 2.4 seconds sweep
      const animateWipe = (timestamp: number) => {
        if (!start) start = timestamp;
        const progress = (timestamp - start) / duration;
        if (progress < 1) {
          // Sweep: 50 -> 95 -> 5 -> 50
          const phase = progress * Math.PI * 2;
          const pos = Math.round(50 + 45 * Math.sin(phase));
          onChangeWipePosition(Math.max(5, Math.min(95, pos)));
          requestAnimationFrame(animateWipe);
        } else {
          onChangeWipePosition(50);
        }
      };
      requestAnimationFrame(animateWipe);
    }, [onChangeCompareMode, onChangeWipePosition]);

    // Expose methods to parent
    useImperativeHandle(
      ref,
      () => ({
        zoomIn,
        zoomOut,
        fitEvidence,
        fitVessel,
        fitCorridor,
        fitPlume,
        fitAll,
        triggerWipeSweep,
      }),
      [zoomIn, zoomOut, fitEvidence, fitVessel, fitCorridor, fitPlume, fitAll, triggerWipeSweep]
    );

    // Initialize MapLibre
    useEffect(() => {
      if (!mapContainerRef.current) return;

      const initialCenter = currentCase.center || [7.320, 54.180];
      const initialZoom = currentCase.default_zoom || 11.0;

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: theme === 'light' ? LIGHT_STYLE : DARK_STYLE,
        center: initialCenter,
        zoom: initialZoom,
        attributionControl: false,
      });

      map.addControl(new maplibregl.ScaleControl({ unit: 'nautical' }), 'bottom-left');

      map.on('load', () => {
        setMapLoaded(true);
      });

      mapRef.current = map;

      return () => {
        map.remove();
        mapRef.current = null;
      };
    }, []);

    // Theme update
    useEffect(() => {
      if (!mapRef.current) return;
      mapRef.current.setStyle(theme === 'light' ? LIGHT_STYLE : DARK_STYLE);
    }, [theme]);

    // Fly to center on case change
    useEffect(() => {
      if (!mapRef.current || !currentCase) return;
      mapRef.current.flyTo({
        center: currentCase.center,
        zoom: currentCase.default_zoom,
        speed: 1.2,
        curve: 1.4,
      });
    }, [currentCase.case_id]);

    // Trigger auto-fit when experiment starts
    useEffect(() => {
      if (experimentState === 'RUNNING' && currentPhase === 1) {
        fitAll();
      }
    }, [experimentState, currentPhase, fitAll]);

    // Trigger wipe sweep during Phase 7
    useEffect(() => {
      if (currentPhase === 7) {
        triggerWipeSweep();
      }
    }, [currentPhase, triggerWipeSweep]);

    // Sync GeoJSON Data and Layers in strict layer hierarchy:
    // Basemap -> SAR footprint -> source corridor -> vessel track -> release point -> particles -> predicted plume -> comparison highlight
    const syncMapLayers = useCallback(() => {
      const map = mapRef.current;
      if (!map || !map.isStyleLoaded()) return;

      const setSourceData = (id: string, data: any) => {
        const src = map.getSource(id) as maplibregl.GeoJSONSource | undefined;
        if (src) {
          src.setData(data);
        } else {
          map.addSource(id, { type: 'geojson', data });
        }
      };

      // 1. SAR Observation Footprint Layer
      const sarFootprintGeoJSON = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [currentCase.sar_observation.sar_footprint_polygon],
        },
        properties: {
          productId: currentCase.sar_observation.product_id,
        },
      };
      setSourceData('sar-footprint-source', sarFootprintGeoJSON);

      if (!map.getLayer('sar-footprint-fill')) {
        map.addLayer({
          id: 'sar-footprint-fill',
          type: 'fill',
          source: 'sar-footprint-source',
          paint: {
            'fill-color': theme === 'light' ? '#334155' : '#1E293B',
            'fill-opacity': 0.04,
          },
        });
      }

      if (!map.getLayer('sar-footprint-line')) {
        map.addLayer({
          id: 'sar-footprint-line',
          type: 'line',
          source: 'sar-footprint-source',
          paint: {
            'line-color': theme === 'light' ? '#64748B' : '#475569',
            'line-width': 1.5,
            'line-dasharray': [4, 4],
            'line-opacity': 0.7,
          },
        });
      }

      // 2. Observed Slick Layer (Rose/Burgundy)
      const observedSlickGeoJSON = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [currentCase.sar_observation.observed_slick.slick_polygon],
        },
        properties: {
          areaKm2: currentCase.sar_observation.observed_slick.area_km2,
        },
      };
      setSourceData('observed-slick-source', observedSlickGeoJSON);

      if (!map.getLayer('observed-slick-fill')) {
        map.addLayer({
          id: 'observed-slick-fill',
          type: 'fill',
          source: 'observed-slick-source',
          paint: {
            'fill-color': theme === 'light' ? '#BE123C' : '#9F1239',
            'fill-opacity': 0.35,
          },
        });
      }

      if (!map.getLayer('observed-slick-line')) {
        map.addLayer({
          id: 'observed-slick-line',
          type: 'line',
          source: 'observed-slick-source',
          paint: {
            'line-color': '#E11D48',
            'line-width': 2.2,
            'line-opacity': 0.95,
          },
        });
      }

      // 3. Source Corridor / Feasible Release Segment
      const feasibleSegmentGeoJSON = {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: currentCase.source_corridor.feasible_segment,
        },
        properties: {
          description: currentCase.source_corridor.segment_description,
        },
      };
      setSourceData('feasible-segment-source', feasibleSegmentGeoJSON);

      if (!map.getLayer('feasible-segment-line')) {
        map.addLayer({
          id: 'feasible-segment-line',
          type: 'line',
          source: 'feasible-segment-source',
          paint: {
            'line-color': '#D97706', // Amber-600
            'line-width': 4.0,
            'line-opacity': 0.85,
          },
        });
      }

      // 4. Candidate AIS Track & Vessel Point
      if (selectedCandidate && selectedCandidate.track.length > 0) {
        const trackCoords = selectedCandidate.track.map((pt) => [pt.lon, pt.lat]);
        const aisTrackGeoJSON = {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: trackCoords,
          },
          properties: {
            name: selectedCandidate.name,
            mmsi: selectedCandidate.mmsi,
          },
        };
        setSourceData('ais-track-source', aisTrackGeoJSON);

        if (!map.getLayer('ais-track-line')) {
          map.addLayer({
            id: 'ais-track-line',
            type: 'line',
            source: 'ais-track-source',
            paint: {
              'line-color': selectedCandidate.is_decoy ? '#F59E0B' : '#0284C7',
              'line-width': 2.2,
              'line-dasharray': [3, 2],
              'line-opacity': 0.85,
            },
          });
        }

        // Track Waypoints
        const trackPointsGeoJSON = {
          type: 'FeatureCollection',
          features: selectedCandidate.track.map((pt, i) => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [pt.lon, pt.lat] },
            properties: { index: i, timestamp: pt.timestamp },
          })),
        };
        setSourceData('ais-waypoints-source', trackPointsGeoJSON);

        if (!map.getLayer('ais-waypoints-circle')) {
          map.addLayer({
            id: 'ais-waypoints-circle',
            type: 'circle',
            source: 'ais-waypoints-source',
            paint: {
              'circle-radius': 3.5,
              'circle-color': selectedCandidate.is_decoy ? '#F59E0B' : '#0284C7',
              'circle-stroke-width': 1.2,
              'circle-stroke-color': '#FFFFFF',
            },
          });
        }
      }

      // 5. Hypothetical Release Marker (T0 Point)
      const releasePoint = selectedCandidate?.feasible_release_point || {
        lat: currentCase.source_corridor.feasible_segment[0]?.[1] || 54.150,
        lon: currentCase.source_corridor.feasible_segment[0]?.[0] || 7.280,
      };

      const releaseMarkerGeoJSON = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [releasePoint.lon, releasePoint.lat] },
            properties: { label: 'T0 Release' },
          },
        ],
      };
      setSourceData('release-marker-source', releaseMarkerGeoJSON);

      if (!map.getLayer('release-marker-pulse')) {
        map.addLayer({
          id: 'release-marker-pulse',
          type: 'circle',
          source: 'release-marker-source',
          paint: {
            'circle-radius': 14.0,
            'circle-color': '#F59E0B',
            'circle-opacity': 0.25,
            'circle-stroke-width': 1.0,
            'circle-stroke-color': '#F59E0B',
          },
        });
      }

      if (!map.getLayer('release-marker-circle')) {
        map.addLayer({
          id: 'release-marker-circle',
          type: 'circle',
          source: 'release-marker-source',
          paint: {
            'circle-radius': 5.5,
            'circle-color': '#D97706',
            'circle-stroke-width': 2.0,
            'circle-stroke-color': '#FFFFFF',
          },
        });
      }

      // 6. Lagrangian Particles
      const particles = activeFrame?.particles || executionResult?.simulation?.particles || [];
      const particlesGeoJSON = {
        type: 'FeatureCollection',
        features: particles.map((p) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
          properties: { id: p.id },
        })),
      };
      setSourceData('particles-source', particlesGeoJSON);

      if (!map.getLayer('particles-circle')) {
        map.addLayer({
          id: 'particles-circle',
          type: 'circle',
          source: 'particles-source',
          paint: {
            'circle-radius': 2.5,
            'circle-color': '#38BDF8',
            'circle-opacity': 0.9,
            'circle-stroke-width': 0.6,
            'circle-stroke-color': '#0369A1',
          },
        });
      }

      // 7. Predicted Counterfactual Plume Footprint
      const frameFootprint = activeFrame?.footprint_polygon || executionResult?.predicted_footprint?.polygon || [];
      const footprintGeoJSON = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: frameFootprint.length > 2 ? [frameFootprint] : [],
        },
        properties: {},
      };
      setSourceData('predicted-footprint-source', footprintGeoJSON);

      if (!map.getLayer('predicted-footprint-fill')) {
        map.addLayer({
          id: 'predicted-footprint-fill',
          type: 'fill',
          source: 'predicted-footprint-source',
          paint: {
            'fill-color': '#0284C7',
            'fill-opacity': 0.3,
          },
        });
      }

      if (!map.getLayer('predicted-footprint-line')) {
        map.addLayer({
          id: 'predicted-footprint-line',
          type: 'line',
          source: 'predicted-footprint-source',
          paint: {
            'line-color': '#0EA5E9',
            'line-width': 2.2,
            'line-opacity': 0.95,
          },
        });
      }

      // 8. Uncertainty Envelope (P95)
      const p95Envelope = executionResult?.uncertainty?.p95_envelope || [];
      const uncertaintyGeoJSON = {
        type: 'FeatureCollection',
        features:
          p95Envelope.length > 2
            ? [
                {
                  type: 'Feature',
                  geometry: { type: 'Polygon', coordinates: [p95Envelope] },
                  properties: { type: 'p95' },
                },
              ]
            : [],
      };
      setSourceData('uncertainty-source', uncertaintyGeoJSON);

      if (!map.getLayer('uncertainty-fill')) {
        map.addLayer({
          id: 'uncertainty-fill',
          type: 'fill',
          source: 'uncertainty-source',
          paint: {
            'fill-color': '#06B6D4',
            'fill-opacity': 0.1,
          },
        });
      }

      if (!map.getLayer('uncertainty-line')) {
        map.addLayer({
          id: 'uncertainty-line',
          type: 'line',
          source: 'uncertainty-source',
          paint: {
            'line-color': '#0891B2',
            'line-width': 1.2,
            'line-dasharray': [2, 2],
            'line-opacity': 0.6,
          },
        });
      }

      // Layer Visibility Filter based on LayerVisibilityMode (OBSERVED / SIMULATED / BOTH)
      const showObserved = layerVisibilityMode === 'OBSERVED' || layerVisibilityMode === 'BOTH';
      const showSimulated = layerVisibilityMode === 'SIMULATED' || layerVisibilityMode === 'BOTH';

      const setVis = (layerId: string, visible: boolean) => {
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
        }
      };

      setVis('sar-footprint-fill', visibleLayers.sarFootprint && showObserved);
      setVis('sar-footprint-line', visibleLayers.sarFootprint && showObserved);
      setVis('observed-slick-fill', visibleLayers.observedSlick && showObserved);
      setVis('observed-slick-line', visibleLayers.observedSlick && showObserved);

      setVis('feasible-segment-line', visibleLayers.feasibleCorridor);
      setVis('ais-track-line', visibleLayers.aisTrack);
      setVis('ais-waypoints-circle', visibleLayers.aisTrack);
      setVis('release-marker-pulse', visibleLayers.releaseMarker && showSimulated);
      setVis('release-marker-circle', visibleLayers.releaseMarker && showSimulated);

      setVis('particles-circle', visibleLayers.simulatedParticles && showSimulated);
      setVis('predicted-footprint-fill', visibleLayers.predictedFootprint && showSimulated);
      setVis('predicted-footprint-line', visibleLayers.predictedFootprint && showSimulated);
      setVis('uncertainty-fill', visibleLayers.uncertaintyEnvelope && showSimulated);
      setVis('uncertainty-line', visibleLayers.uncertaintyEnvelope && showSimulated);

      // Opacity adjustments
      if (compareMode === 'opacity') {
        if (map.getLayer('predicted-footprint-fill')) {
          map.setPaintProperty('predicted-footprint-fill', 'fill-opacity', 0.3 * layerOpacity);
        }
        if (map.getLayer('particles-circle')) {
          map.setPaintProperty('particles-circle', 'circle-opacity', 0.9 * layerOpacity);
        }
      }
    }, [
      currentCase,
      selectedCandidate,
      activeFrame,
      executionResult,
      theme,
      visibleLayers,
      layerVisibilityMode,
      compareMode,
      layerOpacity,
    ]);

    useEffect(() => {
      if (mapLoaded) {
        syncMapLayers();
      }
    }, [mapLoaded, syncMapLayers]);

    // Handle Wipe Dragging
    const handleWipeMouseDown = (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDraggingWipe(true);
    };

    const handleMouseMove = useCallback(
      (e: MouseEvent) => {
        if (!isDraggingWipe || !wipeContainerRef.current) return;
        const rect = wipeContainerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
        onChangeWipePosition(Math.round(pct));
      },
      [isDraggingWipe, onChangeWipePosition]
    );

    const handleMouseUp = useCallback(() => {
      setIsDraggingWipe(false);
    }, []);

    useEffect(() => {
      if (isDraggingWipe) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
      }
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }, [isDraggingWipe, handleMouseMove, handleMouseUp]);

    const activePhaseInfo = PHASE_LABELS[currentPhase] || PHASE_LABELS[1];

    return (
      <div ref={wipeContainerRef} className="relative w-full h-full overflow-hidden select-none bg-slate-900">
        {/* MapLibre Canvas Container */}
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Compare Wipe Divider & Mask */}
        {compareMode === 'wipe' && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              clipPath: `polygon(0 0, ${wipePosition}% 0, ${wipePosition}% 100%, 0 100%)`,
            }}
          >
            {/* Visual indicator of Observed side */}
            <div className="absolute top-4 left-4 bg-rose-950/85 border border-rose-500/50 text-rose-200 text-[10px] font-mono font-bold px-2.5 py-1 rounded shadow backdrop-blur-sm flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>OBSERVED SAR EVIDENCE</span>
            </div>
          </div>
        )}

        {/* Wipe Split Divider Bar */}
        {compareMode === 'wipe' && (
          <div
            style={{ left: `${wipePosition}%` }}
            className="absolute top-0 bottom-0 w-1 -ml-0.5 bg-cyan-400 z-10 cursor-ew-resize flex items-center justify-center pointer-events-auto shadow-[0_0_12px_rgba(6,182,212,0.8)]"
            onMouseDown={handleWipeMouseDown}
          >
            <div className="w-7 h-7 rounded-full bg-cyan-500 border-2 border-white shadow-lg flex items-center justify-center text-white cursor-ew-resize hover:scale-110 active:scale-95 transition-transform">
              <MoveHorizontal className="w-3.5 h-3.5" />
            </div>
            <div className="absolute top-3 -translate-x-1/2 whitespace-nowrap bg-black/90 border border-cyan-400/50 text-cyan-300 font-mono text-[9px] font-bold px-2 py-0.5 rounded shadow pointer-events-none">
              ◀ OBSERVED {wipePosition}% | {100 - wipePosition}% PREDICTED ▶
            </div>
          </div>
        )}

        {/* FLOATING UI OVERLAY (pointer-events-none container) */}
        <div className="absolute inset-0 pointer-events-none p-3 flex flex-col justify-between">
          {/* Top Bar: Phase Banner Overlay (Center) & Camera Toolbar (Right) */}
          <div className="flex items-start justify-between w-full">
            {/* Top-Left: Mode & Layer View Controls */}
            <div className="flex flex-col gap-2 pointer-events-auto max-w-xs">
              {/* OBSERVED / SIMULATED / BOTH Layer View Controls */}
              <div
                className={`p-1 rounded-lg border backdrop-blur-sm shadow flex items-center gap-1 font-mono text-[10px] font-bold ${
                  theme === 'light'
                    ? 'bg-white/95 border-slate-300 text-slate-800'
                    : 'bg-[#0E1624]/95 border-slate-700 text-slate-200'
                }`}
              >
                <button
                  onClick={() => onChangeLayerVisibilityMode('OBSERVED')}
                  className={`px-2 py-1 rounded transition-colors ${
                    layerVisibilityMode === 'OBSERVED'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  OBSERVED
                </button>
                <button
                  onClick={() => onChangeLayerVisibilityMode('SIMULATED')}
                  className={`px-2 py-1 rounded transition-colors ${
                    layerVisibilityMode === 'SIMULATED'
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  SIMULATED
                </button>
                <button
                  onClick={() => onChangeLayerVisibilityMode('BOTH')}
                  className={`px-2 py-1 rounded transition-colors ${
                    layerVisibilityMode === 'BOTH'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  BOTH
                </button>
              </div>

              {/* Compare Mode (Wipe / Opacity) Selector */}
              <div
                className={`p-1.5 rounded-lg border backdrop-blur-sm shadow flex items-center gap-1.5 ${
                  theme === 'light'
                    ? 'bg-white/90 border-slate-300 text-slate-800'
                    : 'bg-[#0E1624]/90 border-slate-700 text-slate-200'
                }`}
              >
                <button
                  onClick={() => onChangeCompareMode('wipe')}
                  className={`flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded transition-colors ${
                    compareMode === 'wipe'
                      ? 'bg-cyan-600 text-white font-bold'
                      : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <MoveHorizontal className="w-3 h-3" />
                  <span>WIPE COMPARE</span>
                </button>

                <button
                  onClick={() => onChangeCompareMode('opacity')}
                  className={`flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded transition-colors ${
                    compareMode === 'opacity'
                      ? 'bg-cyan-600 text-white font-bold'
                      : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Sliders className="w-3 h-3" />
                  <span>OPACITY BLEND</span>
                </button>
              </div>

              {/* Opacity Slider */}
              {compareMode === 'opacity' && (
                <div
                  className={`p-2 rounded-lg border backdrop-blur-sm shadow space-y-1 ${
                    theme === 'light'
                      ? 'bg-white/90 border-slate-300 text-slate-800'
                      : 'bg-[#0E1624]/90 border-slate-700 text-slate-200'
                  }`}
                >
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-slate-500 dark:text-slate-400">Plume Opacity:</span>
                    <span className="font-bold text-cyan-500">{Math.round(layerOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={layerOpacity}
                    onChange={(e) => onChangeLayerOpacity(parseFloat(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer h-1.5"
                  />
                </div>
              )}
            </div>

            {/* Top-Center: Phase Banner Overlay during Experiment */}
            <div className="pointer-events-auto flex flex-col items-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentPhase}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.25 }}
                  className={`px-4 py-2 rounded-lg border shadow-lg backdrop-blur-md text-center font-mono max-w-md ${
                    theme === 'light'
                      ? 'bg-white/95 border-slate-300 text-slate-800'
                      : 'bg-[#0B121E]/95 border-cyan-500/40 text-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2 text-xs font-bold tracking-wider text-cyan-600 dark:text-cyan-400">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{activePhaseInfo.title}</span>
                  </div>
                  <div className="text-[10px] text-slate-600 dark:text-slate-400 font-sans mt-0.5">
                    {activePhaseInfo.subtitle}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Top-Right: Camera Toolbar */}
            <div className="flex flex-col gap-1 pointer-events-auto font-mono text-[10px]">
              <div
                className={`rounded-lg border backdrop-blur-sm shadow flex flex-col divide-y ${
                  theme === 'light'
                    ? 'bg-white/95 border-slate-300 divide-slate-200 text-slate-700'
                    : 'bg-[#0E1624]/95 border-slate-700 divide-slate-800 text-slate-200'
                }`}
              >
                <button
                  onClick={zoomIn}
                  title="Zoom In (+)"
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={zoomOut}
                  title="Zoom Out (-)"
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={fitEvidence}
                  title="Fit Evidence (Observed + Predicted)"
                  className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-left font-bold text-[9px]"
                >
                  FIT EVIDENCE
                </button>
                <button
                  onClick={fitVessel}
                  title="Fit Candidate Vessel Track"
                  className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-left font-bold text-[9px]"
                >
                  FIT VESSEL
                </button>
                <button
                  onClick={fitCorridor}
                  title="Fit Feasible Source Corridor"
                  className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-left font-bold text-[9px]"
                >
                  FIT CORRIDOR
                </button>
                <button
                  onClick={fitPlume}
                  title="Fit Predicted Plume Footprint"
                  className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-left font-bold text-[9px]"
                >
                  FIT PLUME
                </button>
                <button
                  onClick={fitAll}
                  title="Fit Complete Incident Geometry"
                  className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-left font-bold text-[9px] text-cyan-600 dark:text-cyan-400"
                >
                  FIT ALL
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Area: Docked Process Panel (Bottom-Left) & Metocean Vectors (Bottom-Right) */}
          <div className="flex items-end justify-between w-full">
            {/* Docked Left: Process Panel */}
            <div className="pointer-events-auto w-[280px]">
              <CounterfactualProcessPanel
                currentPhase={currentPhase}
                experimentState={experimentState}
                theme={theme}
              />
            </div>

            {/* Docked Right: Metocean Environmental Forcing HUD */}
            <div className="pointer-events-auto">
              <div
                className={`p-2.5 rounded-lg border backdrop-blur-md shadow text-[10px] font-mono max-w-sm space-y-1.5 ${
                  theme === 'light'
                    ? 'bg-white/95 border-slate-300 text-slate-800'
                    : 'bg-[#0B121E]/95 border-slate-700/80 text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between font-bold uppercase pb-1 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-cyan-500" />
                    <span>Environmental Forcing HUD</span>
                  </div>
                  <span className="text-[9px] text-cyan-600 dark:text-cyan-400">
                    {currentCase.environmental_forcing.source}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-0.5 text-[9px]">
                  {/* Wind Vector */}
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center shrink-0"
                      style={{
                        transform: `rotate(${currentCase.environmental_forcing.wind.direction_deg}deg)`,
                      }}
                    >
                      <Navigation className="w-3 h-3 text-cyan-500" />
                    </div>
                    <div>
                      <div className="text-slate-500 dark:text-slate-400 font-bold">10m Wind (ERA5)</div>
                      <div className="font-mono font-bold">
                        {currentCase.environmental_forcing.wind.speed_ms.toFixed(1)} m/s @{' '}
                        {currentCase.environmental_forcing.wind.direction_deg.toFixed(0)}°
                      </div>
                    </div>
                  </div>

                  {/* Ocean Current Vector */}
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center shrink-0"
                      style={{
                        transform: `rotate(${currentCase.environmental_forcing.current.direction_deg}deg)`,
                      }}
                    >
                      <Navigation className="w-3 h-3 text-emerald-500" />
                    </div>
                    <div>
                      <div className="text-slate-500 dark:text-slate-400 font-bold">Current (HYCOM)</div>
                      <div className="font-mono font-bold">
                        {currentCase.environmental_forcing.current.velocity_ms.toFixed(2)} m/s @{' '}
                        {currentCase.environmental_forcing.current.direction_deg.toFixed(0)}°
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[9px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-800">
                  <span>Horizontal Diffusion: Kh = 2.5 m²/s</span>
                  <span>Leeway Factor: 3.0%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

CounterfactualMap.displayName = 'CounterfactualMap';
