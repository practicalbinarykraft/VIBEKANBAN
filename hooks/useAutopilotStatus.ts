/** useAutopilotStatus Hook (PR-68) - Project-level autopilot status polling */
"use client";

import { useState, useCallback, useEffect, useRef } from "react";

export type AutopilotApiStatus = "idle" | "running" | "stopped" | "failed";

export interface AutopilotStatusData {
  enabled: boolean;
  status: AutopilotApiStatus;
  sessionId: string | null;
  currentTaskId: string | null;
  currentAttemptId: string | null;
  errorCode: string | null;
}

interface UseAutopilotStatusResult {
  enabled: boolean;
  status: AutopilotApiStatus;
  sessionId: string | null;
  currentTaskId: string | null;
  currentAttemptId: string | null;
  errorCode: string | null;
  isLoading: boolean;
  isStarting: boolean;
  isStopping: boolean;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  refresh: () => Promise<void>;
}

const POLL_INTERVAL = 2000;

export function useAutopilotStatus(projectId: string): UseAutopilotStatusResult {
  const [data, setData] = useState<AutopilotStatusData>({
    enabled: true,
    status: "idle",
    sessionId: null,
    currentTaskId: null,
    currentAttemptId: null,
    errorCode: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/planning/autopilot/status`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // Silent fail on poll
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Poll when running
  useEffect(() => {
    if (data.status === "running") {
      pollingRef.current = setInterval(fetchStatus, POLL_INTERVAL);
    } else if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [data.status, fetchStatus]);

  const start = useCallback(async () => {
    if (!data.sessionId) return;
    setIsStarting(true);
    try {
      await fetch(`/api/projects/${projectId}/planning/autopilot/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: data.sessionId, mode: "AUTO" }),
      });
      await fetchStatus();
    } finally {
      setIsStarting(false);
    }
  }, [projectId, data.sessionId, fetchStatus]);

  const stop = useCallback(async () => {
    if (!data.sessionId) return;
    setIsStopping(true);
    try {
      await fetch(`/api/projects/${projectId}/planning/autopilot/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: data.sessionId }),
      });
      await fetchStatus();
    } finally {
      setIsStopping(false);
    }
  }, [projectId, data.sessionId, fetchStatus]);

  return {
    enabled: data.enabled,
    status: data.status,
    sessionId: data.sessionId,
    currentTaskId: data.currentTaskId,
    currentAttemptId: data.currentAttemptId,
    errorCode: data.errorCode,
    isLoading,
    isStarting,
    isStopping,
    start,
    stop,
    refresh: fetchStatus,
  };
}
