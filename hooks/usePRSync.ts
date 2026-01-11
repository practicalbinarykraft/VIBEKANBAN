import { useState, useEffect, useRef } from "react";

/**
 * Hook to sync PR status from GitHub
 *
 * Responsibilities:
 * - Trigger manual sync via handleSyncPR()
 * - Auto-sync once when attempt with PR is opened
 * - Track loading and error states
 *
 * Why separate hook:
 * - Keeps useTaskActions under 200 LOC limit
 * - Single responsibility: PR sync only
 * - Easy to test independently
 *
 * @param attemptId - Attempt ID to sync PR status for
 * @param hasPR - Whether attempt has an associated PR
 * @param onSyncComplete - Callback to refresh attempt data after sync
 */
export function usePRSync(
  attemptId: string | null,
  hasPR: boolean,
  onSyncComplete?: () => void
) {
  const [isSyncingPR, setIsSyncingPR] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Track if auto-sync has been performed for this attempt
  const autoSyncedRef = useRef<string | null>(null);

  /**
 * Manual sync: triggered by user clicking "Sync PR Status" button
   */
  const handleSyncPR = async () => {
    if (!attemptId) return;

    setIsSyncingPR(true);
    setSyncError(null);

    try {
      const response = await fetch(`/api/attempts/${attemptId}/sync-pr`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to sync PR status");
      }

      // Trigger callback to refresh attempt data
      if (onSyncComplete) {
        onSyncComplete();
      }
    } catch (error: any) {
      console.error("Error syncing PR status:", error);
      setSyncError(error.message);
    } finally {
      setIsSyncingPR(false);
    }
  };

  /**
   * Auto-sync: runs once when attempt with PR is opened
   *
   * Why once: Avoids spam, user can manually sync if needed
   * Protected by ref: Prevents re-triggering on re-renders
   */
  useEffect(() => {
    // Only auto-sync if:
    // 1. Attempt has a PR
    // 2. We haven't auto-synced this attempt yet
    // 3. Not currently syncing
    if (hasPR && attemptId && autoSyncedRef.current !== attemptId && !isSyncingPR) {
      // Mark this attempt as auto-synced
      autoSyncedRef.current = attemptId;

      // Trigger sync (best-effort, ignore errors)
      handleSyncPR().catch(err => {
        console.warn("Auto-sync failed (non-critical):", err);
      });
    }
  }, [attemptId, hasPR]);

  /**
   * Reset auto-sync tracking when attempt changes
   */
  useEffect(() => {
    if (attemptId !== autoSyncedRef.current) {
      setSyncError(null);
    }
  }, [attemptId]);

  return {
    isSyncingPR,
    syncError,
    handleSyncPR,
  };
}
