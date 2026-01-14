/**
 * usePlanningPipeline - Hook for approve-and-run pipeline
 *
 * State machine: IDLE -> APPLYING -> EXECUTING -> PIPELINE_DONE
 * Error states: APPLY_FAILED / EXECUTE_FAILED with retry
 */

"use client";

import { useState, useCallback } from "react";

export type PipelinePhase =
  | "IDLE"
  | "APPLYING"
  | "EXECUTING"
  | "PIPELINE_DONE"
  | "APPLY_FAILED"
  | "EXECUTE_FAILED";

interface UsePlanningPipelineOptions {
  projectId: string;
  sessionId: string | null;
  onComplete?: (createdTaskIds: string[]) => void;
  onStatusChange?: (status: "APPLIED") => void;
}

interface UsePlanningPipelineReturn {
  pipelinePhase: PipelinePhase;
  pipelineError: string | null;
  handleApproveAndRun: () => Promise<void>;
  handleRetryApply: () => Promise<void>;
  handleRetryExecute: () => Promise<void>;
}

export function usePlanningPipeline({
  projectId,
  sessionId,
  onComplete,
  onStatusChange,
}: UsePlanningPipelineOptions): UsePlanningPipelineReturn {
  const [pipelinePhase, setPipelinePhase] = useState<PipelinePhase>("IDLE");
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [lastCreatedTaskIds, setLastCreatedTaskIds] = useState<string[]>([]);

  // Internal: apply step
  const applyPlanInternal = useCallback(async (): Promise<string[]> => {
    const response = await fetch(`/api/projects/${projectId}/planning/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Failed to apply plan");
    }
    return data.taskIds ?? data.createdTaskIds ?? [];
  }, [sessionId, projectId]);

  // Full pipeline: Apply -> Execute
  const runPipeline = useCallback(
    async (skipApply = false) => {
      setPipelineError(null);

      try {
        let createdTaskIds = lastCreatedTaskIds;

        if (!skipApply) {
          setPipelinePhase("APPLYING");
          createdTaskIds = await applyPlanInternal();
          setLastCreatedTaskIds(createdTaskIds);
          onStatusChange?.("APPLIED");
        }

        setPipelinePhase("EXECUTING");
        onComplete?.(createdTaskIds);
        setPipelinePhase("PIPELINE_DONE");
      } catch (err: any) {
        setPipelineError(err.message || "An error occurred");
        setPipelinePhase(skipApply ? "EXECUTE_FAILED" : "APPLY_FAILED");
      }
    },
    [applyPlanInternal, onComplete, onStatusChange, lastCreatedTaskIds]
  );

  const handleApproveAndRun = useCallback(async () => {
    if (!sessionId) return;
    await runPipeline(false);
  }, [sessionId, runPipeline]);

  const handleRetryApply = useCallback(async () => {
    if (!sessionId) return;
    await runPipeline(false);
  }, [sessionId, runPipeline]);

  const handleRetryExecute = useCallback(async () => {
    if (lastCreatedTaskIds.length === 0) return;
    await runPipeline(true);
  }, [lastCreatedTaskIds, runPipeline]);

  return {
    pipelinePhase,
    pipelineError,
    handleApproveAndRun,
    handleRetryApply,
    handleRetryExecute,
  };
}
