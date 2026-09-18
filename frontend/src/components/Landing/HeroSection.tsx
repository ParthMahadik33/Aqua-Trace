'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronDown } from 'lucide-react';

export const HeroSection: React.FC = () => {
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);

  return (
    <section className="relative w-full min-h-screen flex items-center justify-start overflow-hidden bg-[#070A10] select-none">
      {/* Fallback Dark Ocean Gradient (Always present as baseline) */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#060910] via-[#080E18] to-[#070A10] z-0" />

      {/* Full-Bleed Background Video Asset */}
      {!videoError && (
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          onLoadedData={() => setIsVideoLoaded(true)}
          onError={() => setVideoError(true)}
          className={`absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-1000 ${
            isVideoLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <source src="/hero-bg.mp4" type="video/mp4" />
          <source src="/api/hero-bg" type="video/mp4" />
        </video>
      )}

      {/* Subtle Ocean Atmospheric Scanline & Grid (Very faint, technical identity) */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none opacity-20"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(6, 182, 212, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(6, 182, 212, 0.08) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }}
      />

      {/* Asymmetric Gradient Overlay: Left side deeply shaded for typography, right side reveals ocean video */}
      <div className="absolute inset-0 z-[2] pointer-events-none bg-gradient-to-r from-[#070A10] via-[#070A10]/85 to-transparent sm:via-[#070A10]/75" />
      <div className="absolute inset-0 z-[2] pointer-events-none bg-gradient-to-t from-[#070A10] via-transparent to-[#070A10]/70" />

      {/* Left-Aligned Hero Content Block */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-12 lg:px-16 pt-24 pb-20 flex flex-col justify-between min-h-screen">
        {/* Main Content Area */}
        <div className="max-w-2xl mt-auto mb-auto pt-12">
          {/* Eyebrow */}
          <div className="text-[11px] sm:text-xs font-mono font-semibold tracking-[0.2em] text-sky-400 uppercase mb-4 sm:mb-6">
            MARITIME INCIDENT INVESTIGATION WORKSTATION
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.1] uppercase">
            FROM SATELLITE OBSERVATION<br />
            <span className="text-sky-300">
              TO DEFENSIBLE SOURCE HYPOTHESIS.
            </span>
          </h1>

          {/* Supporting Statement */}
          <p className="mt-6 sm:mt-8 text-base sm:text-lg text-slate-300 font-normal leading-relaxed max-w-xl">
            AquaTrace connects Copernicus Sentinel-1 SAR imagery, Lagrangian hydrodynamic back-drift, and AIS vessel kinematics into a structured, step-by-step incident investigation workflow.
          </p>

          {/* Primary Investigation CTA & Secondary Operations Action */}
          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
            <Link
              href="/simulation"
              className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-mono font-bold text-xs sm:text-sm tracking-wider uppercase transition-colors shadow-md cursor-pointer group"
            >
              <span>START INVESTIGATION</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              href="/operations"
              className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 font-mono text-xs sm:text-sm tracking-wider uppercase transition-colors cursor-pointer"
            >
              <span>LIVE OPERATIONS</span>
            </Link>

            <a
              href="#satellite-proof"
              className="inline-flex items-center justify-center gap-2 px-4 py-3.5 text-slate-400 hover:text-slate-200 font-mono text-xs tracking-wider uppercase transition-colors cursor-pointer"
            >
              <span>EXPLORE WORKFLOW</span>
            </a>
          </div>
        </div>

        {/* Bottom Technical Context Line & Scroll Indicator */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-mono text-[11px] text-zinc-400 tracking-wider">
          <div>
            SATELLITE INTELLIGENCE &nbsp;·&nbsp; OCEAN DYNAMICS &nbsp;·&nbsp; VESSEL INTELLIGENCE
          </div>

          <a
            href="#satellite-proof"
            className="flex items-center gap-2 text-zinc-500 hover:text-cyan-400 transition-colors text-[10px] uppercase tracking-widest cursor-pointer group"
          >
            <span>DISCOVER DATA LAYER</span>
            <ChevronDown className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
          </a>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
