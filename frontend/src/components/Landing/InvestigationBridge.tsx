'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronUp, ShieldCheck, Waves, Satellite, Navigation } from 'lucide-react';

export const InvestigationBridge: React.FC = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section id="investigation-bridge" className="relative w-full bg-slate-950 dark:bg-[#070B14] light:bg-slate-100 border-t border-slate-800 dark:border-slate-800 light:border-slate-300 pt-20 pb-16 px-6 sm:px-12 lg:px-16 select-none scroll-mt-16 transition-colors">
      <div className="max-w-7xl mx-auto">
        {/* Core Bridge Banner */}
        <div className="relative rounded-xl bg-slate-900 dark:bg-slate-900 light:bg-white border border-slate-700 dark:border-slate-800 light:border-slate-300 p-8 sm:p-12 overflow-hidden shadow-md">
          <div className="relative z-10 max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-mono text-sky-400 dark:text-sky-400 light:text-sky-700 tracking-widest uppercase mb-4 font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>INCIDENT INVESTIGATION WORKFLOW</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white dark:text-white light:text-slate-900 uppercase leading-tight font-mono">
              FROM SATELLITE OBSERVATION<br />
              <span className="text-sky-400 dark:text-sky-400 light:text-sky-600">TO DEFENSIBLE SOURCE HYPOTHESIS.</span>
            </h2>

            <p className="mt-5 text-sm sm:text-base text-slate-300 dark:text-slate-300 light:text-slate-600 font-normal leading-relaxed">
              Satellite observations and AIS telemetry are integrated through a deterministic 12-stage forensic pipeline: SAR Screening, Segmentation, Lagrangian Hindcast, AIS Shortlisting, Counterfactual Simulation, and Exposure Assessment.
            </p>

            {/* Pillars Overview */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs text-slate-300 dark:text-slate-300 light:text-slate-700">
              <div className="flex items-center gap-2.5 p-3 rounded bg-slate-800/60 dark:bg-slate-800/60 light:bg-slate-50 border border-slate-700 dark:border-slate-700 light:border-slate-200">
                <Satellite className="w-4 h-4 text-sky-400 dark:text-sky-400 light:text-sky-600 flex-shrink-0" />
                <span className="font-medium">SAR DELINEATION</span>
              </div>
              <div className="flex items-center gap-2.5 p-3 rounded bg-slate-800/60 dark:bg-slate-800/60 light:bg-slate-50 border border-slate-700 dark:border-slate-700 light:border-slate-200">
                <Waves className="w-4 h-4 text-sky-400 dark:text-sky-400 light:text-sky-600 flex-shrink-0" />
                <span className="font-medium">LAGRANGIAN HINDCAST</span>
              </div>
              <div className="flex items-center gap-2.5 p-3 rounded bg-slate-800/60 dark:bg-slate-800/60 light:bg-slate-50 border border-slate-700 dark:border-slate-700 light:border-slate-200">
                <Navigation className="w-4 h-4 text-sky-400 dark:text-sky-400 light:text-sky-600 flex-shrink-0" />
                <span className="font-medium">ATTRIBUTION CONSISTENCY</span>
              </div>
            </div>

            {/* Primary Action Button */}
            <div className="mt-9 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <Link
                href="/simulation"
                className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-mono font-bold text-sm tracking-wider uppercase transition-colors shadow-sm cursor-pointer group"
              >
                <span>RUN INCIDENT INVESTIGATION</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href="/operations"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded bg-transparent hover:bg-slate-800/50 dark:hover:bg-slate-800/50 light:hover:bg-slate-100 text-slate-300 dark:text-slate-300 light:text-slate-700 border border-slate-700 dark:border-slate-700 light:border-slate-300 font-mono text-sm tracking-wider uppercase transition-colors cursor-pointer"
              >
                <span>OPEN LIVE OPERATIONS</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Technical Maritime Intelligence Footer */}
        <div className="mt-14 pt-6 border-t border-slate-800 dark:border-slate-800 light:border-slate-300 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs text-slate-400 dark:text-slate-400 light:text-slate-500">
          <div className="flex items-center gap-3">
            <span className="text-slate-200 dark:text-slate-200 light:text-slate-800 font-bold tracking-wider">AQUATRACE</span>
            <span>//</span>
            <span>COPERNICUS SENTINEL-1 SAR &middot; AISSTREAM TELEMETRY</span>
          </div>

          <button
            onClick={scrollToTop}
            className="flex items-center gap-1.5 text-zinc-400 hover:text-cyan-400 transition-colors uppercase tracking-widest text-[11px] cursor-pointer"
          >
            <span>BACK TO TOP</span>
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default InvestigationBridge;
