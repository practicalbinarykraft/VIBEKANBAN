/** useFactoryStream Hook (PR-84) - SSE connection for factory console */
import { useState, useEffect, useCallback, useRef } from "react";
import type { FactoryEvent } from "@/server/services/factory/factory-events.service";

export interface AttemptState {
  attemptId: string;
  taskId: string;
  status: string;
  lastLogLine: string | null;
}

interface UseFactoryStreamResult {
  isConnected: boolean;
  runId: string | null;
  runStatus: string | null;
  attempts: Map<string, AttemptState>;
  counts: { total: number; completed: number; failed: number; cancelled: number; running: number; queued: number } | null;
}

const RECONNECT_DELAY_MS = 5000;

export function useFactoryStream(projectId: string): UseFactoryStreamResult {
  const [isConnected, setIsConnected] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [runStatus, setRunStatus] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<Map<string, AttemptState>>(new Map());
  const [counts, setCounts] = useState<UseFactoryStreamResult["counts"]>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEvent = useCallback((event: FactoryEvent) => {
    switch (event.type) {
      case "run":
        setRunId(event.runId);
        setRunStatus(event.status);
        break;
      case "attempt":
        setAttempts((prev) => {
          const next = new Map(prev);
          const existing = next.get(event.attemptId);
          next.set(event.attemptId, {
            attemptId: event.attemptId, taskId: event.taskId, status: event.status,
            lastLogLine: existing?.lastLogLine ?? null,
          });
          return next;
        });
        break;
      case "log":
        setAttempts((prev) => {
          const next = new Map(prev);
          const existing = next.get(event.attemptId);
          if (existing) next.set(event.attemptId, { ...existing, lastLogLine: event.line });
          return next;
        });
        break;
      case "summary":
        setCounts(event.counts);
        break;
    }
  }, []);

  const connect = useCallback(() => {
    if (eventSourceRef.current) eventSourceRef.current.close();

    const es = new EventSource(`/api/projects/${projectId}/factory/stream`);
    eventSourceRef.current = es;

    es.onopen = () => setIsConnected(true);
    es.onmessage = (e) => {
      try {
        const event: FactoryEvent = JSON.parse(e.data);
        handleEvent(event);
      } catch { /* ignore parse errors */ }
    };
    es.onerror = () => {
      setIsConnected(false);
      es.close();
      reconnectTimeoutRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
    };
  }, [projectId, handleEvent]);

  useEffect(() => {
    connect();
    return () => {
      if (eventSourceRef.current) eventSourceRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [connect]);

  return { isConnected, runId, runStatus, attempts, counts };
}
