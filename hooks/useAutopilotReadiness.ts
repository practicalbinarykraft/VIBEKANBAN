/** useAutopilotReadiness Hook (PR-81) - Fetch and poll readiness state */
import { useState, useEffect, useCallback } from "react";
import type { AutopilotBlocker, AutopilotReadiness } from "@/server/services/autopilot/autopilot-readiness.service";

export type { AutopilotBlocker, AutopilotReadiness };

interface UseAutopilotReadinessResult {
  ready: boolean;
  blockers: AutopilotBlocker[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useAutopilotReadiness(projectId: string): UseAutopilotReadinessResult {
  const [ready, setReady] = useState(true);
  const [blockers, setBlockers] = useState<AutopilotBlocker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReadiness = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/planning/autopilot/readiness`);
      if (res.ok) {
        const data: AutopilotReadiness = await res.json();
        setReady(data.ready);
        setBlockers(data.blockers);
        setError(null);
      } else {
        setError("Failed to fetch readiness");
      }
    } catch { setError("Failed to fetch readiness"); }
    finally { setIsLoading(false); }
  }, [projectId]);

  useEffect(() => {
    fetchReadiness();
    const interval = setInterval(fetchReadiness, 2000);
    return () => clearInterval(interval);
  }, [fetchReadiness]);

  return { ready, blockers, isLoading, error, refresh: fetchReadiness };
}
