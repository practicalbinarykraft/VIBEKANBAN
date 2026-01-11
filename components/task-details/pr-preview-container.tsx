/**
 * PRPreviewContainer - Container for PR Preview with sync logic
 *
 * Responsibility:
 * - Manages PR sync state (usePRSync hook)
 * - Fetches latest attempt data after sync
 * - Renders PRPreview with sync props
 *
 * Why separate file:
 * - Keeps task-details-panel.tsx under 200 LOC
 * - Single responsibility: PR preview + sync only
 * - Encapsulates PR-related integration logic
 */

"use client";

import { useState, useEffect } from "react";
import { Attempt } from "@/types";
import { PRPreview } from "./pr-preview";
import { usePRSync } from "@/hooks/usePRSync";

interface PRPreviewContainerProps {
  selectedAttempt: Attempt;
  selectedAttemptId: string;
  isCreatingPR: boolean;
  onCreatePR: () => void;
  ssePrStatus: "open" | "merged" | "closed" | null;
  permissionError?: string | null;
}

export function PRPreviewContainer({
  selectedAttempt,
  selectedAttemptId,
  isCreatingPR,
  onCreatePR,
  ssePrStatus,
  permissionError,
}: PRPreviewContainerProps) {
  // Local attempt state for re-fetching after sync
  const [attempt, setAttempt] = useState<Attempt>(selectedAttempt);

  // Sync selectedAttempt changes from parent
  useEffect(() => {
    setAttempt(selectedAttempt);
  }, [selectedAttempt]);

  // Update PR status from SSE in real-time
  useEffect(() => {
    if (ssePrStatus) {
      setAttempt((prev) => ({
        ...prev,
        prStatus: ssePrStatus,
      }));
    }
  }, [ssePrStatus]);

  // Fetch latest attempt data (called after sync completes)
  const refetchAttempt = async () => {
    try {
      const response = await fetch(`/api/attempts/${selectedAttemptId}`);
      if (response.ok) {
        const updatedAttempt = await response.json();
        setAttempt(updatedAttempt);
      }
    } catch (error) {
      console.error("Failed to refetch attempt after PR sync:", error);
    }
  };

  // PR sync hook
  const { isSyncingPR, syncError, handleSyncPR } = usePRSync(
    selectedAttemptId,
    !!attempt.prUrl,
    refetchAttempt // Callback to refresh attempt after sync
  );

  return (
    <PRPreview
      attempt={attempt}
      isCreating={isCreatingPR}
      onCreatePR={onCreatePR}
      isSyncingPR={isSyncingPR}
      onSyncPR={handleSyncPR}
      syncError={syncError}
      permissionError={permissionError}
    />
  );
}
