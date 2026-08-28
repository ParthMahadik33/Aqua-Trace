'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import { Vessel, CategoryFilterState } from '@/types/vessel';

const DynamicAisMap = dynamic(() => import('./AisMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#070A10] text-zinc-400 font-mono gap-3">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border border-cyan-500/30 animate-ping"></div>
        <div className="absolute inset-0 rounded-full border-2 border-t-cyan-400 border-r-transparent border-b-cyan-500/30 border-l-transparent animate-spin"></div>
      </div>
      <span className="text-xs tracking-widest text-cyan-400/80 uppercase">
        INITIALIZING TACTICAL RADAR CANVAS...
      </span>
    </div>
  ),
});

interface MapWrapperProps {
  vessels: Vessel[];
  selectedVessel: Vessel | null;
  onSelectVessel: (vessel: Vessel | null) => void;
  filterState: CategoryFilterState;
  panTarget: { lat: number; lon: number; zoom?: number } | null;
  sectorBounds?: [[number, number], [number, number]];
}

export const MapWrapper: React.FC<MapWrapperProps> = (props) => {
  return <DynamicAisMap {...props} />;
};

export default MapWrapper;
