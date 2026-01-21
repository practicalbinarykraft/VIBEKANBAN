/** useFactoryRerun hook (PR-93) - Rerun failed/selected tasks from a factory run */
"use client";

import { useState, useCallback } from "react";

interface RerunResult {
  started: boolean;
  newRunId?: string;
  taskCount?: number;
  error?: string;
}

interface UseFactoryRerunReturn {
  isLoading: boolean;
  error: string | null;
  lastResult: RerunResult | null;
  rerunFailed: (params: { projectId: string; sourceRunId: string; maxParallel: number }) => Promise<RerunResult>;
  rerunSelected: (params: {
    projectId: string;
    sourceRunId: string;
    selectedTaskIds: string[];
    maxParallel: number;
  }) => Promise<RerunResult>;
}

export function useFactoryRerun(): UseFactoryRerunReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<RerunResult | null>(null);

  const rerunFailed = useCallback(
    async (params: { projectId: string; sourceRunId: string; maxParallel: number }): Promise<RerunResult> => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/projects/${params.projectId}/factory/rerun`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceRunId: params.sourceRunId,
            mode: "failed",
            maxParallel: params.maxParallel,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          const result: RerunResult = { started: false, error: data.error || "Failed to rerun" };
          setError(result.error!);
          setLastResult(result);
          return result;
        }

        const result: RerunResult = {
          started: true,
          newRunId: data.newRunId,
          taskCount: data.taskCount,
        };
        setLastResult(result);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to rerun";
        const result: RerunResult = { started: false, error: message };
        setError(message);
        setLastResult(result);
        return result;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const rerunSelected = useCallback(
    async (params: {
      projectId: string;
      sourceRunId: string;
      selectedTaskIds: string[];
      maxParallel: number;
    }): Promise<RerunResult> => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/projects/${params.projectId}/factory/rerun`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceRunId: params.sourceRunId,
            mode: "selected",
            selectedTaskIds: params.selectedTaskIds,
            maxParallel: params.maxParallel,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          const result: RerunResult = { started: false, error: data.error || "Failed to rerun" };
          setError(result.error!);
          setLastResult(result);
          return result;
        }

        const result: RerunResult = {
          started: true,
          newRunId: data.newRunId,
          taskCount: data.taskCount,
        };
        setLastResult(result);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to rerun";
        const result: RerunResult = { started: false, error: message };
        setError(message);
        setLastResult(result);
        return result;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { isLoading, error, lastResult, rerunFailed, rerunSelected };
}
