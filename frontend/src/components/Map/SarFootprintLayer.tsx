'use client';

import React from 'react';
import { Rectangle, Tooltip } from 'react-leaflet';
import { Satellite } from 'lucide-react';

interface SarFootprintLayerProps {
  bounds: [[number, number], [number, number]] | null;
  sectorLabel?: string;
  acquisitionTimeFormatted?: string;
  onSelectFootprint?: () => void;
}

export const SarFootprintLayer: React.FC<SarFootprintLayerProps> = ({
  bounds,
  sectorLabel = 'Northern Malacca Strait Sector',
  acquisitionTimeFormatted,
  onSelectFootprint,
}) => {
  if (!bounds) return null;

  return (
    <Rectangle
      bounds={bounds}
      pathOptions={{
        color: '#06B6D4',
        weight: 2,
        dashArray: '6, 6',
        fillColor: '#06B6D4',
        fillOpacity: 0.12,
        className: 'sar-footprint-pulse',
      }}
      eventHandlers={{
        click: () => {
          if (onSelectFootprint) {
            onSelectFootprint();
          }
        },
      }}
    >
      <Tooltip
        sticky
        direction="top"
        className="tactical-tooltip"
        opacity={1}
      >
        <div className="bg-[#080C14]/95 border border-cyan-500/50 rounded-lg p-2.5 shadow-2xl backdrop-blur-md text-xs font-mono text-zinc-200 pointer-events-none space-y-1">
          <div className="flex items-center gap-1.5 text-cyan-300 font-bold text-[10px] tracking-wider uppercase">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping inline-block" />
            SENTINEL-1 SAR COVERAGE
          </div>
          <div className="text-[11px] font-semibold text-white">
            {sectorLabel}
          </div>
          {acquisitionTimeFormatted && (
            <div className="text-[9px] text-zinc-400">
              ACQUIRED: {acquisitionTimeFormatted}
            </div>
          )}
          <div className="text-[9px] text-emerald-400/90 font-semibold pt-0.5 border-t border-white/10">
            RADAR BACKSCATTER APERTURE (IW GRD VV)
          </div>
        </div>
      </Tooltip>
    </Rectangle>
  );
};

export default SarFootprintLayer;
