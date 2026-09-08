'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronUp, ShieldCheck, Waves, Satellite, Navigation } from 'lucide-react';

export const InvestigationBridge: React.FC = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section id="investigation-bridge" className="relative w-full bg-[#05070C] border-t border-white/10 pt-24 pb-16 px-6 sm:px-12 lg:px-16 select-none scroll-mt-16">
      <div className="max-w-7xl mx-auto">
        {/* Core Bridge Banner */}
        <div className="relative rounded-2xl bg-gradient-to-b from-[#0A0F1D] to-[#070A12] border border-cyan-500/25 p-8 sm:p-14 overflow-hidden shadow-2xl">
          {/* Subtle Background Structural Accent */}
          <div
            className="absolute inset-0 pointer-events-none opacity-25"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(6, 182, 212, 0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(6, 182, 212, 0.1) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />

          <div className="relative z-10 max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 tracking-widest uppercase mb-4">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>INCIDENT RECONSTRUCTION PIPELINE</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white uppercase leading-tight">
              FROM OBSERVATIONS<br />
              <span className="text-cyan-400">TO INVESTIGATION.</span>
            </h2>

            <p className="mt-6 text-base sm:text-lg text-zinc-300 font-light leading-relaxed">
              Satellite imagery and vessel movement are only the beginning. AquaTrace connects these observations into an evidence-driven incident investigation workflow.
            </p>

            {/* Pillars Overview */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs text-zinc-400">
              <div className="flex items-center gap-2.5 p-3 rounded-lg bg-white/5 border border-white/10">
                <Satellite className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <span>SAR DELINEATION</span>
              </div>
              <div className="flex items-center gap-2.5 p-3 rounded-lg bg-white/5 border border-white/10">
                <Waves className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <span>DRIFT TRAJECTORY</span>
              </div>
              <div className="flex items-center gap-2.5 p-3 rounded-lg bg-white/5 border border-white/10">
                <Navigation className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <span>VESSEL ATTRIBUTION</span>
              </div>
            </div>

            {/* Primary Action Button */}
            <div className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <Link
                href="/simulation"
                className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#070A10] font-mono font-bold text-sm tracking-wider uppercase transition-all shadow-[0_0_24px_rgba(245,158,11,0.35)] hover:shadow-[0_0_32px_rgba(245,158,11,0.55)] cursor-pointer group"
              >
                <span>OPEN INCIDENT SIMULATION</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href="/operations"
                className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/15 font-mono text-sm tracking-wider uppercase transition-all cursor-pointer"
              >
                <span>OPEN LIVE OPERATIONS</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Technical Maritime Intelligence Footer */}
        <div className="mt-16 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs text-zinc-500">
          <div className="flex items-center gap-3">
            <span className="text-zinc-300 font-bold tracking-wider">AQUATRACE</span>
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
