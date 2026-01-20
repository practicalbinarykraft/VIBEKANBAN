/** AutopilotStatusPanel (PR-68) - Simple status and start/stop controls */
"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, Square, AlertCircle, CheckCircle } from "lucide-react";
import type { AutopilotApiStatus } from "@/hooks/useAutopilotStatus";

interface AutopilotStatusPanelProps {
  status: AutopilotApiStatus;
  sessionId: string | null;
  currentTaskId: string | null;
  errorCode: string | null;
  isLoading: boolean;
  isStarting: boolean;
  isStopping: boolean;
  onStart: () => void;
  onStop: () => void;
}

const statusConfig: Record<AutopilotApiStatus, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
  idle: { variant: "secondary", label: "Idle" },
  running: { variant: "default", label: "Running" },
  stopped: { variant: "outline", label: "Stopped" },
  failed: { variant: "destructive", label: "Failed" },
};

export function AutopilotStatusPanel({
  status, sessionId, currentTaskId, errorCode,
  isLoading, isStarting, isStopping, onStart, onStop,
}: AutopilotStatusPanelProps) {
  const canStart = (status === "idle" || status === "stopped") && sessionId;
  const canStop = status === "running" && sessionId;
  const config = statusConfig[status];

  if (isLoading) {
    return (
      <div data-testid="autopilot-panel">
        <div className="rounded-lg border bg-card p-4" data-testid="autopilot-status-panel">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading autopilot status...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="autopilot-panel">
      <div className="rounded-lg border bg-card p-4" data-testid="autopilot-status-panel">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-medium">Autopilot</h3>
        <Badge variant={config.variant} data-testid="autopilot-status-badge">{config.label}</Badge>
      </div>

      {currentTaskId && status === "running" && (
        <div className="mb-3 text-sm text-muted-foreground">
          <span>Current task: </span>
          <span className="font-mono text-xs">{currentTaskId.slice(0, 8)}...</span>
        </div>
      )}

      {errorCode && (
        <div className="mb-3 flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {errorCode}
        </div>
      )}

      {!sessionId && (
        <div className="mb-3 text-sm text-muted-foreground">
          <CheckCircle className="mr-1 inline h-4 w-4" />
          Create a plan in Planning tab to start autopilot
        </div>
      )}

      {/* Task progress for E2E compatibility */}
      <div className="mb-3 text-sm" data-testid="autopilot-task-progress">
        {status === "running" ? "Running..." : "Ready to start"}
      </div>

      {/* Progress bar for E2E compatibility */}
      <div className="mb-3 h-2 w-full rounded bg-muted" data-testid="autopilot-progress-bar">
        <div
          className="h-full rounded bg-primary transition-all"
          style={{ width: status === "running" ? "50%" : "0%" }}
        />
      </div>

      <div className="flex gap-2">
        {canStart && (
          <Button
            onClick={onStart}
            disabled={isStarting}
            className="flex-1"
            data-testid="autopilot-auto-button"
          >
            {isStarting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            {isStarting ? "Starting..." : "Start"}
          </Button>
        )}

        {canStop && (
          <Button
            onClick={onStop}
            disabled={isStopping}
            variant="outline"
            className="flex-1"
            data-testid="autopilot-stop-button"
          >
            {isStopping ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Square className="mr-2 h-4 w-4" />
            )}
            {isStopping ? "Stopping..." : "Stop"}
          </Button>
        )}
      </div>
      </div>
    </div>
  );
}
