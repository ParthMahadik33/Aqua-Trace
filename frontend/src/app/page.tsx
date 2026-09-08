import React from 'react';
import { LandingNav } from '@/components/Landing/LandingNav';
import { HeroSection } from '@/components/Landing/HeroSection';
import { SarObservationSection } from '@/components/Landing/SarObservationSection';
import { AisLiveSection } from '@/components/Landing/AisLiveSection';
import { InvestigationBridge } from '@/components/Landing/InvestigationBridge';

export const metadata = {
  title: 'AquaTrace — Maritime Oil Spill Intelligence & Reconstruction',
  description:
    'AquaTrace connects Copernicus Sentinel-1 SAR satellite intelligence, real-time AIS vessel telemetry, and oceanic drift dynamics to reconstruct maritime oil spill incidents.',
};

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-[#070A10] text-zinc-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Technical Navigation */}
      <LandingNav />

      {/* Main Structural Sections */}
      <main className="flex-1 w-full flex flex-col">
        {/* 1. Full-Bleed Video Hero */}
        <HeroSection />

        {/* 2. Sentinel-1 SAR Real Satellite Observation Proof */}
        <SarObservationSection />

        {/* 3. Live AIS Vessel Movement Proof */}
        <AisLiveSection />

        {/* 4. Transition Bridge from Observations to Incident Investigation */}
        <InvestigationBridge />
      </main>
    </div>
  );
}
