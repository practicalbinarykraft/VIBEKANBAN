/**
 * AutopilotPanel Component (PR-61)
 *
 * UI control panel for Autopilot status and actions.
 * Props-driven, no direct API calls.
 */

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, Play, Square } from "lucide-react";
import type { AutopilotPanelProps, AutopilotStatus } from "@/types/autopilot";

const statusVariants: Record<AutopilotStatus, "default" | "secondary" | "destructive" | "outline"> = {
  IDLE: "secondary",
  RUNNING: "default",
  FAILED: "destructive",
  DONE: "outline",
};

export function AutopilotPanel({
  status,
  lastRunAt,
  lastError,
  attemptCount,
  onStart,
  onStop,
}: AutopilotPanelProps) {
  const showStart = status !== "RUNNING";
  const showStop = status === "RUNNING";

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Autopilot</h2>
        </div>
        <Badge data-testid="status-badge" variant={statusVariants[status]}>
          {status}
        </Badge>
      </div>

      {lastError && status === "FAILED" && (
        <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {lastError}
        </div>
      )}

      <div className="mb-4 flex items-center gap-4 text-sm text-muted-foreground">
        {lastRunAt && (
          <div data-testid="last-run">
            Last run: {new Date(lastRunAt).toLocaleString()}
          </div>
        )}
        {attemptCount != null && attemptCount > 0 && (
          <div>
            Attempts: <span className="font-medium text-foreground">{attemptCount}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {showStart && (
          <Button
            data-testid="start-btn"
            onClick={onStart}
            disabled={!onStart}
            size="sm"
          >
            <Play className="mr-1 h-4 w-4" />
            Start
          </Button>
        )}
        {showStop && (
          <Button
            data-testid="stop-btn"
            onClick={onStop}
            disabled={!onStop}
            variant="outline"
            size="sm"
          >
            <Square className="mr-1 h-4 w-4" />
            Stop
          </Button>
        )}
      </div>
    </div>
  );
}
