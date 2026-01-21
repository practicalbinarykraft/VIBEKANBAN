/** useAttemptSummary hook (PR-90) - Fetch attempt summary with polling */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { AttemptSummaryResponse } from "@/server/services/attempts/attempt-summary.service";

interface UseAttemptSummaryReturn {
  data: AttemptSummaryResponse | null;
  loading: boolean;
  error: string | null;
}

const POLL_INTERVAL = 2000;

export function useAttemptSummary(attemptId: string | null): UseAttemptSummaryReturn {
  const [data, setData] = useState<AttemptSummaryResponse | null>(null);
  const [loading, setLoading] = useState(attemptId !== null);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchSummary = useCallback(async () => {
    if (!attemptId) return;

    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    try {
      const res = await fetch(`/api/attempts/${attemptId}/summary`, {
        signal: abortRef.current.signal,
      });
      if (!res.ok) {
        throw new Error("Failed to fetch attempt summary");
      }
      const result = await res.json();
      setData(result);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      const message = err instanceof Error ? err.message : "Failed to fetch attempt summary";
      setError(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [attemptId]);

  // Initial fetch
  useEffect(() => {
    if (!attemptId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchSummary();

    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [fetchSummary, attemptId]);

  // Polling when status is running or queued
  useEffect(() => {
    const isActive = data?.status === "running" || data?.status === "queued";

    if (isActive) {
      pollingRef.current = setInterval(fetchSummary, POLL_INTERVAL);
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
  }, [data?.status, fetchSummary]);

  return { data, loading, error };
}
