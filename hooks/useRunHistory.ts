/** useRunHistory Hook (PR-67) - Fetch and manage run history */
import { useState, useEffect, useCallback } from "react";
import type { RunSummary, RunDetails } from "@/types/autopilot-run";

interface UseRunHistoryResult {
  runs: RunSummary[];
  isLoading: boolean;
  selectedRun: RunDetails | null;
  selectedRunLoading: boolean;
  stoppingRunId: string | undefined;
  selectRun: (runId: string) => void;
  closeDetails: () => void;
  stopRun: (runId: string) => void;
  refresh: () => void;
}

export function useRunHistory(projectId: string): UseRunHistoryResult {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState<RunDetails | null>(null);
  const [selectedRunLoading, setSelectedRunLoading] = useState(false);
  const [stoppingRunId, setStoppingRunId] = useState<string | undefined>(undefined);

  const fetchRuns = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/autopilot/runs`);
      if (res.ok) {
        const data = await res.json();
        setRuns(data.runs || []);
      }
    } catch {
      // Ignore errors silently
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  const selectRun = useCallback(async (runId: string) => {
    setSelectedRunLoading(true);
    try {
      const res = await fetch(`/api/autopilot/runs/${runId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedRun(data.run || null);
      }
    } catch {
      // Ignore errors silently
    } finally {
      setSelectedRunLoading(false);
    }
  }, []);

  const closeDetails = useCallback(() => {
    setSelectedRun(null);
  }, []);

  const stopRun = useCallback(async (runId: string) => {
    setStoppingRunId(runId);
    try {
      await fetch(`/api/autopilot/runs/${runId}/stop`, { method: "POST" });
      // Refresh runs after stop
      await fetchRuns();
    } catch {
      // Ignore errors silently
    } finally {
      setStoppingRunId(undefined);
    }
  }, [fetchRuns]);

  return {
    runs,
    isLoading,
    selectedRun,
    selectedRunLoading,
    stoppingRunId,
    selectRun,
    closeDetails,
    stopRun,
    refresh: fetchRuns,
  };
}
