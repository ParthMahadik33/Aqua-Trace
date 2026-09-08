'use client';

import React from 'react';
import Link from 'next/link';
import { Radio } from 'lucide-react';

export const LandingNav: React.FC = () => {
  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-[#070A10]/85 border-b border-white/10 z-[700] flex items-center justify-between px-4 sm:px-8 backdrop-blur-md text-zinc-200 select-none transition-all">
      {/* Brand Identity */}
      <Link
        href="/"
        className="flex items-center gap-3 group cursor-pointer"
        title="AquaTrace Maritime Intelligence"
      >
        <div className="w-8 h-8 rounded-lg bg-cyan-950/40 border border-cyan-500/40 flex items-center justify-center shadow-lg shadow-cyan-500/10 group-hover:border-cyan-400 transition-colors overflow-hidden p-0.5">
          <img src="/logo.png" alt="AquaTrace" className="w-full h-full object-contain" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-mono font-black text-white text-base tracking-wider group-hover:text-cyan-300 transition-colors">
              AQUATRACE
            </span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 tracking-widest uppercase">
              OPS-1
            </span>
          </div>
          <span className="text-[9px] font-mono text-zinc-400 tracking-wider hidden sm:inline">
            MARITIME INCIDENT INVESTIGATION
          </span>
        </div>
      </Link>

      {/* Anchor Section Jump Links */}
      <nav className="hidden md:flex items-center gap-6 font-mono text-xs text-zinc-400">
        <a
          href="#satellite-proof"
          className="hover:text-cyan-300 transition-colors tracking-wider"
        >
          SATELLITE SAR
        </a>
        <span className="text-zinc-700">/</span>
        <a
          href="#ais-proof"
          className="hover:text-cyan-300 transition-colors tracking-wider"
        >
          LIVE AIS
        </a>
        <span className="text-zinc-700">/</span>
        <a
          href="#investigation-bridge"
          className="hover:text-cyan-300 transition-colors tracking-wider"
        >
          INVESTIGATION
        </a>
      </nav>

      {/* Primary Tactical Actions */}
      <div className="flex items-center gap-2 sm:gap-3 font-mono text-xs">
        <Link
          href="/operations"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-400/40 hover:border-cyan-400 transition-all font-semibold tracking-wider text-[11px] shadow-sm group"
          title="Open Full Tactical Live Operations Console"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>LIVE OPERATIONS</span>
        </Link>

        <Link
          href="/simulation"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:border-amber-400 transition-all font-semibold tracking-wider text-[11px]"
          title="Open Case 0004 Incident Simulation Sandbox"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <span>SIMULATION</span>
          <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-200 border border-amber-500/40">
            0004
          </span>
        </Link>
      </div>
    </header>
  );
};

export default LandingNav;
