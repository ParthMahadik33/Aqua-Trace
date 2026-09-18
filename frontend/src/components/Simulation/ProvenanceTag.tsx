'use client';

import React from 'react';

export type ProvenanceType = 
  | 'REAL SATELLITE DATA'
  | 'CURATED CASE DATA'
  | 'PROTOTYPE MODEL'
  | 'SIMULATED INPUT'
  | 'DERIVED RESULT'
  | 'COPERNICUS SENTINEL-1'
  | 'HISTORICAL AIS'
  | 'PARAMETRIC ENSEMBLE';

interface ProvenanceTagProps {
  type: ProvenanceType | string;
  className?: string;
}

export const ProvenanceTag: React.FC<ProvenanceTagProps> = ({ type, className = '' }) => {
  const getStyle = (t: string) => {
    switch (t) {
      case 'REAL SATELLITE DATA':
      case 'COPERNICUS SENTINEL-1':
        return 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30';
      case 'CURATED CASE DATA':
        return 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30';
      case 'PROTOTYPE MODEL':
      case 'PARAMETRIC ENSEMBLE':
        return 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30';
      case 'SIMULATED INPUT':
        return 'bg-purple-500/10 text-purple-800 dark:text-purple-300 border-purple-500/30';
      case 'DERIVED RESULT':
      default:
        return 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-400/30 dark:border-slate-600/30';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono tracking-wider border font-medium uppercase select-none ${getStyle(
        type
      )} ${className}`}
    >
      {type}
    </span>
  );
};

export default ProvenanceTag;
