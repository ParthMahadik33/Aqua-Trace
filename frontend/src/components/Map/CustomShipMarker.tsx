'use client';

import React, { useMemo } from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { Vessel, SHIP_CATEGORY_COLORS } from '@/types/vessel';

interface CustomShipMarkerProps {
  vessel: Vessel;
  isSelected: boolean;
  onSelect: (vessel: Vessel) => void;
}

export const CustomShipMarker: React.FC<CustomShipMarkerProps> = React.memo(({ vessel, isSelected, onSelect }) => {
  const colorInfo = SHIP_CATEGORY_COLORS[vessel.ship_type] || SHIP_CATEGORY_COLORS.Pending;
  const hexColor = colorInfo.hex;
  const rotation = typeof vessel.cog === 'number' ? vessel.cog : 0;
  const isMoving = vessel.sog > 0.5;
  const isDemo = Boolean(vessel.is_demo);
  const isPending = vessel.ship_type === 'Pending' || vessel.raw_type === null || vessel.raw_type === undefined;

  const customIcon = useMemo(() => {
    // Custom SVG ship geometry: pointed bow at top (0 deg), stern at bottom, superstructure bridge
    const strokeDash = isPending ? 'stroke-dasharray="3 2"' : '';
    const strokeColor = isSelected ? '#00FFFF' : isDemo ? '#F59E0B' : isPending ? '#94A3B8' : '#FFFFFF';

    const svgIcon = `
      <div class="relative flex items-center justify-center cursor-pointer select-none group" style="width: 38px; height: 38px;">
        ${
          isSelected
            ? `<div class="absolute inset-0 rounded-full border-2 border-cyan-400 animate-ping opacity-75"></div>
               <div class="absolute inset-[-4px] rounded-full border border-dashed border-cyan-300 animate-spin" style="animation-duration: 6s;"></div>`
            : ''
        }
        ${
          isDemo
            ? `<div class="absolute -top-1 -right-1 px-1 py-0.2 text-[8px] font-mono font-bold bg-amber-500/90 text-black rounded border border-amber-300 tracking-tighter">DEMO</div>`
            : ''
        }
        <div 
          class="relative flex items-center justify-center transition-transform duration-300"
          style="transform: rotate(${rotation}deg); width: 34px; height: 34px;"
        >
          <!-- Vessel Heading Vector Line if moving -->
          ${
            isMoving
              ? `<div class="absolute -top-3 left-1/2 -translate-x-1/2 w-[2px] h-3 bg-gradient-to-t from-[${hexColor}] to-transparent opacity-80"></div>`
              : ''
          }
          <!-- Tactical Vessel Hull SVG -->
          <svg viewBox="0 0 24 32" class="w-7 h-9 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
            <!-- Outer Vessel Hull -->
            <path 
              d="M12 2 L19 10 L19 26 L16 30 L8 30 L5 26 L5 10 Z" 
              fill="${hexColor}" 
              fill-opacity="${isSelected ? '0.95' : isPending ? '0.65' : '0.85'}"
              stroke="${strokeColor}" 
              stroke-width="${isSelected ? '2' : isPending ? '1.4' : '1.2'}"
              ${strokeDash}
              stroke-linejoin="round"
            />
            <!-- Bridge / Superstructure -->
            <path 
              d="M9 16 L15 16 L14 24 L10 24 Z" 
              fill="#0E131F" 
              stroke="${strokeColor}" 
              stroke-width="0.8"
              ${strokeDash}
            />
            <!-- Bow Direction Arrow Indicator -->
            <polygon 
              points="12,5 14,11 10,11" 
              fill="${isPending ? '#94A3B8' : '#FFFFFF'}" 
              opacity="0.9"
            />
          </svg>
        </div>
      </div>
    `;

    return L.divIcon({
      html: svgIcon,
      className: 'custom-ais-ship-icon',
      iconSize: [38, 38],
      iconAnchor: [19, 19],
    });
  }, [hexColor, rotation, isSelected, isMoving, isDemo, isPending]);

  // Ensure lat and lon are valid
  if (typeof vessel.lat !== 'number' || typeof vessel.lon !== 'number' || isNaN(vessel.lat) || isNaN(vessel.lon)) {
    return null;
  }

  return (
    <Marker
      position={[vessel.lat, vessel.lon]}
      icon={customIcon}
      eventHandlers={{
        click: () => onSelect(vessel),
      }}
    >
      <Tooltip direction="top" offset={[0, -14]} opacity={0.95} className="tactical-tooltip">
        <div className="bg-[#0B0F17]/95 border border-white/20 px-2.5 py-1.5 rounded shadow-xl text-xs backdrop-blur font-sans">
          <div className="flex items-center gap-1.5 font-bold text-white tracking-wide truncate max-w-[180px]">
            <span>{vessel.name || `MMSI: ${vessel.mmsi}`}</span>
            {isPending && (
              <span className="px-1 py-0.2 rounded text-[9px] font-mono bg-slate-500/20 text-slate-300 border border-slate-500/40">
                PENDING STATIC
              </span>
            )}
            {isDemo && (
              <span className="px-1 py-0.2 rounded text-[9px] font-mono bg-amber-500/20 text-amber-400 border border-amber-500/40">
                DEMO
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-[11px] font-mono">
            <span style={{ color: hexColor }} className="font-semibold">
              {vessel.ship_type}
            </span>
            <span className="text-zinc-400">•</span>
            <span className="text-zinc-300">{vessel.sog.toFixed(1)} kn</span>
            <span className="text-zinc-400">•</span>
            <span className="text-zinc-400">{Math.round(vessel.cog)}°</span>
          </div>
        </div>
      </Tooltip>
    </Marker>
  );
});

CustomShipMarker.displayName = 'CustomShipMarker';
