/** useFactoryColumnStart Hook (PR-105) - Start factory run from column */
"use client";

import { useState, useCallback } from "react";

export interface UseFactoryColumnStartOptions {
  projectId: string;
  maxParallel?: number;
  agentProfileId?: string;
}

export interface UseFactoryColumnStartReturn {
  isLoading: boolean;
  error: string | null;
  runId: string | null;
  startColumnRun: (columnStatus: string) => Promise<{ ok: boolean; runId?: string }>;
  reset: () => void;
}

export function useFactoryColumnStart({
  projectId,
  maxParallel = 3,
  agentProfileId,
}: UseFactoryColumnStartOptions): UseFactoryColumnStartReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);

  const startColumnRun = useCallback(
    async (columnStatus: string): Promise<{ ok: boolean; runId?: string }> => {
      setIsLoading(true);
      setError(null);

      try {
        const body: Record<string, unknown> = {
          source: "column",
          columnStatus,
          maxParallel,
        };

        if (agentProfileId) {
          body.agentProfileId = agentProfileId;
        }

        const response = await fetch(`/api/projects/${projectId}/factory/start-batch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Unknown error");
          setRunId(null);
          return { ok: false };
        }

        setRunId(data.runId);
        return { ok: true, runId: data.runId };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        setRunId(null);
        return { ok: false };
      } finally {
        setIsLoading(false);
      }
    },
    [projectId, maxParallel, agentProfileId]
  );

  const reset = useCallback(() => {
    setError(null);
    setRunId(null);
  }, []);

  return {
    isLoading,
    error,
    runId,
    startColumnRun,
    reset,
  };
}
