"use client";

import { useState, useEffect, useCallback } from "react";

export interface RepoStatusData {
  repoPath: string | null;
  isCloned: boolean;
  gitUrl: string;
  defaultBranch: string;
  error?: string;
}

export interface UseRepoStatusResult {
  status: RepoStatusData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  isConfigured: boolean;
}

/**
 * Hook to fetch and manage repository status for a project
 * @param projectId - The project ID to check repo status for
 * @returns Repository status, loading state, and utility functions
 */
export function useRepoStatus(projectId: string): UseRepoStatusResult {
  const [status, setStatus] = useState<RepoStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/repo`);
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      } else {
        setError("Failed to fetch repository status");
      }
    } catch (err) {
      console.error("Failed to fetch repo status:", err);
      setError("Network error while fetching repository status");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Repository is considered "configured" if it has a gitUrl set
  // and "ready" if it's also cloned
  const isConfigured = Boolean(status?.gitUrl);

  return {
    status,
    loading,
    error,
    refetch: fetchStatus,
    isConfigured,
  };
}
