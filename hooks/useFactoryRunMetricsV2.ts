/** useFactoryRunMetricsV2 hook (PR-95) - Fetch factory run metrics with auto-stop polling */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { FactoryRunMetricsV2 } from "@/server/services/factory/factory-run-metrics-v2.service";

interface UseFactoryRunMetricsV2Return {
  data: FactoryRunMetricsV2 | null;
  loading: boolean;
  error: string | null;
}

const POLL_INTERVAL = 2000;

export function useFactoryRunMetricsV2(runId: string): UseFactoryRunMetricsV2Return {
  const [data, setData] = useState<FactoryRunMetricsV2 | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const isFinishedRef = useRef(false);

  const fetchMetrics = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    try {
      const res = await fetch(`/api/factory/runs/${runId}/metrics`, {
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        throw new Error("Failed to fetch metrics");
      }

      const json: FactoryRunMetricsV2 = await res.json();
      setData(json);
      setError(null);

      // Check if run is finished to stop polling
      if (json.finishedAtISO) {
        isFinishedRef.current = true;
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Failed to fetch metrics");
    } finally {
      setLoading(false);
    }
  }, [runId]);

  useEffect(() => {
    setLoading(true);
    isFinishedRef.current = false;
    fetchMetrics();

    // Setup polling
    pollingRef.current = setInterval(() => {
      if (!isFinishedRef.current) {
        fetchMetrics();
      }
    }, POLL_INTERVAL);

    return () => {
      if (abortRef.current) abortRef.current.abort();
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [fetchMetrics]);

  return { data, loading, error };
}
