/** useFactoryLogStream hook (PR-102, PR-109) - SSE log stream with auto-reconnect */
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { LogLine } from "@/components/factory/factory-live-console";

export type ConnectionStatus = "connected" | "reconnecting" | "disconnected";

export interface UseLogStreamReturn {
  lines: LogLine[];
  status: ConnectionStatus;
  error: string | null;
}

const MAX_RETRY_DELAY_MS = 10000;
const INITIAL_RETRY_DELAY_MS = 1000;
const MAX_LINES = 500;

export function useFactoryLogStream(
  projectId: string,
  runId: string,
  enabled = true
): UseLogStreamReturn {
  const [lines, setLines] = useState<LogLine[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const retryDelayRef = useRef(INITIAL_RETRY_DELAY_MS);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const cleanup = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!mountedRef.current || !enabled) return;

    // Prevent double subscription
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = `/api/projects/${projectId}/factory/runs/${runId}/stream`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      if (!mountedRef.current) return;
      setStatus("connected");
      setError(null);
      retryDelayRef.current = INITIAL_RETRY_DELAY_MS;
    };

    eventSource.addEventListener("log", (event) => {
      if (!mountedRef.current) return;
      try {
        const logLine = JSON.parse(event.data) as LogLine;
        setLines((prev) => [...prev.slice(-(MAX_LINES - 1)), logLine]);
      } catch {
        // Ignore parse errors
      }
    });

    eventSource.onerror = () => {
      if (!mountedRef.current) return;

      eventSource.close();
      eventSourceRef.current = null;

      if (!enabled) {
        setStatus("disconnected");
        return;
      }

      setStatus("reconnecting");
      setError("Connection lost, reconnecting...");

      // Exponential backoff: 1s → 2s → 4s → 8s → 10s (max)
      const delay = retryDelayRef.current;
      retryDelayRef.current = Math.min(delay * 2, MAX_RETRY_DELAY_MS);

      retryTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current && enabled) {
          connect();
        }
      }, delay);
    };
  }, [projectId, runId, enabled]);

  useEffect(() => {
    mountedRef.current = true;

    if (enabled) {
      connect();
    } else {
      cleanup();
      setStatus("disconnected");
    }

    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [projectId, runId, enabled, connect, cleanup]);

  return { lines, status, error };
}
