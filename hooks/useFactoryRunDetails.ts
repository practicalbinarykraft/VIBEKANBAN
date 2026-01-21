/** useFactoryRunDetails hook (PR-91) - Fetch factory run details */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface FactoryRunAttempt {
  id: string;
  taskId: string;
  status: string;
  prUrl: string | null;
  updatedAt: string;
}

export interface FactoryRunCounts {
  total: number;
  completed: number;
  failed: number;
  running: number;
  queued: number;
}

export interface FactoryRunDetails {
  id: string;
  projectId: string;
  status: "running" | "completed" | "failed" | "cancelled";
  mode: "column" | "selection";
  maxParallel: number;
  selectedTaskIds: string[] | null;
  columnId: string | null;
  startedAt: string;
  finishedAt: string | null;
  error: string | null;
  counts: FactoryRunCounts;
  attempts: FactoryRunAttempt[];
}

interface UseFactoryRunDetailsReturn {
  run: FactoryRunDetails | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const POLL_INTERVAL = 2000;

export function useFactoryRunDetails(projectId: string, runId: string): UseFactoryRunDetailsReturn {
  const [run, setRun] = useState<FactoryRunDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchDetails = useCallback(async () => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    try {
      const res = await fetch(`/api/projects/${projectId}/factory/runs/${runId}`, {
        signal: abortRef.current.signal,
      });
      if (!res.ok) {
        throw new Error("Failed to fetch run details");
      }
      const data = await res.json();
      setRun(data);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      const message = err instanceof Error ? err.message : "Failed to fetch run details";
      setError(message);
      setRun(null);
    } finally {
      setLoading(false);
    }
  }, [projectId, runId]);

  useEffect(() => {
    setLoading(true);
    fetchDetails();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchDetails]);

  useEffect(() => {
    const isRunning = run?.status === "running";
    if (isRunning) {
      pollingRef.current = setInterval(fetchDetails, POLL_INTERVAL);
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [run?.status, fetchDetails]);

  return { run, loading, error, refetch: fetchDetails };
}
