'use client';

import React from 'react';
import {
  Satellite,
  Radio,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  ArrowRight,
  Activity,
  Globe2,
} from 'lucide-react';
import { SurveillanceFeedItem } from '@/types/simulation';

interface SurveillanceFeedViewProps {
  feedItems: SurveillanceFeedItem[];
  onTriggerNewAcquisition: () => void;
}

export const SurveillanceFeedView: React.FC<SurveillanceFeedViewProps> = ({
  feedItems,
  onTriggerNewAcquisition,
}) => {
  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Monitoring Status Card */}
      <div className="p-4 rounded-xl bg-[#0C121E] border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="font-bold text-white tracking-wide">
              Copernicus Satellite Constellation Surveillance
            </span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 font-bold">
            REAL METADATA
          </span>
        </div>

        <p className="text-zinc-300 text-[11px] font-sans leading-relaxed">
          AquaTrace monitors high-density European maritime corridors via Copernicus Sentinel-1A and Sentinel-1B radar swaths. Routine passes are screened automatically for surface roughness anomalies.
        </p>

        {/* Global Status HUD */}
        <div className="grid grid-cols-3 gap-2 text-center pt-1">
          <div className="p-2 rounded-lg bg-white/5 border border-white/5">
            <div className="text-[9px] text-zinc-400 uppercase">Constellation</div>
            <div className="text-xs font-bold text-white mt-0.5">Sentinel-1A / 1B</div>
          </div>
          <div className="p-2 rounded-lg bg-white/5 border border-white/5">
            <div className="text-[9px] text-zinc-400 uppercase">Surveillance Swath</div>
            <div className="text-xs font-bold text-cyan-300 mt-0.5">250 km IW Swath</div>
          </div>
          <div className="p-2 rounded-lg bg-white/5 border border-white/5">
            <div className="text-[9px] text-zinc-400 uppercase">System Status</div>
            <div className="text-xs font-bold text-emerald-400 mt-0.5">AUTO-INGESTION ON</div>
          </div>
        </div>
      </div>

      {/* Sequential Acquisitions Feed */}
      <div className="space-y-2">
        <div className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center justify-between">
          <span>Recent Orbital Acquisitions</span>
          <span className="text-[10px] text-zinc-500">Timeline</span>
        </div>

        <div className="space-y-2">
          {feedItems.map((item) => {
            const isAlert = item.status === 'ALERT_NEW';

            return (
              <div
                key={item.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  isAlert
                    ? 'bg-gradient-to-r from-amber-950/40 via-[#181005] to-black border-amber-400 shadow-lg shadow-amber-950/40 ring-1 ring-amber-400/40 animate-pulse'
                    : 'bg-[#0A0E18] border-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        isAlert
                          ? 'bg-amber-400 text-black font-black'
                          : 'bg-white/5 text-zinc-400 border border-white/10'
                      }`}
                    >
                      <Satellite className="w-3.5 h-3.5" />
                    </div>

                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <span>{item.satellite} — {item.timeUtc}</span>
                        {isAlert ? (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-400 text-black uppercase animate-bounce">
                            NEW ACQUISITION RECEIVED
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            PROCESSED
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-zinc-400 font-sans mt-0.5">
                        {item.sector} ({item.date}) • Orbit {item.orbit}
                      </div>
                    </div>
                  </div>

                  {isAlert && (
                    <button
                      onClick={onTriggerNewAcquisition}
                      className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-black text-xs font-black transition-all cursor-pointer shadow-md flex items-center gap-1.5"
                    >
                      <span>PROCESS NOW</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SurveillanceFeedView;
