/**
 * useAutopilotRunDetails - Hook for fetching autopilot run details (PR-75)
 * Polls when run.status === "running", stops when finished
 */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { RunDetails, RunStatus } from "@/types/autopilot-run";

interface UseAutopilotRunDetailsResult {
  run: RunDetails | null;
  isLoading: boolean;
  error: string | null;
  isRunning: boolean;
  refetch: () => void;
}

const POLL_INTERVAL = 2000;

export function useAutopilotRunDetails(runId: string | null): UseAutopilotRunDetailsResult {
  const [run, setRun] = useState<RunDetails | null>(null);
  const [isLoading, setIsLoading] = useState(runId !== null);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const isRunning = run?.status === "running";

  const fetchDetails = useCallback(async () => {
    if (!runId) return;

    try {
      const res = await fetch(`/api/autopilot/runs/${runId}`);
      if (!res.ok) {
        throw new Error("Failed to fetch run details");
      }
      const data = await res.json();
      setRun(data.run || null);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load run");
      setRun(null);
    } finally {
      setIsLoading(false);
    }
  }, [runId]);

  // Initial fetch
  useEffect(() => {
    if (runId) {
      setIsLoading(true);
      fetchDetails();
    } else {
      setRun(null);
      setIsLoading(false);
    }
  }, [runId, fetchDetails]);

  // Polling when running
  useEffect(() => {
    if (isRunning && runId) {
      pollingRef.current = setInterval(fetchDetails, POLL_INTERVAL);
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
  }, [isRunning, runId, fetchDetails]);

  const refetch = useCallback(() => {
    if (runId) {
      fetchDetails();
    }
  }, [runId, fetchDetails]);

  return {
    run,
    isLoading,
    error,
    isRunning: isRunning ?? false,
    refetch,
  };
}
