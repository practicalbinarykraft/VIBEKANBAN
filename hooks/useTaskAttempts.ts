import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AttemptWithStats } from "@/types";

/**
 * Hook to manage attempts for a task with URL-driven selection
 *
 * Responsibilities:
 * - Fetches attempts list for the given task
 * - Reads selectedAttemptId from URL (?attempt=...)
 * - Auto-selects latest attempt if no attempt in URL
 * - Syncs URL when selection changes
 *
 * @param taskId - Task ID to fetch attempts for
 * @param projectId - Project ID for URL construction
 * @returns Attempts list, selected attempt ID, loading state, error
 */
export function useTaskAttempts(taskId: string | null, projectId: string) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [attempts, setAttempts] = useState<AttemptWithStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const resolverRef = useRef<(() => void) | null>(null);

  // Read attempt ID from URL
  const urlAttemptId = searchParams.get("attempt");

  // Fetch attempts function - returns Promise that resolves after state update
  const fetchAttempts = (): Promise<void> => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setRefreshVersion(v => v + 1);
    });
  };

  // Effect triggered by refreshVersion change - performs actual fetch
  useEffect(() => {
    if (refreshVersion === 0) return;

    const doFetch = async () => {
      if (!taskId) {
        setAttempts([]);
        if (resolverRef.current) {
          resolverRef.current();
          resolverRef.current = null;
        }
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/tasks/${taskId}/attempts`);
        if (response.ok) {
          const data = await response.json();
          setAttempts(data);

          // Resolve after React commits this state update
          if (resolverRef.current) {
            requestAnimationFrame(() => {
              resolverRef.current?.();
              resolverRef.current = null;
            });
          }
        } else {
          setError("Failed to load attempts");
          if (resolverRef.current) {
            resolverRef.current();
            resolverRef.current = null;
          }
        }
      } catch (err) {
        console.error("Failed to fetch attempts:", err);
        setError("Failed to load attempts");
        if (resolverRef.current) {
          resolverRef.current();
          resolverRef.current = null;
        }
      } finally {
        setLoading(false);
      }
    };

    doFetch();
  }, [refreshVersion, taskId]);

  // Fetch attempts when taskId changes or when URL attempt param changes (new attempt created)
  useEffect(() => {
    setRefreshVersion(v => v + 1);
  }, [taskId, urlAttemptId]); // Refetch when attempt URL changes

  // Auto-select latest attempt if no attempt in URL and attempts loaded
  useEffect(() => {
    if (!taskId || loading || attempts.length === 0) {
      return;
    }

    // If URL has attempt param, validate it exists in attempts
    if (urlAttemptId) {
      const attemptExists = attempts.some((a) => a.id === urlAttemptId);
      if (!attemptExists) {
        // Invalid attempt ID - auto-correct to latest
        const latestAttempt = attempts[0];
        router.replace(
          `/projects/${projectId}?task=${taskId}&attempt=${latestAttempt.id}`
        );
      }
      // Valid attempt - no action needed
      return;
    }

    // No attempt in URL - auto-select latest
    const latestAttempt = attempts[0];
    router.replace(
      `/projects/${projectId}?task=${taskId}&attempt=${latestAttempt.id}`
    );
  }, [taskId, attempts, urlAttemptId, loading, projectId, router]);

  return {
    attempts,
    selectedAttemptId: urlAttemptId,
    loading,
    error,
    refetchAttempts: fetchAttempts,
  };
}
