/**
 * useTaskActions - Hook for task execution actions (run/apply/stop)
 *
 * Responsibility: Handle API calls for task execution actions
 * Returns action handlers and loading states
 */

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Attempt } from "@/types";

interface UseTaskActionsProps {
  taskId: string;
  projectId: string;
  selectedAttemptId: string | null;
  onAttemptUpdate?: (attempt: Attempt) => void;
}

export function useTaskActions({
  taskId,
  projectId,
  selectedAttemptId,
  onAttemptUpdate,
}: UseTaskActionsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isRunning, setIsRunning] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isCreatingPR, setIsCreatingPR] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Clear permission error when task or attempt changes
  useEffect(() => {
    setPermissionError(null);
  }, [taskId, selectedAttemptId]);

  const handleRunTask = async () => {
    setIsRunning(true);
    setPermissionError(null);

    try {
      const response = await fetch(`/api/tasks/${taskId}/run`, {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        const newAttempt: Attempt = {
          ...data,
          id: data.attemptId,
          taskId: taskId,
          status: data.status, // Use actual status from API (queued/running)
          startedAt: new Date(),
          mergeStatus: "not_merged", // Default merge status
        } as Attempt;

        // Notify parent of new attempt (for optimistic update)
        onAttemptUpdate?.(newAttempt);

        // Navigate to URL with new attempt
        const currentTaskId = searchParams.get("task");
        router.push(`/projects/${projectId}?task=${currentTaskId}&attempt=${data.attemptId}`);
      } else if (response.status === 403) {
        const error = await response.json();
        setPermissionError(error.error || "You don't have permission to perform this action");
      } else {
        console.error("Failed to start task execution");
      }
    } catch (error) {
      console.error("Error starting task:", error);
    } finally {
      setIsRunning(false);
    }
  };

  const handleStopExecution = async () => {
    if (!selectedAttemptId) return;

    try {
      const response = await fetch(`/api/attempts/${selectedAttemptId}/stop`, {
        method: "POST",
      });

      if (!response.ok) {
        console.error("Failed to stop execution");
      }
    } catch (error) {
      console.error("Error stopping execution:", error);
    }
  };

  const handleApply = async () => {
    if (!selectedAttemptId) return;

    setIsApplying(true);
    setPermissionError(null);

    try {
      const response = await fetch(`/api/attempts/${selectedAttemptId}/apply`, {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Apply result:", data);

        // Refresh selected attempt data
        const refreshResponse = await fetch(`/api/attempts/${selectedAttemptId}`);
        if (refreshResponse.ok) {
          const refreshedAttempt = await refreshResponse.json();
          onAttemptUpdate?.(refreshedAttempt);
        }

        // Trigger re-fetch by navigating to same URL
        const currentTaskId = searchParams.get("task");
        router.replace(`/projects/${projectId}?task=${currentTaskId}&attempt=${selectedAttemptId}`);
      } else if (response.status === 403) {
        const error = await response.json();
        setPermissionError(error.error || "You don't have permission to perform this action");
      } else {
        const error = await response.json();
        console.error("Failed to apply:", error);
        alert(`Apply failed: ${error.error}`);
      }
    } catch (error) {
      console.error("Error applying attempt:", error);
      alert("Error applying attempt");
    } finally {
      setIsApplying(false);
    }
  };

  const handleCreatePR = async () => {
    if (!selectedAttemptId) return;

    setIsCreatingPR(true);
    setPermissionError(null);
    try {
      const response = await fetch(`/api/attempts/${selectedAttemptId}/create-pr`, {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        // Refresh selected attempt data
        const refreshResponse = await fetch(`/api/attempts/${selectedAttemptId}`);
        if (refreshResponse.ok) {
          const refreshedAttempt = await refreshResponse.json();
          onAttemptUpdate?.(refreshedAttempt);
        }
      } else if (response.status === 403) {
        const error = await response.json();
        setPermissionError(error.error || "You don't have permission to perform this action");
      } else {
        const error = await response.json();
        console.error("Failed to create PR:", error);
      }
    } catch (error) {
      console.error("Error creating PR:", error);
    } finally {
      setIsCreatingPR(false);
    }
  };

  return {
    isRunning,
    isApplying,
    isCreatingPR,
    permissionError,
    handleRunTask,
    handleStopExecution,
    handleApply,
    handleCreatePR,
  };
}
