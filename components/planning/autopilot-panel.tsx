/**
 * AutopilotPanel - UI for sequential autopilot execution
 * Supports STEP (one task) and AUTO (all tasks) modes
 */
"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, PlayCircle, PauseCircle, StepForward, FastForward, AlertTriangle } from "lucide-react";
import { AutopilotStatus, AutopilotMode } from "@/lib/autopilot-machine";
import { Batch } from "@/lib/backlog-chunker";

interface AutopilotPanelProps {
  status: AutopilotStatus;
  mode: AutopilotMode;
  currentBatch?: Batch;
  progress: string;
  totalBatches: number;
  // Task-level props
  taskProgress: string;
  totalTasks: number;
  completedTasks: number;
  currentTaskId?: string;
  pauseReason: string | null;
  error: string | null;
  // Loading states
  isStarting: boolean;
  isApproving: boolean;
  isCanceling: boolean;
  isExecuting: boolean;
  // Actions
  onStartStep: () => void;
  onStartAuto: () => void;
  onResume: () => void;
  onApprove: () => void;
  onCancel: () => void;
}

const riskColors: Record<string, string> = {
  low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  med: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const statusConfig: Record<AutopilotStatus, { icon: React.ReactNode; label: string }> = {
  IDLE: { icon: <PlayCircle className="h-5 w-5 text-muted-foreground" />, label: "Ready to start" },
  RUNNING: { icon: <Loader2 className="h-5 w-5 animate-spin text-blue-500" />, label: "Executing task..." },
  PAUSED: { icon: <PauseCircle className="h-5 w-5 text-yellow-500" />, label: "Paused" },
  WAITING_APPROVAL: { icon: <PauseCircle className="h-5 w-5 text-yellow-500" />, label: "Waiting for approval" },
  DONE: { icon: <CheckCircle className="h-5 w-5 text-green-500" />, label: "All tasks complete" },
  FAILED: { icon: <XCircle className="h-5 w-5 text-red-500" />, label: "Failed" },
};

const modeLabels: Record<AutopilotMode, string> = {
  OFF: "Off",
  STEP: "Step",
  AUTO: "Auto",
};

export function AutopilotPanel({
  status, mode, currentBatch, progress, totalBatches,
  taskProgress, totalTasks, completedTasks, currentTaskId, pauseReason, error,
  isStarting, isApproving, isCanceling, isExecuting,
  onStartStep, onStartAuto, onResume, onApprove, onCancel,
}: AutopilotPanelProps) {
  // Panel always shows when rendered - parent controls visibility based on plan steps
  const taskProgressPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const isLoading = isStarting || isExecuting;
  // Defensive: fallback to IDLE config if status is undefined or invalid
  const validStatuses = Object.keys(statusConfig) as AutopilotStatus[];
  const normalizedStatus: AutopilotStatus = validStatuses.includes(status) ? status : "IDLE";
  const statusCfg = statusConfig[normalizedStatus];
  const modeCfg = modeLabels[mode] || modeLabels.OFF;

  return (
    <div className="rounded-lg border border-border bg-card p-6" data-testid="autopilot-panel">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Autopilot</h3>
          {mode !== "OFF" && (
            <Badge variant="outline" className="text-xs">
              {modeCfg}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {statusCfg.icon}
          <span className="text-sm text-muted-foreground" data-testid="autopilot-status">
            {statusCfg.label}
          </span>
        </div>
      </div>

      {/* Task Progress Bar */}
      <div className="mb-4">
        <div className="mb-1 flex justify-between text-sm">
          <span>Tasks</span>
          <span data-testid="autopilot-task-progress">{taskProgress}</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted">
          <div
            className="h-2 rounded-full bg-primary transition-all"
            style={{ width: `${taskProgressPercent}%` }}
            data-testid="autopilot-progress-bar"
          />
        </div>
      </div>

      {/* Current Task Info */}
      {currentTaskId && normalizedStatus === "RUNNING" && (
        <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950 p-3">
          <p className="text-xs text-blue-600 dark:text-blue-400">Executing task:</p>
          <p className="text-sm font-medium text-blue-800 dark:text-blue-200 truncate">
            {currentTaskId}
          </p>
        </div>
      )}

      {/* Pause Reason */}
      {pauseReason && normalizedStatus === "PAUSED" && (
        <div className="mb-4 rounded-md border border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950 p-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-yellow-700 dark:text-yellow-300">{pauseReason}</p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive" data-testid="autopilot-error">
          {error}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        {normalizedStatus === "IDLE" && (
          <>
            <Button
              onClick={onStartStep}
              disabled={isLoading || totalTasks === 0}
              variant="outline"
              className="flex-1"
              data-testid="autopilot-step-button"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <StepForward className="mr-2 h-4 w-4" />
              )}
              Run Next
            </Button>
            <Button
              onClick={onStartAuto}
              disabled={isLoading || totalTasks === 0}
              className="flex-1"
              data-testid="autopilot-auto-button"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FastForward className="mr-2 h-4 w-4" />
              )}
              Run All
            </Button>
          </>
        )}

        {normalizedStatus === "PAUSED" && (
          <>
            <Button
              onClick={onResume}
              disabled={isLoading}
              className="flex-1"
              data-testid="autopilot-resume-button"
            >
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Resuming...</>
              ) : (
                "Resume"
              )}
            </Button>
            <Button onClick={onCancel} disabled={isCanceling} variant="outline">
              {isCanceling ? <Loader2 className="h-4 w-4 animate-spin" /> : "Stop"}
            </Button>
          </>
        )}

        {normalizedStatus === "RUNNING" && (
          <Button onClick={onCancel} disabled={isCanceling} variant="outline" className="flex-1" data-testid="autopilot-cancel-button">
            {isCanceling ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Stopping...</> : "Stop"}
          </Button>
        )}

        {normalizedStatus === "WAITING_APPROVAL" && (
          <>
            <Button onClick={onApprove} disabled={isApproving} className="flex-1" data-testid="autopilot-approve-button">
              {isApproving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Approving...</> : "Approve & Continue"}
            </Button>
            <Button onClick={onCancel} disabled={isCanceling} variant="outline">
              Cancel
            </Button>
          </>
        )}

        {normalizedStatus === "DONE" && (
          <div className="flex-1 text-center text-sm text-green-600" data-testid="autopilot-done">
            All {totalTasks} tasks completed!
          </div>
        )}

        {normalizedStatus === "FAILED" && (
          <Button onClick={onResume} disabled={isLoading} variant="outline" className="flex-1" data-testid="autopilot-retry-button">
            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Retrying...</> : "Retry"}
          </Button>
        )}
      </div>
    </div>
  );
}
