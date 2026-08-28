'use client';

import React, { useState } from 'react';
import { Layers, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import { ShipCategory, SHIP_CATEGORY_COLORS, CategoryFilterState } from '@/types/vessel';

interface VesselLegendProps {
  filterState: CategoryFilterState;
  onToggleCategory: (category: ShipCategory) => void;
  onToggleAll: (enableAll: boolean) => void;
  categoryCounts: Record<ShipCategory, number>;
  totalVisible: number;
}

const CATEGORIES: ShipCategory[] = ['Tanker', 'Cargo', 'Fishing', 'Passenger', 'Other', 'Pending'];

export const VesselLegend: React.FC<VesselLegendProps> = ({
  filterState,
  onToggleCategory,
  onToggleAll,
  categoryCounts,
  totalVisible,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const allActive = CATEGORIES.every((cat) => filterState[cat]);

  return (
    <div className="absolute bottom-6 left-6 z-[500] w-72 bg-[#0A0E17]/95 border border-white/10 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden text-zinc-200 font-sans transition-all duration-200">
      {/* Legend Header */}
      <div className="px-3.5 py-2.5 bg-[#0E1422]/90 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-mono font-bold tracking-wider text-white uppercase">
            FLEET CLASSIFICATION
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-mono text-zinc-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
            {totalVisible} Active
          </span>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 text-zinc-400 hover:text-white rounded hover:bg-white/10 transition-colors cursor-pointer"
            title={isCollapsed ? 'Expand Legend' : 'Collapse Legend'}
          >
            {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Legend Body */}
      {!isCollapsed && (
        <div className="p-3 space-y-1.5">
          <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Toggle Map Layer</span>
            <button
              onClick={() => onToggleAll(!allActive)}
              className="text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer"
            >
              {allActive ? 'Hide All' : 'Show All'}
            </button>
          </div>

          <div className="space-y-1">
            {CATEGORIES.map((category) => {
              const isEnabled = filterState[category] ?? true;
              const colorInfo = SHIP_CATEGORY_COLORS[category];
              const count = categoryCounts[category] || 0;
              const isPending = category === 'Pending';

              return (
                <button
                  key={category}
                  onClick={() => onToggleCategory(category)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all duration-150 border cursor-pointer ${
                    isEnabled
                      ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white'
                      : 'bg-black/40 border-transparent opacity-40 hover:opacity-70 text-zinc-400'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {/* Visual Color Dot */}
                    <span
                      className={`w-3 h-3 rounded-full flex-shrink-0 shadow-sm ${
                        isPending ? 'border border-dashed border-slate-300' : ''
                      }`}
                      style={{
                        backgroundColor: colorInfo.hex,
                        boxShadow: isEnabled && !isPending ? `0 0 8px ${colorInfo.hex}80` : 'none',
                      }}
                    ></span>
                    <span className="font-medium tracking-wide">
                      {category === 'Pending' ? 'Pending Static' : category}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-zinc-400 bg-black/40 px-1.5 py-0.5 rounded">
                      {count}
                    </span>
                    {isEnabled ? (
                      <Eye className="w-3.5 h-3.5 text-zinc-400" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5 text-zinc-600" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-white/5 text-[10px] font-mono text-zinc-400 text-center">
            Click category to filter map markers
          </div>
        </div>
      )}
    </div>
  );
};

export default VesselLegend;
