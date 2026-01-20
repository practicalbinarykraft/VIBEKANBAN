/** useFactoryBatchStart hook (PR-87) - Batch factory start from Kanban */
import { useState, useCallback } from "react";
import type { BatchStartRequest } from "@/components/factory/factory-batch-start-panel";

interface BatchStartResult {
  runId: string;
  taskCount: number;
  started: boolean;
}

interface UseFactoryBatchStartResult {
  isStarting: boolean;
  error: string | null;
  startBatch: (projectId: string, params: BatchStartRequest) => Promise<BatchStartResult | null>;
  clearError: () => void;
}

export function useFactoryBatchStart(): UseFactoryBatchStartResult {
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startBatch = useCallback(async (
    projectId: string,
    params: BatchStartRequest
  ): Promise<BatchStartResult | null> => {
    setIsStarting(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/factory/start-batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to start batch");
        return null;
      }

      return data as BatchStartResult;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      return null;
    } finally {
      setIsStarting(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { isStarting, error, startBatch, clearError };
}
