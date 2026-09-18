'use client';

import React from 'react';
import Link from 'next/link';
import { ThemeToggle } from '../Theme/ThemeToggle';

export const LandingNav: React.FC = () => {
  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-[#0B0F19]/90 dark:bg-[#070B14]/90 light:bg-white/95 border-b border-slate-700/40 dark:border-slate-800/80 light:border-slate-200 z-[700] flex items-center justify-between px-4 sm:px-8 backdrop-blur-md text-slate-200 dark:text-slate-200 light:text-slate-800 select-none transition-colors">
      {/* Brand Identity */}
      <Link
        href="/"
        className="flex items-center gap-3 group cursor-pointer"
        title="AquaTrace Maritime Intelligence"
      >
        <div className="w-8 h-8 rounded bg-slate-900 dark:bg-slate-900 light:bg-slate-100 border border-slate-700 dark:border-slate-700 light:border-slate-300 flex items-center justify-center p-0.5 shadow-sm">
          <img src="/logo.png" alt="AquaTrace" className="w-full h-full object-contain" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-white dark:text-white light:text-slate-900 text-sm tracking-wider">
              AQUATRACE
            </span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-800 dark:bg-slate-800 light:bg-slate-200 text-slate-300 dark:text-slate-300 light:text-slate-700 border border-slate-700 dark:border-slate-700 light:border-slate-300 tracking-widest uppercase font-semibold">
              CONSOLE
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-400 light:text-slate-500 tracking-wider hidden sm:inline">
            NATIONAL MARITIME OPERATIONS
          </span>
        </div>
      </Link>

      {/* Anchor Section Jump Links */}
      <nav className="hidden md:flex items-center gap-6 font-mono text-xs text-slate-400 dark:text-slate-400 light:text-slate-600">
        <a
          href="#satellite-proof"
          className="hover:text-cyan-400 dark:hover:text-cyan-400 light:hover:text-sky-600 transition-colors tracking-wider"
        >
          SATELLITE SAR
        </a>
        <span className="text-slate-600 dark:text-slate-600 light:text-slate-300">/</span>
        <a
          href="#ais-proof"
          className="hover:text-cyan-400 dark:hover:text-cyan-400 light:hover:text-sky-600 transition-colors tracking-wider"
        >
          LIVE AIS
        </a>
        <span className="text-slate-600 dark:text-slate-600 light:text-slate-300">/</span>
        <a
          href="#investigation-bridge"
          className="hover:text-cyan-400 dark:hover:text-cyan-400 light:hover:text-sky-600 transition-colors tracking-wider"
        >
          WORKFLOW
        </a>
      </nav>

      {/* Tactical Actions */}
      <div className="flex items-center gap-2.5 sm:gap-3 font-mono text-xs">
        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Secondary: Live Operations */}
        <Link
          href="/operations"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-transparent hover:bg-slate-800/50 dark:hover:bg-slate-800/50 light:hover:bg-slate-100 text-slate-400 dark:text-slate-400 light:text-slate-600 border border-slate-700 dark:border-slate-700 light:border-slate-300 transition-colors font-medium tracking-wider text-[11px]"
          title="Open Live Operations Radar"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span>LIVE OPS</span>
        </Link>

        {/* Primary CTA: START INVESTIGATION */}
        <Link
          href="/simulation"
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white border border-sky-500 font-semibold tracking-wider text-[11px] shadow-sm transition-colors cursor-pointer"
          title="Start 12-Stage Incident Investigation Workflow"
        >
          <span>START INVESTIGATION</span>
        </Link>
      </div>
    </header>
  );
};

export default LandingNav;
