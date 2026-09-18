'use client';

import React from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { Plus, Minus, Maximize2, Ship, Waves, CloudRain, Target } from 'lucide-react';
import { SarMetadata, CandidateVessel, SourceReconstructionModel } from '@/types/simulation';

interface SimulationMapControlsProps {
  currentStepId: string;
  sarMetadata: SarMetadata;
  selectedCandidate: CandidateVessel | null;
  sourceRecon?: SourceReconstructionModel;
  dynamicCounterfactual?: any;
}

export const SimulationMapControls: React.FC<SimulationMapControlsProps> = ({
  currentStepId,
  sarMetadata,
  selectedCandidate,
  sourceRecon,
  dynamicCounterfactual,
}) => {
  const map = useMap();

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    map.zoomIn();
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    map.zoomOut();
  };

  const handleFitEvidence = (e: React.MouseEvent) => {
    e.stopPropagation();
    const points: [number, number][] = [];

    // Stage 07: Hindcast
    if (currentStepId === 'source_reconstruction') {
      if (sarMetadata?.slickBbox) {
        points.push([sarMetadata.slickBbox.minLat, sarMetadata.slickBbox.minLon]);
        points.push([sarMetadata.slickBbox.maxLat, sarMetadata.slickBbox.maxLon]);
      }
      if (sourceRecon?.originCentroid) {
        points.push([sourceRecon.originCentroid.lat, sourceRecon.originCentroid.lon]);
      }
      sourceRecon?.ensembleTrajectories?.forEach((ens) => {
        ens.waypoints?.forEach((w) => points.push([w.lat, w.lon]));
      });
      if (points.length > 0) {
        map.fitBounds(L.latLngBounds(points), { padding: [55, 55], maxZoom: 13, animate: true, duration: 0.8 });
        return;
      }
    }

    // Stage 08: AIS Correlation
    if (currentStepId === 'ais_correlation') {
      points.push([55.13, 5.70], [55.24, 5.96]);
      const waypoints = selectedCandidate?.trackWaypoints || [];
      waypoints.forEach((w: any) => {
        if (w.lat && w.lon) points.push([w.lat, w.lon]);
      });
      if (points.length > 0) {
        map.fitBounds(L.latLngBounds(points), { padding: [50, 50], maxZoom: 12, animate: true, duration: 0.8 });
        return;
      }
    }

    // Stage 11: Impact Forecast
    if (currentStepId === 'impact_prioritization') {
      points.push(
        [sarMetadata?.slickBbox?.centerLat ?? 55.2443, sarMetadata?.slickBbox?.centerLon ?? 5.8856],
        [54.20, 7.00],
        [54.85, 6.70],
        [55.30, 5.80]
      );
      map.fitBounds(L.latLngBounds(points), { padding: [50, 50], maxZoom: 10, animate: true, duration: 0.8 });
      return;
    }

    // Observed slick bounds
    if (sarMetadata?.slickBbox) {
      points.push([sarMetadata.slickBbox.minLat, sarMetadata.slickBbox.minLon]);
      points.push([sarMetadata.slickBbox.maxLat, sarMetadata.slickBbox.maxLon]);
    } else {
      points.push([55.215, 5.845], [55.275, 5.925]);
    }

    // Candidate vessel track
    const waypoints =
      selectedCandidate?.trackWaypoints ||
      dynamicCounterfactual?.vessel_track ||
      [];
    waypoints.forEach((w: any) => {
      if (w.lat && w.lon) points.push([w.lat, w.lon]);
    });

    // Simulated plume centroid & particles
    const simCentroid = dynamicCounterfactual?.simulation?.plume_centroid;
    if (simCentroid?.lat && simCentroid?.lon) {
      points.push([simCentroid.lat, simCentroid.lon]);
    }

    const particles = dynamicCounterfactual?.simulation?.particles || [];
    if (particles.length > 0) {
      points.push([particles[0].lat, particles[0].lon]);
      points.push([particles[particles.length - 1].lat, particles[particles.length - 1].lon]);
    }

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13, animate: true, duration: 0.8 });
    }
  };

  const handleFitSource = (e: React.MouseEvent) => {
    e.stopPropagation();
    const lat = sourceRecon?.originCentroid?.lat ?? 55.1884;
    const lon = sourceRecon?.originCentroid?.lon ?? 5.8122;
    map.flyTo([lat, lon], 12, { duration: 0.8 });
  };

  const handleFitVessel = (e: React.MouseEvent) => {
    e.stopPropagation();
    const waypoints =
      selectedCandidate?.trackWaypoints ||
      dynamicCounterfactual?.vessel_track ||
      [];
    const points: [number, number][] = waypoints
      .filter((w: any) => w.lat && w.lon)
      .map((w: any) => [w.lat, w.lon]);

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 13, animate: true, duration: 0.8 });
    }
  };

  const handleFitSlick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (sarMetadata?.slickBbox) {
      const bounds = L.latLngBounds([
        [sarMetadata.slickBbox.minLat, sarMetadata.slickBbox.minLon],
        [sarMetadata.slickBbox.maxLat, sarMetadata.slickBbox.maxLon],
      ]);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14, animate: true, duration: 0.8 });
    }
  };

  const handleFitPlume = (e: React.MouseEvent) => {
    e.stopPropagation();
    const simCentroid = dynamicCounterfactual?.simulation?.plume_centroid;
    const particles = dynamicCounterfactual?.simulation?.particles || [];

    const points: [number, number][] = [];
    if (simCentroid?.lat && simCentroid?.lon) {
      points.push([simCentroid.lat, simCentroid.lon]);
    }
    particles.forEach((p: any) => {
      if (p.lat && p.lon) points.push([p.lat, p.lon]);
    });

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14, animate: true, duration: 0.8 });
    } else if (simCentroid?.lat && simCentroid?.lon) {
      map.flyTo([simCentroid.lat, simCentroid.lon], 12, { duration: 0.8 });
    }
  };

  return (
    <div className="leaflet-top leaflet-right" style={{ pointerEvents: 'auto', zIndex: 1000, margin: '14px' }}>
      <div className="flex flex-col gap-1 p-1 rounded bg-surface/95 border border-border shadow-md backdrop-blur-md text-foreground font-mono text-[10px]">
        {/* Zoom In / Out */}
        <div className="flex flex-col border-b border-border/60 pb-1">
          <button
            type="button"
            onClick={handleZoomIn}
            title="Zoom in"
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-muted/80 text-foreground transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            title="Zoom out"
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-muted/80 text-foreground transition-colors cursor-pointer"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Framing actions */}
        <button
          type="button"
          onClick={handleFitEvidence}
          title="Fit all evidence for active stage"
          className="px-2 py-1 flex items-center gap-1 rounded hover:bg-muted/80 text-foreground transition-colors cursor-pointer"
        >
          <Maximize2 className="w-3 h-3 text-sky-600 dark:text-sky-400" />
          <span className="font-semibold text-[9px] uppercase tracking-wider">FIT EVIDENCE</span>
        </button>

        {(currentStepId === 'source_reconstruction' || currentStepId === 'ais_correlation') && (
          <button
            type="button"
            onClick={handleFitSource}
            title="Fit reconstructed source corridor"
            className="px-2 py-1 flex items-center gap-1 rounded hover:bg-muted/80 text-foreground transition-colors cursor-pointer"
          >
            <Target className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            <span className="text-[9px] uppercase tracking-wider">FIT SOURCE</span>
          </button>
        )}

        {(currentStepId === 'counterfactual' || currentStepId === 'ais_correlation' || currentStepId === 'attribution') && (
          <button
            type="button"
            onClick={handleFitVessel}
            title="Fit candidate vessel track"
            className="px-2 py-1 flex items-center gap-1 rounded hover:bg-muted/80 text-foreground transition-colors cursor-pointer"
          >
            <Ship className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            <span className="text-[9px] uppercase tracking-wider">FIT VESSEL</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleFitSlick}
          title="Fit observed SAR slick"
          className="px-2 py-1 flex items-center gap-1 rounded hover:bg-muted/80 text-foreground transition-colors cursor-pointer"
        >
          <Waves className="w-3 h-3 text-purple-600 dark:text-purple-400" />
          <span className="text-[9px] uppercase tracking-wider">FIT SLICK</span>
        </button>

        {currentStepId === 'counterfactual' && (
          <button
            type="button"
            onClick={handleFitPlume}
            title="Fit simulated plume"
            className="px-2 py-1 flex items-center gap-1 rounded hover:bg-muted/80 text-foreground transition-colors cursor-pointer"
          >
            <CloudRain className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span className="text-[9px] uppercase tracking-wider">FIT PLUME</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default SimulationMapControls;
