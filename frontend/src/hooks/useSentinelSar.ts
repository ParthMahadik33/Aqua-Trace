'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Sentinel1Metadata,
  LatestAcquisitionResponse,
  SarImageMetadata,
  AoiCoverageStatus,
} from '@/types/sentinel';
import {
  getSarSectorName,
  formatUtcAcquisition,
  bboxToLeafletBounds,
  IdentifiedSector,
} from '@/utils/geoUtils';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export interface UseSentinelSarReturn {
  imageUrl: string | null;
  metadata: Sentinel1Metadata | null;
  imageHeaders: SarImageMetadata | null;
  activeAoiBbox: [number, number, number, number] | null;
  processedBbox: [number, number, number, number] | null;
  leafletBounds: [[number, number], [number, number]] | null;
  aoiLeafletBounds: [[number, number], [number, number]] | null;
  identifiedSector: IdentifiedSector;
  formattedAcquisitionTime: string;
  isLoading: boolean;
  isImageLoading: boolean;
  coverageStatus: AoiCoverageStatus;
  coverageMessage: string | null;
  error: string | null;
  lastUpdated: Date | null;
  checkAoiCoverage: (bbox: [number, number, number, number]) => Promise<void>;
  fetchSarImage: (bbox?: [number, number, number, number], width?: number, height?: number) => Promise<void>;
  resetToDefaultCoverage: () => void;
  refetch: () => Promise<void>;
}

export function useSentinelSar(autoFetch: boolean = true): UseSentinelSarReturn {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<Sentinel1Metadata | null>(null);
  const [imageHeaders, setImageHeaders] = useState<SarImageMetadata | null>(null);
  const [activeAoiBbox, setActiveAoiBbox] = useState<[number, number, number, number] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isImageLoading, setIsImageLoading] = useState<boolean>(false);
  const [coverageStatus, setCoverageStatus] = useState<AoiCoverageStatus>('IDLE');
  const [coverageMessage, setCoverageMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Keep reference to active Object URL for reliable memory cleanup
  const currentObjectUrlRef = useRef<string | null>(null);

  const cleanupObjectUrl = useCallback(() => {
    if (currentObjectUrlRef.current) {
      URL.revokeObjectURL(currentObjectUrlRef.current);
      currentObjectUrlRef.current = null;
    }
  }, []);

  // Fetch metadata and render default SAR imagery
  const fetchDefaultSar = useCallback(async () => {
    setIsLoading(true);
    setIsImageLoading(true);
    setError(null);
    setCoverageStatus('CHECKING');
    setCoverageMessage('Scanning Sentinel-1 catalogue for demonstration sector...');

    try {
      // 1. Metadata check
      const metaRes = await fetch(`${BACKEND_URL}/api/copernicus/sentinel1/latest`);
      if (!metaRes.ok) {
        const errJson = await metaRes.json().catch(() => ({}));
        throw new Error(errJson.error || errJson.message || `Metadata fetch failed (HTTP ${metaRes.status})`);
      }
      const metaData: LatestAcquisitionResponse = await metaRes.json();
      if (!metaData.success || !metaData.product) {
        setCoverageStatus('NO_COVERAGE');
        setCoverageMessage(metaData.error || metaData.message || 'No recent Sentinel-1 acquisitions found');
        return;
      }
      setMetadata(metaData.product);
      setCoverageStatus('AVAILABLE');
      setCoverageMessage('Sentinel-1 SAR acquisition confirmed.');

      // 2. Fetch binary PNG image
      const imageRes = await fetch(`${BACKEND_URL}/api/copernicus/sentinel1/image?width=600&height=600`);
      if (!imageRes.ok) {
        const errJson = await imageRes.json().catch(() => ({}));
        throw new Error(errJson.error || `SAR image processing failed (HTTP ${imageRes.status})`);
      }

      // Parse headers
      const sarBbox = imageRes.headers.get('X-AquaTrace-SAR-BBox');
      const reqBbox = imageRes.headers.get('X-AquaTrace-SAR-RequestedBBox');
      const prodBbox = imageRes.headers.get('X-AquaTrace-SAR-ProductBBox');
      const timeRange = imageRes.headers.get('X-AquaTrace-SAR-TimeRange') || undefined;
      const productId = imageRes.headers.get('X-AquaTrace-SAR-ProductId') || undefined;

      const parseBbox = (headerVal: string | null): [number, number, number, number] | undefined => {
        if (!headerVal) return undefined;
        const parts = headerVal.split(',').map((n) => parseFloat(n.trim()));
        return parts.length === 4 ? (parts as [number, number, number, number]) : undefined;
      };

      setImageHeaders({
        processedBbox: parseBbox(sarBbox),
        requestedBbox: parseBbox(reqBbox),
        productBbox: parseBbox(prodBbox),
        timeRange,
        productId,
      });

      const blob = await imageRes.blob();
      if (blob.size === 0) {
        throw new Error('Received empty SAR image payload from server');
      }

      cleanupObjectUrl();
      const newObjectUrl = URL.createObjectURL(blob);
      currentObjectUrlRef.current = newObjectUrl;
      setImageUrl(newObjectUrl);
      setLastUpdated(new Date());
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error during SAR surveillance query';
      console.error('[useSentinelSar] Error:', errMsg);
      setError(errMsg);
      setCoverageStatus('ERROR');
      setCoverageMessage(errMsg);
    } finally {
      setIsLoading(false);
      setIsImageLoading(false);
    }
  }, [cleanupObjectUrl]);

  // Step 1 of AOI Workflow: Check coverage for drawn bounding box
  const checkAoiCoverage = useCallback(
    async (bbox: [number, number, number, number]) => {
      setActiveAoiBbox(bbox);
      setIsLoading(true);
      setError(null);
      setCoverageStatus('CHECKING');
      setCoverageMessage('Querying Copernicus Sentinel-1 Catalog for selected AOI...');
      // Clear previous image when testing a new AOI
      cleanupObjectUrl();
      setImageUrl(null);
      setImageHeaders(null);

      try {
        const bboxParam = bbox.join(',');
        const res = await fetch(`${BACKEND_URL}/api/copernicus/sentinel1/latest?bbox=${bboxParam}&days=60`);
        const data: LatestAcquisitionResponse = await res.json();

        if (res.status === 404 || !data.success || !data.product) {
          setMetadata(null);
          setCoverageStatus('NO_COVERAGE');
          setCoverageMessage(
            data.error ||
              data.message ||
              'No Sentinel-1 SAR acquisition found covering the selected AOI within the 60-day observation window.'
          );
          return;
        }

        setMetadata(data.product);
        setCoverageStatus('AVAILABLE');
        setCoverageMessage('Sentinel-1 SAR acquisition footprint confirmed over selected AOI.');
        setLastUpdated(new Date());
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Failed to query Copernicus catalogue';
        setError(errMsg);
        setCoverageStatus('ERROR');
        setCoverageMessage(errMsg);
      } finally {
        setIsLoading(false);
      }
    },
    [cleanupObjectUrl]
  );

  // Step 2 of AOI Workflow: Fetch actual high-res SAR image for selected AOI or current scene
  const fetchSarImage = useCallback(
    async (bbox?: [number, number, number, number], width: number = 1024, height: number = 1024) => {
      const targetBbox = bbox || activeAoiBbox;
      setIsImageLoading(true);
      setError(null);

      try {
        let url = `${BACKEND_URL}/api/copernicus/sentinel1/image?width=${width}&height=${height}`;
        if (targetBbox) {
          url += `&bbox=${targetBbox.join(',')}`;
        }
        if (metadata?.datetime) {
          url += `&datetime=${encodeURIComponent(metadata.datetime)}`;
        }

        const res = await fetch(url);
        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          if (errJson.error_code === 'NO_SAR_COVERAGE_INTERSECTION') {
            throw new Error(
              'Selected AOI does not overlap with the available Sentinel-1 SAR acquisition footprint.'
            );
          }
          throw new Error(errJson.error || `SAR image processing failed (HTTP ${res.status})`);
        }

        // Parse response headers
        const sarBbox = res.headers.get('X-AquaTrace-SAR-BBox');
        const reqBbox = res.headers.get('X-AquaTrace-SAR-RequestedBBox');
        const prodBbox = res.headers.get('X-AquaTrace-SAR-ProductBBox');
        const timeRange = res.headers.get('X-AquaTrace-SAR-TimeRange') || undefined;
        const productId = res.headers.get('X-AquaTrace-SAR-ProductId') || undefined;

        const parseBbox = (headerVal: string | null): [number, number, number, number] | undefined => {
          if (!headerVal) return undefined;
          const parts = headerVal.split(',').map((n) => parseFloat(n.trim()));
          return parts.length === 4 ? (parts as [number, number, number, number]) : undefined;
        };

        setImageHeaders({
          processedBbox: parseBbox(sarBbox),
          requestedBbox: parseBbox(reqBbox),
          productBbox: parseBbox(prodBbox),
          timeRange,
          productId,
        });

        const blob = await res.blob();
        if (blob.size === 0) {
          throw new Error('Received empty SAR image payload');
        }

        cleanupObjectUrl();
        const newObjectUrl = URL.createObjectURL(blob);
        currentObjectUrlRef.current = newObjectUrl;
        setImageUrl(newObjectUrl);
        setLastUpdated(new Date());
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Failed to fetch SAR image';
        console.error('[fetchSarImage] Error:', errMsg);
        setError(errMsg);
      } finally {
        setIsImageLoading(false);
      }
    },
    [activeAoiBbox, metadata, cleanupObjectUrl]
  );

  const resetToDefaultCoverage = useCallback(() => {
    setActiveAoiBbox(null);
    fetchDefaultSar();
  }, [fetchDefaultSar]);

  // Initial fetch
  useEffect(() => {
    if (autoFetch) {
      fetchDefaultSar();
    }
    return () => {
      cleanupObjectUrl();
    };
  }, [autoFetch, fetchDefaultSar, cleanupObjectUrl]);

  // Derived active processed bounding box
  const processedBbox = useMemo<[number, number, number, number] | null>(() => {
    return imageHeaders?.processedBbox || metadata?.bbox || activeAoiBbox || null;
  }, [imageHeaders, metadata, activeAoiBbox]);

  const leafletBounds = useMemo(() => {
    return bboxToLeafletBounds(processedBbox);
  }, [processedBbox]);

  const aoiLeafletBounds = useMemo(() => {
    return bboxToLeafletBounds(activeAoiBbox);
  }, [activeAoiBbox]);

  const identifiedSector = useMemo(() => {
    return getSarSectorName(processedBbox);
  }, [processedBbox]);

  const formattedAcquisitionTime = useMemo(() => {
    return formatUtcAcquisition(metadata?.datetime);
  }, [metadata]);

  return {
    imageUrl,
    metadata,
    imageHeaders,
    activeAoiBbox,
    processedBbox,
    leafletBounds,
    aoiLeafletBounds,
    identifiedSector,
    formattedAcquisitionTime,
    isLoading,
    isImageLoading,
    coverageStatus,
    coverageMessage,
    error,
    lastUpdated,
    checkAoiCoverage,
    fetchSarImage,
    resetToDefaultCoverage,
    refetch: activeAoiBbox ? () => checkAoiCoverage(activeAoiBbox) : fetchDefaultSar,
  };
}
