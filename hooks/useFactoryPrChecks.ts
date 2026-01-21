/** useFactoryPrChecks hook (PR-98) - Fetch PR CI status for factory run */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { FactoryPrCheckSnapshot } from "@/server/services/factory/factory-pr-checks.service";

interface UseFactoryPrChecksReturn {
  data: FactoryPrCheckSnapshot[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const POLL_INTERVAL = 10000; // 10 seconds

export function useFactoryPrChecks(runId: string | null): UseFactoryPrChecksReturn {
  const [data, setData] = useState<FactoryPrCheckSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const fetchChecks = useCallback(async () => {
    if (!runId) return;

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    try {
      setLoading(true);
      const res = await fetch(`/api/factory/runs/${runId}/pr-checks`, {
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        throw new Error("Failed to fetch PR checks");
      }

      const json = await res.json();
      setData(json.items || []);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Failed to fetch PR checks");
    } finally {
      setLoading(false);
    }
  }, [runId]);

  useEffect(() => {
    if (!runId) {
      setData([]);
      return;
    }

    fetchChecks();

    // Setup polling
    pollingRef.current = setInterval(fetchChecks, POLL_INTERVAL);

    return () => {
      if (abortRef.current) abortRef.current.abort();
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [fetchChecks, runId]);

  return { data, loading, error, refresh: fetchChecks };
}

/**
 * Get check status for a specific task from the cached data
 */
export function getTaskCheckStatus(
  checks: FactoryPrCheckSnapshot[],
  taskId: string
): FactoryPrCheckSnapshot | undefined {
  return checks.find((c) => c.taskId === taskId);
}
