'use client';

import React, { useEffect } from 'react';
import { Polygon, CircleMarker, Polyline, Tooltip, useMap } from 'react-leaflet';
import { CounterfactualScenario, ImpactPrioritization } from '@/types/simulation';
import {
  getForecastState,
  WADDEN_SEA_COASTLINE,
  ECOLOGICAL_RESERVE_NATURA2000,
  FISHERIES_ZONE_4B,
  COASTAL_HARBORS,
} from '@/data/case0004ImpactForecast';

interface ImpactForecastMapLayerProps {
  counterfactual: CounterfactualScenario[];
  impact: ImpactPrioritization;
  forecastHours: number;
  layers: {
    coastalExposure: boolean;
    ecological: boolean;
    fisheries: boolean;
    population: boolean;
  };
}

export const ImpactForecastMapLayer: React.FC<ImpactForecastMapLayerProps> = ({
  forecastHours,
  layers,
}) => {
  const map = useMap();

  // On mount: smooth camera transition centered between slick and Wadden Sea coastline
  useEffect(() => {
    map.flyTo([55.05, 6.45], 9, { duration: 1.5 });
  }, [map]);

  const plume = getForecastState(forecastHours);

  return (
    <>
      {/* 1. OBSERVED SLICK ORIGIN (Fixed anchor) */}
      <CircleMarker
        center={[55.2443, 5.8856]}
        radius={7}
        pathOptions={{
          color: '#A855F7',
          fillColor: '#C084FC',
          fillOpacity: 0.9,
          weight: 2,
        }}
      >
        <Tooltip permanent direction="top" className="tactical-tooltip">
          <div className="px-2 py-0.5 rounded bg-[#090714]/95 border border-purple-500/50 text-purple-300 font-mono text-[9px]">
            T0 OBSERVED SLICK // 4.41 KM²
          </div>
        </Tooltip>
      </CircleMarker>

      {/* Trajectory Guide Line (Drift axis from T0 to +48h) */}
      <Polyline
        positions={[
          [55.244, 5.885],
          [54.02, 6.95],
        ]}
        pathOptions={{
          color: '#F59E0B',
          weight: 1.5,
          dashArray: '4, 6',
          opacity: 0.45,
        }}
      />

      {/* 2. DYNAMIC FORECAST PLUME (Deterministic Lagrangian expanding geometry) */}
      <Polygon
        positions={plume.vertices}
        pathOptions={{
          color: plume.isShorelineCritical ? '#EF4444' : '#F59E0B',
          weight: plume.isShorelineCritical ? 2.5 : 2,
          fillColor: plume.isShorelineCritical ? '#DC2626' : '#EA580C',
          fillOpacity: plume.isShorelineCritical ? 0.35 : 0.22,
        }}
      >
        <Tooltip permanent direction="right" className="tactical-tooltip">
          <div
            className={`px-2 py-1 rounded font-mono text-[10px] shadow-xl border ${
              plume.isShorelineCritical
                ? 'bg-[#180808]/95 border-red-500 text-red-300'
                : 'bg-[#140C07]/95 border-amber-500/50 text-amber-300'
            }`}
          >
            <div className="font-bold">
              PLUME: T + {forecastHours.toFixed(0)}h ({plume.areaKm2.toFixed(1)} km²)
            </div>
            <div className="text-[9px] text-zinc-400">
              {plume.isShorelineCritical ? 'SHORELINE INTERACTION ZONE' : 'OFFSHORE DISPERSION'}
            </div>
          </div>
        </Tooltip>
      </Polygon>

      {/* Plume Leading Edge Particle Cluster */}
      <CircleMarker
        center={[plume.centerLat, plume.centerLon]}
        radius={plume.isShorelineCritical ? 9 : 6}
        pathOptions={{
          color: plume.isShorelineCritical ? '#EF4444' : '#F59E0B',
          fillColor: plume.isShorelineCritical ? '#F87171' : '#FCD34D',
          fillOpacity: 0.95,
          weight: 2,
        }}
      />

      {/* 3. COASTAL EXPOSURE LAYER: Wadden Sea Barrier Islands Band */}
      {layers.coastalExposure && (
        <Polygon
          positions={WADDEN_SEA_COASTLINE}
          pathOptions={{
            color: plume.isShorelineCritical ? '#EF4444' : '#EAB308',
            weight: plume.isShorelineCritical ? 2.5 : 1.5,
            dashArray: plume.isShorelineCritical ? undefined : '4, 4',
            fillColor: '#EAB308',
            fillOpacity: plume.isShorelineCritical ? 0.28 : 0.12,
          }}
        >
          <Tooltip direction="bottom" className="tactical-tooltip">
            <div className="px-2 py-1 rounded bg-[#181105]/95 border border-yellow-500/60 text-yellow-300 font-mono text-[10px]">
              WADDEN SEA TIDAL FLATS // SENSITIVITY: HIGH (ESI 9-10)
            </div>
          </Tooltip>
        </Polygon>
      )}

      {/* 4. ECOLOGICAL SENSITIVITY LAYER: Natura 2000 Marine Sanctuary */}
      {layers.ecological && (
        <Polygon
          positions={ECOLOGICAL_RESERVE_NATURA2000}
          pathOptions={{
            color: '#10B981',
            weight: 1.5,
            fillColor: '#059669',
            fillOpacity: 0.15,
            dashArray: '3, 4',
          }}
        >
          <Tooltip direction="top" className="tactical-tooltip">
            <div className="px-2 py-1 rounded bg-[#061810]/95 border border-emerald-500/50 text-emerald-300 font-mono text-[10px]">
              NATURA 2000: BIRD & SEAL NURSERY BIOSPHERE
            </div>
          </Tooltip>
        </Polygon>
      )}

      {/* 5. FISHERIES LAYER: Zone 4B Active Demersal Grounds */}
      {layers.fisheries && (
        <Polygon
          positions={FISHERIES_ZONE_4B}
          pathOptions={{
            color: '#38BDF8',
            weight: 1.5,
            fillColor: '#0284C7',
            fillOpacity: 0.12,
            dashArray: '4, 4',
          }}
        >
          <Tooltip direction="left" className="tactical-tooltip">
            <div className="px-2 py-1 rounded bg-[#061320]/95 border border-sky-500/50 text-sky-300 font-mono text-[10px]">
              COMMERCIAL FISHERIES: DEMERSAL ZONE 4B
            </div>
          </Tooltip>
        </Polygon>
      )}

      {/* 6. POPULATION & HARBOR CENTERS */}
      {layers.population && (
        <>
          {COASTAL_HARBORS.map((h, i) => (
            <CircleMarker
              key={i}
              center={[h.lat, h.lon]}
              radius={4.5}
              pathOptions={{
                color: '#CBD5E1',
                fillColor: '#F8FAFC',
                fillOpacity: 0.8,
                weight: 1.5,
              }}
            >
              <Tooltip direction="bottom" className="tactical-tooltip">
                <div className="px-2 py-0.5 rounded bg-[#0A0E18]/95 border border-white/20 text-white font-mono text-[9px]">
                  {h.name} ({h.type})
                </div>
              </Tooltip>
            </CircleMarker>
          ))}
        </>
      )}
    </>
  );
};

export default ImpactForecastMapLayer;
