/** useFactoryResults hook (PR-89) - Fetch latest factory run results with polling */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { FactoryResultsResponse } from "@/server/services/factory/factory-results.service";

interface UseFactoryResultsReturn {
  data: FactoryResultsResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const POLL_INTERVAL = 2000;

export function useFactoryResults(projectId: string): UseFactoryResultsReturn {
  const [data, setData] = useState<FactoryResultsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchResults = useCallback(async () => {
    // Abort any in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    try {
      const res = await fetch(`/api/projects/${projectId}/factory/results`, {
        signal: abortRef.current.signal,
      });
      if (!res.ok) {
        throw new Error("Failed to fetch factory results");
      }
      const result = await res.json();
      setData(result);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        return; // Ignore abort errors
      }
      const message = err instanceof Error ? err.message : "Failed to fetch factory results";
      setError(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Initial fetch
  useEffect(() => {
    setLoading(true);
    fetchResults();

    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [fetchResults]);

  // Polling when status is running
  useEffect(() => {
    const isRunning = data?.status === "running";

    if (isRunning) {
      pollingRef.current = setInterval(fetchResults, POLL_INTERVAL);
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [data?.status, fetchResults]);

  const refetch = useCallback(() => {
    fetchResults();
  }, [fetchResults]);

  return { data, loading, error, refetch };
}
