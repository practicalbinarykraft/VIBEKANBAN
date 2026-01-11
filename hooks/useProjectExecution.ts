/**
 * useProjectExecution - Hook for managing project execution orchestrator
 *
 * Responsibility: Handle Run All, Pause, Resume actions and execution status
 * Polls execution status and provides action handlers
 */

import { useState, useEffect, useCallback } from "react";

interface ProjectExecutionData {
  executionStatus: "idle" | "running" | "paused" | "completed" | "failed";
  executionStartedAt: string | null;
  executionFinishedAt: string | null;
}

export function useProjectExecution(projectId: string) {
  const [executionData, setExecutionData] = useState<ProjectExecutionData>({
    executionStatus: "idle",
    executionStartedAt: null,
    executionFinishedAt: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch execution status from API
  const fetchExecutionStatus = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(`/api/projects/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setExecutionData({
          executionStatus: data.executionStatus || "idle",
          executionStartedAt: data.executionStartedAt,
          executionFinishedAt: data.executionFinishedAt,
        });
      } else {
        setError("Failed to load execution status");
      }
    } catch (error) {
      console.error("Failed to fetch execution status:", error);
      setError("Failed to load execution status");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Initial fetch
  useEffect(() => {
    fetchExecutionStatus();
  }, [fetchExecutionStatus]);

  // Poll for status updates when running
  useEffect(() => {
    if (executionData.executionStatus === "running") {
      const interval = setInterval(() => {
        fetchExecutionStatus();
      }, 2000); // Poll every 2 seconds

      return () => clearInterval(interval);
    }
  }, [executionData.executionStatus, fetchExecutionStatus]);

  const handleRunAll = async () => {
    try {
      setError(null);
      const response = await fetch(`/api/projects/${projectId}/run-all`, {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to start execution");
      }

      // Refresh status
      await fetchExecutionStatus();
    } catch (error: any) {
      console.error("Error starting execution:", error);
      setError(error.message || "Failed to start execution");
      throw error;
    }
  };

  const handlePause = async () => {
    try {
      setError(null);
      const response = await fetch(`/api/projects/${projectId}/pause`, {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to pause execution");
      }

      // Refresh status
      await fetchExecutionStatus();
    } catch (error: any) {
      console.error("Error pausing execution:", error);
      setError(error.message || "Failed to pause execution");
      throw error;
    }
  };

  const handleResume = async () => {
    try {
      setError(null);
      const response = await fetch(`/api/projects/${projectId}/resume`, {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to resume execution");
      }

      // Refresh status
      await fetchExecutionStatus();
    } catch (error: any) {
      console.error("Error resuming execution:", error);
      setError(error.message || "Failed to resume execution");
      throw error;
    }
  };

  return {
    executionStatus: executionData.executionStatus,
    executionStartedAt: executionData.executionStartedAt,
    executionFinishedAt: executionData.executionFinishedAt,
    loading,
    error,
    handleRunAll,
    handlePause,
    handleResume,
    refetch: fetchExecutionStatus,
  };
}
