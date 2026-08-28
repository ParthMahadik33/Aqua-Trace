'use client';

import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Vessel, ConnectionStatus, SystemStatusPayload, ShipCategory } from '@/types/vessel';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export function useAisSocket() {
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('CONNECTING');
  const [systemStatus, setSystemStatus] = useState<SystemStatusPayload | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Fetch initial snapshot from REST endpoint immediately
  const fetchInitialSnapshot = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/ships`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.vessels)) {
          setVessels(data.vessels);
          setLastUpdateTime(new Date());
        }
      }
    } catch (err) {
      console.warn('Initial REST snapshot fetch failed, waiting for WebSocket:', err);
    }
  }, []);

  useEffect(() => {
    fetchInitialSnapshot();

    // Initialize Socket.IO connection
    const socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket.IO connected to AIS backend:', socket.id);
      setConnectionStatus('LIVE');
    });

    socket.on('disconnect', (reason) => {
      console.warn('Socket.IO disconnected:', reason);
      setConnectionStatus('OFFLINE');
    });

    socket.on('connect_error', (error) => {
      console.warn('Socket.IO connection error:', error.message);
      setConnectionStatus('RECONNECTING');
    });

    socket.on('reconnect_attempt', () => {
      setConnectionStatus('RECONNECTING');
    });

    socket.on('ship_update', (data: Vessel[]) => {
      if (Array.isArray(data)) {
        setVessels(data);
        setLastUpdateTime(new Date());
      }
    });

    socket.on('status_update', (status: SystemStatusPayload) => {
      setSystemStatus(status);
      if (status.status === 'CONNECTED') {
        setConnectionStatus('LIVE');
      } else if (status.status === 'RECONNECTING' || status.status === 'CONNECTING') {
        setConnectionStatus('RECONNECTING');
      } else if (status.status === 'DISCONNECTED' || status.status === 'ERROR') {
        setConnectionStatus('OFFLINE');
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [fetchInitialSnapshot]);

  const requestSnapshot = useCallback(() => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('request_snapshot');
    } else {
      fetchInitialSnapshot();
    }
  }, [fetchInitialSnapshot]);

  const changeSector = useCallback(async (presetKey: string) => {
    // Clear local vessels immediately for clean transition
    setVessels([]);
    
    // Notify via Socket.IO
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('change_sector', { preset: presetKey });
    }

    // Also call REST fallback to ensure server registers sector change
    try {
      await fetch(`${BACKEND_URL}/api/sector`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset: presetKey }),
      });
    } catch (e) {
      console.warn('Failed to post sector change to REST endpoint:', e);
    }
  }, []);

  // Aggregate category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<ShipCategory, number> = {
      Tanker: 0,
      Cargo: 0,
      Fishing: 0,
      Passenger: 0,
      Other: 0,
      Pending: 0,
    };

    vessels.forEach((v) => {
      if (counts[v.ship_type] !== undefined) {
        counts[v.ship_type]++;
      } else {
        counts.Pending++;
      }
    });

    return counts;
  }, [vessels]);

  return {
    vessels,
    connectionStatus,
    systemStatus,
    lastUpdateTime,
    categoryCounts,
    requestSnapshot,
    changeSector,
  };
}
