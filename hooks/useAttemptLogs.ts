/**
 * useAttemptLogs - Hook for fetching attempt logs with pagination (PR-63)
 * Supports cursor-based loading and auto-polling when enabled
 */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface LogLine {
  timestamp: string;
  level: "info" | "warning" | "error";
  message: string;
}

interface UseAttemptLogsResult {
  lines: LogLine[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  reset: () => void;
}

const POLL_INTERVAL = 2000;
const DEFAULT_LIMIT = 50;

export function useAttemptLogs(
  projectId: string,
  attemptId: string | null,
  isRunning: boolean
): UseAttemptLogsResult {
  const [lines, setLines] = useState<LogLine[]>([]);
  const [isLoading, setIsLoading] = useState(attemptId !== null);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<number | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const initialFetchDone = useRef(false);

  const fetchLogs = useCallback(async (cursorVal?: number, append = false) => {
    if (!attemptId) return;

    try {
      const params = new URLSearchParams({ limit: String(DEFAULT_LIMIT) });
      if (cursorVal !== undefined) {
        params.set("cursor", String(cursorVal));
      }

      const res = await fetch(
        `/api/projects/${projectId}/attempts/${attemptId}/logs?${params}`
      );
      if (!res.ok) {
        throw new Error("Failed to fetch logs");
      }
      const data = await res.json();

      if (append) {
        setLines((prev) => [...prev, ...data.lines]);
      } else {
        setLines(data.lines);
      }

      setCursor(data.nextCursor);
      setHasMore(data.nextCursor !== undefined);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load logs");
      if (!append) {
        setLines([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [projectId, attemptId]);

  // Initial fetch
  useEffect(() => {
    if (attemptId) {
      initialFetchDone.current = false;
      setIsLoading(true);
      setLines([]);
      setCursor(undefined);
      fetchLogs().then(() => {
        initialFetchDone.current = true;
      });
    } else {
      setLines([]);
      setIsLoading(false);
      initialFetchDone.current = false;
    }
  }, [attemptId, fetchLogs]);

  // Polling when running
  useEffect(() => {
    if (isRunning && attemptId && initialFetchDone.current) {
      pollingRef.current = setInterval(() => {
        // Poll from current cursor to get new logs
        fetchLogs(cursor, true);
      }, POLL_INTERVAL);
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
  }, [isRunning, attemptId, cursor, fetchLogs]);

  const loadMore = useCallback(() => {
    if (hasMore && cursor !== undefined) {
      fetchLogs(cursor, true);
    }
  }, [hasMore, cursor, fetchLogs]);

  const reset = useCallback(() => {
    setLines([]);
    setCursor(undefined);
    setHasMore(false);
    setError(null);
  }, []);

  return {
    lines,
    isLoading,
    error,
    hasMore,
    loadMore,
    reset,
  };
}
