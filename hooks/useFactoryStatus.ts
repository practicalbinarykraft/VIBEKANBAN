/** useFactoryStatus Hook (PR-83) - Factory status polling and controls */
import { useState, useEffect, useCallback } from "react";
import type { FactoryStatus } from "@/server/services/factory/factory-status.service";

export type { FactoryStatus };

interface UseFactoryStatusResult extends FactoryStatus {
  isLoading: boolean;
  error: string | null;
  isStarting: boolean;
  isStopping: boolean;
  start: (maxParallel: number) => Promise<void>;
  stop: () => Promise<void>;
  refresh: () => void;
}

const defaultStatus: FactoryStatus = {
  hasRun: false, runId: null, status: "idle",
  total: 0, completed: 0, failed: 0, cancelled: 0, running: 0, queued: 0,
};

export function useFactoryStatus(projectId: string): UseFactoryStatusResult {
  const [status, setStatus] = useState<FactoryStatus>(defaultStatus);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/factory/status`);
      if (res.ok) {
        const data: FactoryStatus = await res.json();
        setStatus(data);
        setError(null);
      } else { setError("Failed to fetch status"); }
    } catch { setError("Failed to fetch status"); }
    finally { setIsLoading(false); }
  }, [projectId]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const start = useCallback(async (maxParallel: number) => {
    setIsStarting(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/factory/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxParallel }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to start");
      }
      await fetchStatus();
    } catch { setError("Failed to start factory"); }
    finally { setIsStarting(false); }
  }, [projectId, fetchStatus]);

  const stop = useCallback(async () => {
    setIsStopping(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/factory/stop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to stop");
      }
      await fetchStatus();
    } catch { setError("Failed to stop factory"); }
    finally { setIsStopping(false); }
  }, [projectId, fetchStatus]);

  return { ...status, isLoading, error, isStarting, isStopping, start, stop, refresh: fetchStatus };
}
