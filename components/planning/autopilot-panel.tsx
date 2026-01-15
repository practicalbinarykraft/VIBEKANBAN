/**
 * AutopilotPanel - UI for multi-batch autopilot execution
 *
 * Shows:
 * - Current batch info (title, tasks, risk level)
 * - Progress indicator (e.g., "2/5 batches")
 * - Approve/Cancel buttons based on state
 */

"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, PlayCircle, PauseCircle } from "lucide-react";
import { AutopilotStatus } from "@/lib/autopilot-machine";
import { Batch } from "@/lib/backlog-chunker";

interface AutopilotPanelProps {
  status: AutopilotStatus;
  currentBatch?: Batch;
  progress: string;
  totalBatches: number;
  error: string | null;
  isStarting: boolean;
  isApproving: boolean;
  isCanceling: boolean;
  onStart: () => void;
  onApprove: () => void;
  onCancel: () => void;
}

const riskColors: Record<string, string> = {
  low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  med: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const statusIcons: Record<AutopilotStatus, React.ReactNode> = {
  IDLE: <PlayCircle className="h-5 w-5 text-muted-foreground" />,
  RUNNING: <Loader2 className="h-5 w-5 animate-spin text-blue-500" />,
  WAITING_APPROVAL: <PauseCircle className="h-5 w-5 text-yellow-500" />,
  DONE: <CheckCircle className="h-5 w-5 text-green-500" />,
  FAILED: <XCircle className="h-5 w-5 text-red-500" />,
};

const statusLabels: Record<AutopilotStatus, string> = {
  IDLE: "Ready to start",
  RUNNING: "Processing batch...",
  WAITING_APPROVAL: "Waiting for approval",
  DONE: "All batches complete",
  FAILED: "Failed",
};

export function AutopilotPanel({
  status,
  currentBatch,
  progress,
  totalBatches,
  error,
  isStarting,
  isApproving,
  isCanceling,
  onStart,
  onApprove,
  onCancel,
}: AutopilotPanelProps) {
  if (totalBatches === 0 && status === "IDLE") {
    return null; // Don't show if no batches
  }

  return (
    <div
      className="rounded-lg border border-border bg-card p-6"
      data-testid="autopilot-panel"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Multi-PR Autopilot</h3>
        <div className="flex items-center gap-2">
          {statusIcons[status]}
          <span className="text-sm text-muted-foreground" data-testid="autopilot-status">
            {statusLabels[status]}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="mb-1 flex justify-between text-sm">
          <span>Progress</span>
          <span data-testid="autopilot-progress">{progress}</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted">
          <div
            className="h-2 rounded-full bg-primary transition-all"
            style={{
              width: `${totalBatches > 0 ? (parseInt(progress.split("/")[0]) / totalBatches) * 100 : 0}%`,
            }}
            data-testid="autopilot-progress-bar"
          />
        </div>
      </div>

      {/* Current Batch Info */}
      {currentBatch && (
        <div
          className="mb-4 rounded-md border border-border/50 p-4"
          data-testid="autopilot-current-batch"
        >
          <div className="mb-2 flex items-center justify-between">
            <h4 className="font-medium">{currentBatch.title}</h4>
            <Badge className={riskColors[currentBatch.risk]} data-testid="batch-risk">
              {currentBatch.risk} risk
            </Badge>
          </div>
          <p className="mb-3 text-sm text-muted-foreground">{currentBatch.rationale}</p>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              Tasks ({currentBatch.tasks.length}):
            </p>
            <ul className="max-h-32 list-inside list-disc overflow-y-auto text-sm">
              {currentBatch.tasks.map((task, idx) => (
                <li key={idx} className="truncate text-muted-foreground">
                  {task}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div
          className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive"
          data-testid="autopilot-error"
        >
          {error}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        {status === "IDLE" && (
          <Button
            onClick={onStart}
            disabled={isStarting}
            className="flex-1"
            data-testid="autopilot-start-button"
          >
            {isStarting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting...
              </>
            ) : (
              "Start Autopilot"
            )}
          </Button>
        )}

        {status === "WAITING_APPROVAL" && (
          <Button
            onClick={onApprove}
            disabled={isApproving}
            className="flex-1"
            data-testid="autopilot-approve-button"
          >
            {isApproving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Approving...
              </>
            ) : (
              "Approve & Continue"
            )}
          </Button>
        )}

        {(status === "RUNNING" || status === "WAITING_APPROVAL") && (
          <Button
            onClick={onCancel}
            disabled={isCanceling}
            variant="outline"
            data-testid="autopilot-cancel-button"
          >
            {isCanceling ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Canceling...
              </>
            ) : (
              "Cancel"
            )}
          </Button>
        )}

        {status === "DONE" && (
          <div className="flex-1 text-center text-sm text-green-600" data-testid="autopilot-done">
            All {totalBatches} batches completed successfully!
          </div>
        )}

        {status === "FAILED" && (
          <Button
            onClick={onStart}
            disabled={isStarting}
            variant="outline"
            className="flex-1"
            data-testid="autopilot-retry-button"
          >
            {isStarting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Retrying...
              </>
            ) : (
              "Retry"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
