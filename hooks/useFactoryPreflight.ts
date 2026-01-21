/** useFactoryPreflight Hook (PR-101) - Run preflight checks before factory start */
"use client";

import { useState, useCallback } from "react";
import type { PreflightDisplayResult } from "@/components/factory/factory-preflight-panel";

interface UseFactoryPreflightReturn {
  result: PreflightDisplayResult | null;
  isRunning: boolean;
  runPreflight: (projectId: string, maxParallel: number) => Promise<PreflightDisplayResult>;
  clear: () => void;
}

export function useFactoryPreflight(): UseFactoryPreflightReturn {
  const [result, setResult] = useState<PreflightDisplayResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runPreflight = useCallback(async (projectId: string, maxParallel: number) => {
    setIsRunning(true);
    setResult(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/factory/preflight`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxParallel }),
      });

      const data = await res.json();
      setResult(data);
      return data;
    } catch (err) {
      const errorResult: PreflightDisplayResult = {
        ok: false,
        errorCode: "FACTORY_PREFLIGHT_FAILED",
        errorMessage: err instanceof Error ? err.message : "Preflight request failed",
        checks: [],
      };
      setResult(errorResult);
      return errorResult;
    } finally {
      setIsRunning(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResult(null);
  }, []);

  return { result, isRunning, runPreflight, clear };
}
