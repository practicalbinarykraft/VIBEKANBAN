/**
 * useAttemptDetails - Hook for fetching single attempt details (PR-63)
 * Polls when attempt is running or queued
 */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { AttemptStatus } from "@/server/services/attempts/attempt-runner.types";

export interface AttemptDetails {
  attemptId: string;
  status: AttemptStatus;
  startedAt: string | null;
  finishedAt: string | null;
  exitCode: number | null;
  error?: string | null;
}

interface UseAttemptDetailsResult {
  attempt: AttemptDetails | null;
  isLoading: boolean;
  error: string | null;
  isRunning: boolean;
  refetch: () => void;
}

const POLL_INTERVAL = 2000;

export function useAttemptDetails(
  projectId: string,
  attemptId: string | null
): UseAttemptDetailsResult {
  const [attempt, setAttempt] = useState<AttemptDetails | null>(null);
  const [isLoading, setIsLoading] = useState(attemptId !== null);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const isRunning = attempt?.status === "running" || attempt?.status === "queued";

  const fetchDetails = useCallback(async () => {
    if (!attemptId) return;

    try {
      const res = await fetch(
        `/api/projects/${projectId}/attempts/${attemptId}`
      );
      if (!res.ok) {
        throw new Error("Failed to fetch attempt details");
      }
      const data = await res.json();
      setAttempt(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load attempt");
      setAttempt(null);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, attemptId]);

  // Initial fetch
  useEffect(() => {
    if (attemptId) {
      setIsLoading(true);
      fetchDetails();
    } else {
      setAttempt(null);
      setIsLoading(false);
    }
  }, [attemptId, fetchDetails]);

  // Polling when running
  useEffect(() => {
    if (isRunning && attemptId) {
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
  }, [isRunning, attemptId, fetchDetails]);

  const refetch = useCallback(() => {
    if (attemptId) {
      fetchDetails();
    }
  }, [attemptId, fetchDetails]);

  return {
    attempt,
    isLoading,
    error,
    isRunning: isRunning ?? false,
    refetch,
  };
}
