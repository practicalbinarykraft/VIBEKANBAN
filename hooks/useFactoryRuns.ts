/** useFactoryRuns hook (PR-91) - Fetch factory runs list */
"use client";

import { useState, useEffect, useCallback } from "react";

export interface FactoryRunSummary {
  id: string;
  projectId: string;
  status: string;
  mode: string;
  maxParallel: number;
  startedAt: string;
  finishedAt: string | null;
  error: string | null;
}

interface UseFactoryRunsReturn {
  runs: FactoryRunSummary[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useFactoryRuns(projectId: string, limit = 5): UseFactoryRunsReturn {
  const [runs, setRuns] = useState<FactoryRunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRuns = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/factory/runs?limit=${limit}`);
      if (!res.ok) {
        throw new Error("Failed to fetch runs");
      }
      const data = await res.json();
      setRuns(data.runs);
      setError(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch runs";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [projectId, limit]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  return { runs, loading, error, refetch: fetchRuns };
}
