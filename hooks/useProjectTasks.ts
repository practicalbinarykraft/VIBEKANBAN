/**
 * useProjectTasks - Hook for managing project tasks (CRUD operations)
 *
 * Responsibility: Handle fetching, creating, updating, and deleting tasks
 * Returns tasks list, loading state, error, and action handlers
 *
 * Refresh contract:
 * - refreshTasks() with deduplication via AbortController
 * - isRefreshing for UI overlay
 * - requestId tracking to prevent stale responses
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Task } from "@/types";

export function useProjectTasks(projectId: string) {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Deduplication: abort previous request, track request ID
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  // Fetch tasks from API (initial load)
  const fetchTasks = async () => {
    try {
      setError(null);
      const response = await fetch(`/api/projects/${projectId}/tasks`);
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      } else {
        setError("Failed to load tasks");
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
      setError("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  // Refresh tasks with deduplication (for mutations/polling)
  const refreshTasks = useCallback(async () => {
    // Abort previous in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const currentRequestId = ++requestIdRef.current;

    setIsRefreshing(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/tasks`, {
        signal: controller.signal,
      });

      // Check if this is still the latest request
      if (currentRequestId !== requestIdRef.current) {
        return; // Stale response, ignore
      }

      if (response.ok) {
        const data = await response.json();
        setTasks(data);
        setError(null);
      } else {
        setError("Failed to refresh tasks");
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        return; // Request was aborted, ignore
      }
      console.error("Failed to refresh tasks:", err);
      setError("Failed to refresh tasks");
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setIsRefreshing(false);
      }
    }
  }, [projectId]);

  useEffect(() => {
    fetchTasks();
  }, [projectId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleCreateTask = async (
    title: string,
    description: string,
    startImmediately: boolean
  ) => {
    try {
      setError(null);
      const response = await fetch(`/api/projects/${projectId}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          status: "todo",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create task");
      }

      const newTask = await response.json();

      // Refresh tasks list
      await fetchTasks();

      // Auto-select the new task
      router.push(`/projects/${projectId}?task=${newTask.id}`);

      return newTask;
    } catch (error: any) {
      console.error("Error creating task:", error);
      setError(error.message || "Failed to create task");
      throw error;
    }
  };

  const handleSaveTask = async (
    taskId: string,
    updates: { title: string; description: string }
  ) => {
    try {
      setError(null);
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update task");
      }

      // Refresh tasks list
      await fetchTasks();
    } catch (error: any) {
      console.error("Error updating task:", error);
      setError(error.message || "Failed to update task");
      throw error;
    }
  };

  const handleConfirmDelete = async (taskId: string, selectedTaskId: string | null) => {
    try {
      setError(null);
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete task");
      }

      // Close panel if deleted task was selected
      if (selectedTaskId === taskId) {
        router.push(`/projects/${projectId}`);
      }

      // Refresh tasks list
      await fetchTasks();
    } catch (error: any) {
      console.error("Error deleting task:", error);
      setError(error.message || "Failed to delete task");
      throw error;
    }
  };

  return {
    tasks,
    loading,
    isRefreshing,
    error,
    refreshTasks,
    handleCreateTask,
    handleSaveTask,
    handleConfirmDelete,
  };
}
