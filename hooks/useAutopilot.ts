/**
 * useAutopilot - Hook for managing multi-batch autopilot execution
 *
 * Handles:
 * - Starting autopilot execution
 * - Polling status during execution
 * - Approving current batch
 * - Canceling autopilot
 */

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { AutopilotStatusInfo, AutopilotStatus } from "@/lib/autopilot-machine";
import { Batch } from "@/lib/backlog-chunker";

interface UseAutopilotReturn {
  status: AutopilotStatus;
  currentBatch: Batch | undefined;
  batchIndex: number | undefined;
  totalBatches: number;
  progress: string;
  error: string | null;
  isStarting: boolean;
  isApproving: boolean;
  isCanceling: boolean;
  start: () => Promise<void>;
  approve: () => Promise<void>;
  cancel: () => Promise<void>;
}

export function useAutopilot(
  projectId: string,
  sessionId: string | null,
  onBatchComplete?: (batchIndex: number, batch: Batch) => void,
  onAllComplete?: () => void
): UseAutopilotReturn {
  const [status, setStatus] = useState<AutopilotStatus>("IDLE");
  const [currentBatch, setCurrentBatch] = useState<Batch | undefined>();
  const [batchIndex, setBatchIndex] = useState<number | undefined>();
  const [totalBatches, setTotalBatches] = useState(0);
  const [progress, setProgress] = useState("0/0");
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const previousStatusRef = useRef<AutopilotStatus>("IDLE");

  const updateFromStatus = useCallback((data: AutopilotStatusInfo) => {
    const prevStatus = previousStatusRef.current;
    setStatus(data.status);
    setCurrentBatch(data.currentBatch);
    setBatchIndex(data.batchIndex);
    setTotalBatches(data.totalBatches);
    setProgress(data.progress);
    setError(data.error || null);
    previousStatusRef.current = data.status;

    // Trigger callbacks
    if (data.status === "WAITING_APPROVAL" && prevStatus === "RUNNING" && data.currentBatch) {
      onBatchComplete?.(data.batchIndex ?? 0, data.currentBatch);
    }
    if (data.status === "DONE" && prevStatus !== "DONE") {
      onAllComplete?.();
    }
  }, [onBatchComplete, onAllComplete]);

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

  const start = useCallback(async () => {
    if (!sessionId) return;
    setIsStarting(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/planning/autopilot/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to start autopilot");
      updateFromStatus(data);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsStarting(false);
    }
  }, [projectId, sessionId, updateFromStatus]);

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
    currentBatch,
    batchIndex,
    totalBatches,
    progress,
    error,
    isStarting,
    isApproving,
    isCanceling,
    start,
    approve,
    cancel,
  };
}
