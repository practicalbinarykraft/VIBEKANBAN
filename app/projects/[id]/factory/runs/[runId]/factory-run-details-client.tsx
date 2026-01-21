/**
 * FactoryRunDetailsClient (PR-91, PR-92, PR-93, PR-94, PR-95) - Client component for factory run details
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useFactoryRunDetails } from "@/hooks/useFactoryRunDetails";
import { useFactoryRunMetrics } from "@/hooks/useFactoryRunMetrics";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FactoryErrorGuidancePanel } from "@/components/factory/factory-error-guidance-panel";
import { FactoryRerunPanel } from "@/components/factory/factory-rerun-panel";
import { FactoryRunMetricsPanel } from "@/components/factory/factory-run-metrics-panel";
import { FactoryRunMetricsPanelV2 } from "@/components/factory/factory-run-metrics-panel-v2";
import {
  Loader2,
  ArrowLeft,
  Square,
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock,
  PlayCircle,
} from "lucide-react";
import type { FactoryRunDetails, FactoryRunAttempt } from "@/hooks/useFactoryRunDetails";

interface FactoryRunDetailsClientProps {
  projectId: string;
  runId: string;
}

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  running: "default",
  completed: "outline",
  failed: "destructive",
  cancelled: "secondary",
};

const statusLabels: Record<string, string> = {
  running: "Running",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

interface AttemptRowProps {
  attempt: FactoryRunAttempt;
  projectId: string;
  selected: boolean;
  onToggle: (taskId: string) => void;
}

function AttemptRow({ attempt, projectId, selected, onToggle }: AttemptRowProps) {
  const variant = attempt.status === "completed" ? "default" :
    attempt.status === "failed" ? "destructive" :
    attempt.status === "running" ? "secondary" : "outline";

  return (
    <div className="flex items-center justify-between py-2 px-4 border-b last:border-b-0">
      <div className="flex items-center gap-3">
        <Checkbox
          checked={selected}
          onCheckedChange={() => onToggle(attempt.taskId)}
          data-testid={`attempt-checkbox-${attempt.id}`}
        />
        <code className="text-xs text-muted-foreground">{attempt.id.slice(0, 8)}</code>
        <span className="text-sm">Task #{attempt.taskId.slice(0, 8)}</span>
        <Badge variant={variant} className="text-xs">{attempt.status}</Badge>
      </div>
      <div className="flex items-center gap-2">
        {attempt.prUrl && (
          <a href={attempt.prUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="sm" className="h-6 text-xs">
              <ExternalLink className="h-3 w-3 mr-1" />
              PR
            </Button>
          </a>
        )}
        <Link href={`/projects/${projectId}?task=${attempt.taskId}&attempt=${attempt.id}`}>
          <Button variant="ghost" size="sm" className="h-6 text-xs">Open</Button>
        </Link>
      </div>
    </div>
  );
}

function CountsBlock({ counts }: { counts: FactoryRunDetails["counts"] }) {
  return (
    <div className="grid grid-cols-5 gap-4 p-4 bg-muted/50 rounded-lg">
      <div className="text-center">
        <div className="text-2xl font-bold">{counts.total}</div>
        <div className="text-xs text-muted-foreground">Total</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-green-600 flex items-center justify-center gap-1">
          <CheckCircle className="h-4 w-4" />
          {counts.completed}
        </div>
        <div className="text-xs text-muted-foreground">Completed</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-red-600 flex items-center justify-center gap-1">
          <XCircle className="h-4 w-4" />
          {counts.failed}
        </div>
        <div className="text-xs text-muted-foreground">Failed</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-blue-600 flex items-center justify-center gap-1">
          <PlayCircle className="h-4 w-4" />
          {counts.running}
        </div>
        <div className="text-xs text-muted-foreground">Running</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-gray-600 flex items-center justify-center gap-1">
          <Clock className="h-4 w-4" />
          {counts.queued}
        </div>
        <div className="text-xs text-muted-foreground">Queued</div>
      </div>
    </div>
  );
}

export function FactoryRunDetailsClient({ projectId, runId }: FactoryRunDetailsClientProps) {
  const { run, loading, error } = useFactoryRunDetails(projectId, runId);
  const isRunning = run?.status === "running";
  const { data: metrics, loading: metricsLoading } = useFactoryRunMetrics(projectId, runId, isRunning);
  const [stopping, setStopping] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  const handleStop = async () => {
    if (!run || stopping) return;
    setStopping(true);
    try {
      await fetch(`/api/projects/${projectId}/factory/runs/${runId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" }),
      });
    } finally {
      setStopping(false);
    }
  };

  const handleToggleTask = (taskId: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  if (loading) {
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

  const modeLabel = run.mode === "column" ? `Column: ${run.columnId || "all"}` :
    `Selection: ${run.selectedTaskIds?.length || 0} tasks`;

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <Link href={`/projects/${projectId}`} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground" data-testid="back-link">
        <ArrowLeft className="h-4 w-4" />
        Back to Factory
      </Link>

      <div className="mb-6 rounded-lg border bg-card p-6" data-testid="run-summary">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">
            Factory Run <code className="text-sm text-muted-foreground">#{runId.slice(0, 8)}</code>
          </h1>
          <div className="flex items-center gap-2">
            <Badge variant={statusVariants[run.status] || "outline"} className="text-sm">
              {statusLabels[run.status] || run.status}
            </Badge>
            {run.status === "running" && (
              <Button variant="destructive" size="sm" onClick={handleStop} disabled={stopping} data-testid="stop-button">
                {stopping ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Square className="h-4 w-4 mr-1" />}
                Stop
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-2 text-sm mb-4">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Mode</span>
            <span>{modeLabel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Max Parallel</span>
            <span>{run.maxParallel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Started</span>
            <span>{formatDateTime(run.startedAt)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Finished</span>
            <span>{run.finishedAt ? formatDateTime(run.finishedAt) : "Still running..."}</span>
          </div>
        </div>

      </div>

      {/* PR-92: Show error guidance when run failed/cancelled with error */}
      {run.error && run.guidance && (
        <div className="mb-6" data-testid="error-guidance">
          <FactoryErrorGuidancePanel error={run.error} guidance={run.guidance} />
        </div>
      )}

      <div className="mb-6">
        <CountsBlock counts={run.counts} />
      </div>

      {/* PR-94: Run metrics panel */}
      <div className="mb-6" data-testid="metrics-panel-container">
        <FactoryRunMetricsPanel metrics={metrics} loading={metricsLoading} />
      </div>

      {/* PR-95: Run metrics V2 panel (5-min buckets, peakRunning, p95) */}
      <div className="mb-6" data-testid="metrics-panel-v2-container">
        <FactoryRunMetricsPanelV2 runId={runId} />
      </div>

      {/* PR-93: Rerun action panel */}
      {run.status !== "running" && run.attempts.length > 0 && (
        <FactoryRerunPanel
          projectId={projectId}
          runId={runId}
          failedCount={run.counts.failed}
          selectedTaskIds={Array.from(selectedTaskIds)}
        />
      )}

      <div className="rounded-lg border bg-card" data-testid="attempts-list">
        <div className="border-b px-4 py-3">
          <h2 className="font-medium">Attempts ({run.attempts.length})</h2>
        </div>
        {run.attempts.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">No attempts yet</div>
        ) : (
          run.attempts.map((attempt) => (
            <AttemptRow
              key={attempt.id}
              attempt={attempt}
              projectId={projectId}
              selected={selectedTaskIds.has(attempt.taskId)}
              onToggle={handleToggleTask}
            />
          ))
        )}
      </div>
    </div>
  );
}
