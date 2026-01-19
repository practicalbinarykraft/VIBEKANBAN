/**
 * useAttemptsList - Hook for fetching project attempts (PR-63)
 * Polls when there are running attempts
 */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { AttemptStatus } from "@/server/services/attempts/attempt-runner.types";

export interface AttemptListItem {
  id: string;
  taskId: string;
  status: AttemptStatus;
  startedAt: string | null;
  finishedAt: string | null;
  exitCode: number | null;
  agent?: string;
}

interface UseAttemptsListResult {
  attempts: AttemptListItem[];
  isLoading: boolean;
  error: string | null;
  hasRunning: boolean;
  refetch: () => void;
}

const POLL_INTERVAL = 3000;

export function useAttemptsList(projectId: string, limit = 20): UseAttemptsListResult {
  const [attempts, setAttempts] = useState<AttemptListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const hasRunning = attempts.some(
    (a) => a.status === "running" || a.status === "queued"
  );

  const fetchAttempts = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/attempts?limit=${limit}`);
      if (!res.ok) {
        throw new Error("Failed to fetch attempts");
      }
      const data = await res.json();
      setAttempts(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load attempts");
      setAttempts([]);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, limit]);

  // Initial fetch
  useEffect(() => {
    setIsLoading(true);
    fetchAttempts();
  }, [fetchAttempts]);

  // Polling when running
  useEffect(() => {
    if (hasRunning) {
      pollingRef.current = setInterval(fetchAttempts, POLL_INTERVAL);
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
  }, [hasRunning, fetchAttempts]);

  const refetch = useCallback(() => {
    fetchAttempts();
  }, [fetchAttempts]);

  return {
    attempts,
    isLoading,
    error,
    hasRunning,
    refetch,
  };
}
