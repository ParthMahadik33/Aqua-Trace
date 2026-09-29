'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Dynamic import with SSR disabled for MapLibre WebGL context
const DynamicCounterfactualWorkstation = dynamic(
  () =>
    import('@/components/Counterfactual/CounterfactualWorkstation').then(
      (mod) => mod.CounterfactualWorkstation
    ),
  {
    ssr: false,
    loading: () => (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-[#070A10] text-zinc-300 font-mono text-xs gap-3">
        <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <span className="tracking-widest uppercase text-cyan-400 font-bold">
          Initializing Counterfactual Workstation...
        </span>
        <span className="text-[10px] text-zinc-500">
          Loading Sentinel-1 SAR observation and hydrodynamic reanalysis grid
        </span>
      </div>
    ),
  }
);

export default function CounterfactualPage() {
  return <DynamicCounterfactualWorkstation />;
}
