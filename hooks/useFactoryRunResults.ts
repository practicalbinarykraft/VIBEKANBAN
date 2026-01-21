/** useFactoryRunResults hook (PR-88) - Fetch factory run results with polling */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { FactoryRunResultsDTO } from "@/server/services/factory/factory-run-results.service";

interface UseFactoryRunResultsReturn {
  results: FactoryRunResultsDTO | null;
  isLoading: boolean;
  error: string | null;
  isRunning: boolean;
  refetch: () => void;
}

const POLL_INTERVAL = 2000;

export function useFactoryRunResults(
  projectId: string,
  runId: string | null
): UseFactoryRunResultsReturn {
  const [results, setResults] = useState<FactoryRunResultsDTO | null>(null);
  const [isLoading, setIsLoading] = useState(runId !== null);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const isRunning = results?.status === "running";

  const fetchResults = useCallback(async () => {
    if (!runId) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/factory/runs/${runId}/results`);
      if (!res.ok) {
        throw new Error("Failed to fetch results");
      }
      const data = await res.json();
      setResults(data);
      setError(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch results";
      setError(message);
      setResults(null);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, runId]);

  // Initial fetch
  useEffect(() => {
    if (runId) {
      setIsLoading(true);
      fetchResults();
    } else {
      setResults(null);
      setIsLoading(false);
    }
  }, [runId, fetchResults]);

  // Polling when running
  useEffect(() => {
    if (isRunning && runId) {
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
  }, [isRunning, runId, fetchResults]);

  const refetch = useCallback(() => {
    if (runId) {
      fetchResults();
    }
  }, [runId, fetchResults]);

  return {
    results,
    isLoading,
    error,
    isRunning: isRunning ?? false,
    refetch,
  };
}
