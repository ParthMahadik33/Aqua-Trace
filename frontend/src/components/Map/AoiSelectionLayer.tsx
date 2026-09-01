'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useMap, Rectangle, Tooltip } from 'react-leaflet';
import L from 'leaflet';

interface AoiSelectionLayerProps {
  isSelecting: boolean;
  selectedAoi: [number, number, number, number] | null;
  onAoiComplete: (bbox: [number, number, number, number]) => void;
  onCancelSelection: () => void;
}

export const AoiSelectionLayer: React.FC<AoiSelectionLayerProps> = ({
  isSelecting,
  selectedAoi,
  onAoiComplete,
  onCancelSelection,
}) => {
  const map = useMap();
  const [dragStart, setDragStart] = useState<L.LatLng | null>(null);
  const [currentBounds, setCurrentBounds] = useState<[[number, number], [number, number]] | null>(null);

  const isSelectingRef = useRef(isSelecting);
  const dragStartRef = useRef<L.LatLng | null>(null);

  useEffect(() => {
    isSelectingRef.current = isSelecting;
  }, [isSelecting]);

  useEffect(() => {
    dragStartRef.current = dragStart;
  }, [dragStart]);

  // Handle map interaction modes & keydown Escape
  useEffect(() => {
    if (isSelecting) {
      map.dragging.disable();
      map.getContainer().style.cursor = 'crosshair';
    } else {
      map.dragging.enable();
      map.getContainer().style.cursor = '';
      setDragStart(null);
      setCurrentBounds(null);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSelectingRef.current) {
        onCancelSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      map.dragging.enable();
      map.getContainer().style.cursor = '';
    };
  }, [isSelecting, map, onCancelSelection]);

  // Mouse event handlers for click-and-drag box drawing
  useEffect(() => {
    if (!isSelecting) return;

    const handleMouseDown = (e: L.LeafletMouseEvent) => {
      // Primary button only
      if (e.originalEvent.button !== 0) return;
      L.DomEvent.stopPropagation(e.originalEvent);
      setDragStart(e.latlng);
      setCurrentBounds([
        [e.latlng.lat, e.latlng.lng],
        [e.latlng.lat, e.latlng.lng],
      ]);
    };

    const handleMouseMove = (e: L.LeafletMouseEvent) => {
      if (!dragStartRef.current) return;
      L.DomEvent.stopPropagation(e.originalEvent);
      const start = dragStartRef.current;
      const current = e.latlng;

      const minLat = Math.min(start.lat, current.lat);
      const maxLat = Math.max(start.lat, current.lat);
      const minLon = Math.min(start.lng, current.lng);
      const maxLon = Math.max(start.lng, current.lng);

      setCurrentBounds([
        [minLat, minLon],
        [maxLat, maxLon],
      ]);
    };

    const handleMouseUp = (e: L.LeafletMouseEvent) => {
      if (!dragStartRef.current) return;
      L.DomEvent.stopPropagation(e.originalEvent);
      const start = dragStartRef.current;
      const end = e.latlng;

      const minLat = Math.min(start.lat, end.lat);
      const maxLat = Math.max(start.lat, end.lat);
      const minLon = Math.min(start.lng, end.lng);
      const maxLon = Math.max(start.lng, end.lng);

      // Check for minimum meaningful rectangle size (at least ~0.02 deg)
      if (Math.abs(maxLat - minLat) >= 0.02 && Math.abs(maxLon - minLon) >= 0.02) {
        const roundedBbox: [number, number, number, number] = [
          parseFloat(minLon.toFixed(4)),
          parseFloat(minLat.toFixed(4)),
          parseFloat(maxLon.toFixed(4)),
          parseFloat(maxLat.toFixed(4)),
        ];
        onAoiComplete(roundedBbox);
      } else {
        // Accidental single click or tiny drag -> cancel drag state
        setDragStart(null);
        setCurrentBounds(null);
      }
    };

    map.on('mousedown', handleMouseDown);
    map.on('mousemove', handleMouseMove);
    map.on('mouseup', handleMouseUp);

    return () => {
      map.off('mousedown', handleMouseDown);
      map.off('mousemove', handleMouseMove);
      map.off('mouseup', handleMouseUp);
    };
  }, [isSelecting, map, onAoiComplete]);

  // Selected AOI leaflet bounds
  const persistentAoiBounds = selectedAoi
    ? ([
        [selectedAoi[1], selectedAoi[0]],
        [selectedAoi[3], selectedAoi[2]],
      ] as [[number, number], [number, number]])
    : null;

  return (
    <>
      {/* 1. Live Dragging Preview Box */}
      {isSelecting && currentBounds && (
        <Rectangle
          bounds={currentBounds}
          pathOptions={{
            color: '#00F0FF',
            weight: 2,
            dashArray: '4, 4',
            fillColor: '#00F0FF',
            fillOpacity: 0.18,
          }}
        >
          <Tooltip direction="top" opacity={1} permanent className="tactical-tooltip">
            <div className="bg-[#080C14]/95 border border-cyan-400 px-2 py-1 rounded text-[10px] font-mono text-cyan-300 shadow-xl backdrop-blur-md">
              DRAGGING AOI EXTENT...
            </div>
          </Tooltip>
        </Rectangle>
      )}

      {/* 2. Persistent Selected AOI Boundary */}
      {!isSelecting && persistentAoiBounds && (
        <Rectangle
          bounds={persistentAoiBounds}
          pathOptions={{
            color: '#00F0FF',
            weight: 2.5,
            dashArray: '6, 6',
            fillColor: '#00F0FF',
            fillOpacity: 0.1,
          }}
        >
          <Tooltip direction="top" opacity={1} className="tactical-tooltip">
            <div className="bg-[#080C14]/95 border border-cyan-400/80 px-2.5 py-1.5 rounded-lg text-xs font-mono text-white shadow-2xl backdrop-blur-md space-y-0.5">
              <div className="text-[10px] font-bold text-cyan-300 uppercase flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping inline-block" />
                SELECTED AREA OF INTEREST (AOI)
              </div>
              <div className="text-[10px] text-zinc-300">
                WGS84: [{selectedAoi?.join(', ')}]
              </div>
            </div>
          </Tooltip>
        </Rectangle>
      )}
    </>
  );
};

export default AoiSelectionLayer;
