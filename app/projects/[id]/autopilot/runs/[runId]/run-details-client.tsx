/**
 * RunDetailsClient (PR-75, PR-77) - Client component for autopilot run details
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useAutopilotRunDetails } from "@/hooks/useAutopilotRunDetails";
import { RunAttemptRow } from "@/components/autopilot/run-attempt-row";
import { ErrorGuidancePanel } from "@/components/autopilot/error-guidance-panel";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft } from "lucide-react";
import type { RunStatus } from "@/types/autopilot-run";

interface RunDetailsClientProps {
  projectId: string;
  runId: string;
}

// PR-76: Use derived status values
const statusVariants: Record<RunStatus, "default" | "secondary" | "destructive" | "outline"> = {
  idle: "secondary",
  running: "default",
  completed: "outline",
  failed: "destructive",
  cancelled: "secondary",
};

const statusLabels: Record<RunStatus, string> = {
  idle: "Idle",
  running: "Running",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

export function RunDetailsClient({ projectId, runId }: RunDetailsClientProps) {
  const { run, isLoading, error } = useAutopilotRunDetails(runId);
  const [expandedAttemptId, setExpandedAttemptId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading run details...
        </div>
      </div>
    );
  }

  if (error || !run) {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <Link href={`/projects/${projectId}`} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to project
        </Link>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          {error || "Run not found"}
        </div>
      </div>
    );
  }

  const toggleAttempt = (attemptId: string) => {
    setExpandedAttemptId(expandedAttemptId === attemptId ? null : attemptId);
  };

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <Link href={`/projects/${projectId}`} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground" data-testid="back-link">
        <ArrowLeft className="h-4 w-4" />
        Back to Autopilot history
      </Link>

      <div className="mb-6 rounded-lg border bg-card p-6" data-testid="run-summary">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">
            Autopilot Run <code className="text-sm text-muted-foreground">#{runId.slice(0, 8)}</code>
          </h1>
          <Badge variant={statusVariants[run.status]} className="text-sm">
            {statusLabels[run.status]}
          </Badge>
        </div>

        <div className="grid gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Started</span>
            <span>{formatDateTime(run.startedAt)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Finished</span>
            <span>{run.finishedAt ? formatDateTime(run.finishedAt) : "Still running..."}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tasks</span>
            <span>
              {run.doneTasks}/{run.totalTasks} completed
              {run.failedTasks > 0 && <span className="text-destructive"> • {run.failedTasks} failed</span>}
            </span>
          </div>
        </div>

        {run.runError && (
          <div className="mt-4">
            <ErrorGuidancePanel runError={run.runError} />
          </div>
        )}
      </div>

      <div className="rounded-lg border bg-card" data-testid="attempts-list">
        <div className="border-b px-4 py-3">
          <h2 className="font-medium">Attempts ({run.attempts.length})</h2>
        </div>
        {run.attempts.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">No attempts yet</div>
        ) : (
          run.attempts.map((attempt) => (
            <RunAttemptRow
              key={attempt.attemptId}
              attempt={attempt}
              projectId={projectId}
              isExpanded={expandedAttemptId === attempt.attemptId}
              onToggle={() => toggleAttempt(attempt.attemptId)}
            />
          ))
        )}
      </div>
    </div>
  );
}
