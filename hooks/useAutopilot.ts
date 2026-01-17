/**
 * useAutopilot - Hook for managing sequential autopilot execution
 *
 * Handles:
 * - Starting autopilot in STEP or AUTO mode
 * - Executing tasks sequentially
 * - Polling status during execution
 * - Pausing/Resuming
 * - Canceling autopilot
 */

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { AutopilotStatusInfo, AutopilotStatus, AutopilotMode } from "@/lib/autopilot-machine";
import { Batch } from "@/lib/backlog-chunker";

interface UseAutopilotReturn {
  status: AutopilotStatus;
  mode: AutopilotMode;
  currentBatch: Batch | undefined;
  batchIndex: number | undefined;
  totalBatches: number;
  progress: string;
  // Task-level info
  currentTaskId: string | undefined;
  currentTaskIndex: number;
  totalTasks: number;
  taskProgress: string;
  completedTasks: number;
  pauseReason: string | null;
  error: string | null;
  // Loading states
  isStarting: boolean;
  isApproving: boolean;
  isCanceling: boolean;
  isExecuting: boolean;
  // Actions
  start: (mode?: AutopilotMode) => Promise<void>;
  executeNext: () => Promise<void>;
  approve: () => Promise<void>;
  cancel: () => Promise<void>;
  resume: () => Promise<void>;
}

export function useAutopilot(
  projectId: string,
  sessionId: string | null,
  onBatchComplete?: (batchIndex: number, batch: Batch) => void,
  onAllComplete?: () => void,
  onTaskComplete?: (taskId: string) => void
): UseAutopilotReturn {
  const [status, setStatus] = useState<AutopilotStatus>("IDLE");
  const [mode, setMode] = useState<AutopilotMode>("OFF");
  const [currentBatch, setCurrentBatch] = useState<Batch | undefined>();
  const [batchIndex, setBatchIndex] = useState<number | undefined>();
  const [totalBatches, setTotalBatches] = useState(0);
  const [progress, setProgress] = useState("0/0");
  // Task-level state
  const [currentTaskId, setCurrentTaskId] = useState<string | undefined>();
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [totalTasks, setTotalTasks] = useState(0);
  const [taskProgress, setTaskProgress] = useState("0/0");
  const [completedTasks, setCompletedTasks] = useState(0);
  const [pauseReason, setPauseReason] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Loading states
  const [isStarting, setIsStarting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const previousStatusRef = useRef<AutopilotStatus>("IDLE");
  const previousTaskIdRef = useRef<string | undefined>(undefined);

  const updateFromStatus = useCallback((data: AutopilotStatusInfo) => {
    const prevStatus = previousStatusRef.current;
    const prevTaskId = previousTaskIdRef.current;

    setStatus(data.status);
    setMode(data.mode);
    setCurrentBatch(data.currentBatch);
    setBatchIndex(data.batchIndex);
    setTotalBatches(data.totalBatches);
    setProgress(data.progress);
    // Task-level
    setCurrentTaskId(data.currentTaskId);
    setCurrentTaskIndex(data.currentTaskIndex);
    setTotalTasks(data.totalTasks);
    setTaskProgress(data.taskProgress);
    setCompletedTasks(data.completedTasks);
    setPauseReason(data.pauseReason || null);
    setError(data.error || null);

    previousStatusRef.current = data.status;
    previousTaskIdRef.current = data.currentTaskId;

    // Trigger callbacks
    if (data.status === "WAITING_APPROVAL" && prevStatus === "RUNNING" && data.currentBatch) {
      onBatchComplete?.(data.batchIndex ?? 0, data.currentBatch);
    }
    if (data.status === "DONE" && prevStatus !== "DONE") {
      onAllComplete?.();
    }
    // Task completed callback
    if (prevTaskId && data.currentTaskId !== prevTaskId && data.completedTasks > 0) {
      onTaskComplete?.(prevTaskId);
    }
  }, [onBatchComplete, onAllComplete, onTaskComplete]);

  const fetchStatus = useCallback(async () => {
    if (!sessionId) return;
    try {
      const response = await fetch(
        `/api/projects/${projectId}/planning/autopilot/status?sessionId=${sessionId}`
      );
      const data = await response.json();
      if (response.ok) {
        updateFromStatus(data);
      }
    } catch {
      // Silent fail on poll
    }
  }, [projectId, sessionId, updateFromStatus]);

  // Fetch initial status when sessionId changes
  useEffect(() => {
    if (sessionId) {
      fetchStatus();
    }
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Start polling when status is RUNNING
  useEffect(() => {
    if (status === "RUNNING" && sessionId) {
      pollingRef.current = setInterval(fetchStatus, 2000);
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [status, sessionId, fetchStatus]);

  const start = useCallback(async (startMode?: AutopilotMode) => {
    if (!sessionId) return;
    setIsStarting(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/planning/autopilot/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, mode: startMode || "AUTO" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to start autopilot");
      updateFromStatus(data);

      // Auto-trigger first task execution
      if (data.status === "RUNNING") {
        executeNextInternal();
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsStarting(false);
    }
  }, [projectId, sessionId, updateFromStatus]);

  const executeNextInternal = useCallback(async () => {
    if (!sessionId) return;
    setIsExecuting(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/autopilot/execute-next`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to execute task");
      updateFromStatus(data);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsExecuting(false);
    }
  }, [projectId, sessionId, updateFromStatus]);

  const executeNext = useCallback(async () => {
    await executeNextInternal();
  }, [executeNextInternal]);

  const resume = useCallback(async () => {
    if (!sessionId) return;
    setIsStarting(true);
    setError(null);
    try {
      // Resume uses the same start endpoint - it handles PAUSED state
      const response = await fetch(`/api/projects/${projectId}/planning/autopilot/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to resume autopilot");
      updateFromStatus(data);

      // Trigger next task execution
      if (data.status === "RUNNING") {
        executeNextInternal();
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsStarting(false);
    }
  }, [projectId, sessionId, updateFromStatus, executeNextInternal]);

  const approve = useCallback(async () => {
    if (!sessionId) return;
    setIsApproving(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/planning/autopilot/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to approve batch");
      updateFromStatus(data);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsApproving(false);
    }
  }, [projectId, sessionId, updateFromStatus]);

  const cancel = useCallback(async () => {
    if (!sessionId) return;
    setIsCanceling(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/planning/autopilot/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to cancel autopilot");
      updateFromStatus(data);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsCanceling(false);
    }
  }, [projectId, sessionId, updateFromStatus]);

  return {
    status,
    mode,
    currentBatch,
    batchIndex,
    totalBatches,
    progress,
    currentTaskId,
    currentTaskIndex,
    totalTasks,
    taskProgress,
    completedTasks,
    pauseReason,
    error,
    isStarting,
    isApproving,
    isCanceling,
    isExecuting,
    start,
    executeNext,
    approve,
    cancel,
    resume,
  };
}
