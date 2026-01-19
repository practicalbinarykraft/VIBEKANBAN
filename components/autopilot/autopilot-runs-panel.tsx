/**
 * AutopilotRunsPanel - List of autopilot attempt runs (PR-63)
 * Props-driven, read-only display component
 */
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink } from "lucide-react";
import type { AttemptStatus } from "@/server/services/attempts/attempt-runner.types";

export interface AttemptListItem {
  id: string;
  taskId: string;
  status: AttemptStatus;
  startedAt: string | null;
  finishedAt: string | null;
  exitCode: number | null;
}

interface AutopilotRunsPanelProps {
  attempts: AttemptListItem[];
  isLoading: boolean;
  error?: string | null;
  onOpenAttempt: (attemptId: string) => void;
}

const statusVariants: Record<AttemptStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  queued: "secondary",
  running: "default",
  completed: "outline",
  failed: "destructive",
  stopped: "secondary",
};

function formatTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleTimeString();
}

function shortId(id: string): string {
  return id.slice(0, 8);
}

export function AutopilotRunsPanel({
  attempts,
  isLoading,
  error,
  onOpenAttempt,
}: AutopilotRunsPanelProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card p-4" data-testid="runs-loading">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading runs...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border bg-card p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (attempts.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        No runs yet
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b px-4 py-3">
        <h3 className="font-medium">Recent Runs</h3>
      </div>
      <div className="divide-y">
        {attempts.map((attempt) => (
          <div
            key={attempt.id}
            className="flex items-center justify-between px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <code className="text-xs text-muted-foreground">
                {shortId(attempt.id)}
              </code>
              <Badge variant={statusVariants[attempt.status]}>
                {attempt.status}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatTime(attempt.startedAt)}
              </span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onOpenAttempt(attempt.id)}
            >
              <ExternalLink className="mr-1 h-3 w-3" />
              Open
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
