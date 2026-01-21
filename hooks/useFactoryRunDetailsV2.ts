/** useFactoryRunDetailsV2 hook (PR-102) - Fetch factory run details with items */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface CiStatus {
  status: "pending" | "success" | "failed" | "cancelled";
  summary: string;
}

export interface RunItem {
  taskId: string;
  taskTitle: string;
  status: "queued" | "running" | "completed" | "failed";
  attemptId: string;
  branch: string | null;
  prUrl: string | null;
  ci: CiStatus | null;
}

export interface RunInfo {
  id: string;
  projectId: string;
  status: "running" | "completed" | "failed" | "cancelled";
  startedAt: string;
  finishedAt: string | null;
  maxParallel: number;
}

export interface RunCounts {
  total: number;
  queued: number;
  running: number;
  completed: number;
  failed: number;
}

export interface RunDetailsV2 {
  run: RunInfo;
  counts: RunCounts;
  items: RunItem[];
}

interface UseRunDetailsV2Return {
  data: RunDetailsV2 | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const POLL_INTERVAL = 2000;

export function useFactoryRunDetailsV2(projectId: string, runId: string): UseRunDetailsV2Return {
  const [data, setData] = useState<RunDetailsV2 | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchDetails = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    try {
      const res = await fetch(`/api/projects/${projectId}/factory/runs/${runId}`, {
        signal: abortRef.current.signal,
      });
      if (!res.ok) throw new Error("Failed to fetch run details");
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Failed to fetch");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [projectId, runId]);

  useEffect(() => {
    setLoading(true);
    fetchDetails();
    return () => { if (abortRef.current) abortRef.current.abort(); };
  }, [fetchDetails]);

  useEffect(() => {
    const isRunning = data?.run.status === "running";
    if (isRunning) {
      pollingRef.current = setInterval(fetchDetails, POLL_INTERVAL);
    } else if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [data?.run.status, fetchDetails]);

  return { data, loading, error, refetch: fetchDetails };
}
