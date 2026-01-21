/** useFactoryRunMetrics hook (PR-94) - Fetch factory run timeline + throughput */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface TimelineBucket {
  t: string;
  started: number;
  completed: number;
  failed: number;
}

export interface FactoryRunMetrics {
  runId: string;
  counts: {
    total: number;
    completed: number;
    failed: number;
    running: number;
    queued: number;
  };
  durationsSec: {
    avg: number | null;
    p50: number | null;
    p90: number | null;
  };
  throughput: {
    completedPerMinute: number;
    windowStart: string | null;
    windowEnd: string | null;
  };
  timeline: TimelineBucket[];
}

interface UseFactoryRunMetricsReturn {
  data: FactoryRunMetrics | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const POLL_INTERVAL = 2000;

export function useFactoryRunMetrics(
  projectId: string,
  runId: string,
  isRunning: boolean
): UseFactoryRunMetricsReturn {
  const [data, setData] = useState<FactoryRunMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchMetrics = useCallback(async () => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    try {
      const res = await fetch(`/api/projects/${projectId}/factory/runs/${runId}/metrics`, {
        signal: abortRef.current.signal,
      });
      if (!res.ok) {
        throw new Error("Failed to fetch metrics");
      }
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      const message = err instanceof Error ? err.message : "Failed to fetch metrics";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [projectId, runId]);

  useEffect(() => {
    setLoading(true);
    fetchMetrics();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchMetrics]);

  useEffect(() => {
    if (isRunning) {
      pollingRef.current = setInterval(fetchMetrics, POLL_INTERVAL);
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [isRunning, fetchMetrics]);

  return { data, loading, error, refetch: fetchMetrics };
}
