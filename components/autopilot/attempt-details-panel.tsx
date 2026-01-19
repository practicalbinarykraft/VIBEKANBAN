/**
 * AttemptDetailsPanel - Display attempt status and logs (PR-63)
 * Props-driven, read-only display component
 */
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Loader2, AlertCircle } from "lucide-react";
import { AttemptLogsViewer, LogLine } from "./attempt-logs-viewer";
import type { AttemptStatus } from "@/server/services/attempts/attempt-runner.types";

interface AttemptDetails {
  attemptId: string;
  status: AttemptStatus;
  startedAt: string | null;
  finishedAt: string | null;
  exitCode: number | null;
  error?: string | null;
}

interface AttemptDetailsPanelProps {
  attempt: AttemptDetails | null;
  logs: LogLine[];
  isLoading: boolean;
  logsLoading?: boolean;
  onClose: () => void;
}

const statusVariants: Record<AttemptStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  queued: "secondary",
  running: "default",
  completed: "outline",
  failed: "destructive",
  stopped: "secondary",
};

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString();
}

export function AttemptDetailsPanel({
  attempt,
  logs,
  isLoading,
  logsLoading,
  onClose,
}: AttemptDetailsPanelProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card p-6" data-testid="details-loading">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading attempt details...</span>
        </div>
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="rounded-lg border bg-card p-6 text-muted-foreground">
        No attempt selected
      </div>
    );
  }

  const isRunning = attempt.status === "running" || attempt.status === "queued";

  return (
    <div className="rounded-lg border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <code className="text-sm font-medium">{attempt.attemptId}</code>
          <Badge variant={statusVariants[attempt.status]}>
            {attempt.status}
          </Badge>
        </div>
        <Button size="sm" variant="ghost" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="space-y-4 p-4">
        {/* Error message */}
        {attempt.error && (
          <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{attempt.error}</span>
          </div>
        )}

        {/* Timestamps */}
        <div className="grid gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Started</span>
            <span>{formatDateTime(attempt.startedAt)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Finished</span>
            <span>{formatDateTime(attempt.finishedAt)}</span>
          </div>
          {attempt.exitCode !== null && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Exit code</span>
              <span>{attempt.exitCode}</span>
            </div>
          )}
        </div>

        {/* Logs */}
        <div>
          <h4 className="mb-2 text-sm font-medium">Logs</h4>
          {logsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading logs...
            </div>
          ) : (
            <AttemptLogsViewer lines={logs} autoScroll={isRunning} />
          )}
        </div>
      </div>
    </div>
  );
}
