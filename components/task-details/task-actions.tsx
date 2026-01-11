/**
 * TaskActions - Action buttons for task execution
 *
 * Responsibility: Display Run/Apply/Stop/Merge/New Attempt buttons based on status
 * Shows error/info messages for Apply button states
 * Props-driven, no internal state or side effects
 */

import { Button } from "@/components/ui/button";
import { AttemptWithStats } from "@/types";
import { ApplyStatusMessage } from "./apply-status-message";

interface TaskActionsProps {
  latestAttempt: AttemptWithStats | null;
  currentStatus?: string;
  isRunning: boolean;
  isApplying: boolean;
  hasDiff: boolean;
  applyError: string | null;
  hasConflict: boolean;
  permissionError?: string | null;
  onRun: () => void;
  onApply: () => void;
  onStop: () => void;
  onCancel?: () => void;
}

export function TaskActions({
  latestAttempt,
  currentStatus,
  isRunning,
  isApplying,
  hasDiff,
  applyError,
  hasConflict,
  permissionError,
  onRun,
  onApply,
  onStop,
  onCancel,
}: TaskActionsProps) {
  // Determine if Apply should be disabled
  const canApply = hasDiff && !applyError && !permissionError;

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-1.5">
        {/* Primary action - Run or Apply */}
        {currentStatus === "queued" ? (
          <Button
            onClick={onRun}
            size="sm"
            className="h-9 text-xs justify-center font-medium"
            disabled
          >
            Queued...
          </Button>
        ) : currentStatus === "running" ? (
          <Button
            onClick={onRun}
            size="sm"
            className="h-9 text-xs justify-center font-medium"
            disabled
          >
            Running...
          </Button>
        ) : currentStatus === "completed" && latestAttempt?.headCommit && !latestAttempt?.appliedAt && !latestAttempt?.prUrl && !hasConflict ? (
          <Button
            onClick={onApply}
            size="sm"
            className="h-9 text-xs justify-center font-medium"
            disabled={isApplying || !canApply}
          >
            {isApplying ? "Applying..." : "Apply to Main"}
          </Button>
        ) : latestAttempt?.appliedAt ? (
          <Button
            size="sm"
            className="h-9 text-xs justify-center font-medium bg-green-600 hover:bg-green-700"
            disabled
          >
            ✓ Applied
          </Button>
        ) : (
          <Button
            onClick={onRun}
            size="sm"
            className="h-9 text-xs justify-center font-medium"
            disabled={isRunning || !!permissionError}
          >
            {isRunning ? "Starting..." : "Run Task"}
          </Button>
        )}

        {/* Show permission error */}
        {permissionError && (
          <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded px-2 py-1.5">
            {permissionError}
          </div>
        )}

        {/* Show apply error or no-changes message */}
        {currentStatus === "completed" && latestAttempt && !latestAttempt.appliedAt && !latestAttempt.prUrl && !hasConflict && (
          <>
            {applyError && <ApplyStatusMessage type="error" message={applyError} />}
            {!hasDiff && !applyError && <ApplyStatusMessage type="no-changes" />}
          </>
        )}

        {/* Secondary actions - only show when attempt exists */}
        {latestAttempt && (
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-7 text-xs"
              disabled={currentStatus === "running" || currentStatus === "queued"}
            >
              Merge
            </Button>
            <Button
              onClick={onRun}
              variant="outline"
              size="sm"
              className="flex-1 h-7 text-xs"
              disabled={currentStatus === "running" || currentStatus === "queued" || isRunning}
            >
              New Attempt
            </Button>
          </div>
        )}

        {/* Destructive action - only show when running */}
        {currentStatus === "running" && (
          <Button
            onClick={onStop}
            variant="outline"
            size="sm"
            className="h-6 text-xs text-destructive border-destructive/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
          >
            Stop Execution
          </Button>
        )}

        {/* Cancel action - only show when queued */}
        {currentStatus === "queued" && onCancel && (
          <Button
            onClick={onCancel}
            variant="outline"
            size="sm"
            className="h-6 text-xs text-destructive border-destructive/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
