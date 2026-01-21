/** useFactoryLogStream hook (PR-102) - SSE log stream for factory run */
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { LogLine } from "@/components/factory/factory-live-console";

interface UseLogStreamReturn {
  lines: LogLine[];
  connected: boolean;
  error: string | null;
}

export function useFactoryLogStream(
  projectId: string,
  runId: string,
  enabled = true
): UseLogStreamReturn {
  const [lines, setLines] = useState<LogLine[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setConnected(false);
      return;
    }

    const url = "/api/projects/" + projectId + "/factory/runs/" + runId + "/stream";
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setConnected(true);
      setError(null);
    };

    eventSource.addEventListener("log", (event) => {
      try {
        const logLine = JSON.parse(event.data) as LogLine;
        setLines((prev) => [...prev.slice(-499), logLine]);
      } catch {
        // Ignore parse errors
      }
    });

    eventSource.onerror = () => {
      setConnected(false);
      setError("Connection lost");
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [projectId, runId, enabled]);

  return { lines, connected, error };
}
