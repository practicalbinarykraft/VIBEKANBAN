/** FactoryControlsPanel (PR-83, PR-91) - Factory start/stop controls with progress */
"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, Square, Factory, ExternalLink, History } from "lucide-react";
import { useFactoryRuns, type FactoryRunSummary } from "@/hooks/useFactoryRuns";
import type { FactoryRunStatus } from "@/server/services/factory/factory-status.service";

interface FactoryControlsPanelProps {
  projectId: string;
  status: FactoryRunStatus;
  total: number;
  completed: number;
  failed: number;
  cancelled: number;
  running: number;
  queued: number;
  runId: string | null;
  isLoading: boolean;
  isStarting: boolean;
  isStopping: boolean;
  error: string | null;
  onStart: (maxParallel: number) => void;
  onStop: () => void;
}

const STATUS_COLORS: Record<FactoryRunStatus, string> = {
  idle: "text-muted-foreground",
  running: "text-blue-600 dark:text-blue-400",
  completed: "text-green-600 dark:text-green-400",
  failed: "text-red-600 dark:text-red-400",
  cancelled: "text-amber-600 dark:text-amber-400",
};

function RunHistoryItem({ run, projectId }: { run: FactoryRunSummary; projectId: string }) {
  const variant = run.status === "completed" ? "default" :
    run.status === "failed" ? "destructive" :
    run.status === "running" ? "secondary" : "outline";
  const dateStr = new Date(run.startedAt).toLocaleDateString();

  return (
    <Link
      href={`/projects/${projectId}/factory/runs/${run.id}`}
      className="flex items-center justify-between py-1 hover:bg-muted/50 rounded px-1"
      data-testid={`run-history-${run.id}`}
    >
      <span className="text-xs text-muted-foreground">{dateStr}</span>
      <Badge variant={variant} className="text-xs">{run.status}</Badge>
    </Link>
  );
}

export function FactoryControlsPanel({
  projectId, status, total, completed, failed, cancelled, running, queued, runId,
  isLoading, isStarting, isStopping, error, onStart, onStop,
}: FactoryControlsPanelProps) {
  const [maxParallel, setMaxParallel] = useState(3);
  const { runs } = useFactoryRuns(projectId, 5);
  const isRunning = status === "running";
  const canStart = !isRunning && !isStarting && !isLoading;
  const canStop = isRunning && !isStopping;

  const handleStart = () => { onStart(maxParallel); };

  return (
    <div className="rounded-lg border bg-card p-4" data-testid="factory-controls-panel">
      <div className="flex items-center gap-2 mb-3">
        <Factory className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-medium">Factory</h3>
        <span className={`text-sm font-medium uppercase ${STATUS_COLORS[status]}`}>
          {status}
        </span>
      </div>

      {(total > 0 || isRunning) && (
        <div className="mb-3 text-sm text-muted-foreground grid grid-cols-3 gap-2">
          <div>Completed: <span className="font-medium text-foreground">{completed}/{total}</span></div>
          <div>Running: <span className="font-medium text-foreground">{running}</span></div>
          <div>Queued: <span className="font-medium text-foreground">{queued}</span></div>
          {failed > 0 && <div className="text-red-600">Failed: {failed}</div>}
          {cancelled > 0 && <div className="text-amber-600">Cancelled: {cancelled}</div>}
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Input
            type="number" min={1} max={20} value={maxParallel}
            onChange={(e) => setMaxParallel(Math.min(20, Math.max(1, Number(e.target.value))))}
            className="w-16 h-9" disabled={isRunning}
            data-testid="factory-max-parallel-input"
          />
          <span className="text-xs text-muted-foreground">parallel</span>
        </div>

        <Button onClick={handleStart} disabled={!canStart} size="sm" data-testid="factory-start-button">
          {isStarting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Play className="mr-1 h-4 w-4" />}
          Start
        </Button>

        <Button onClick={onStop} disabled={!canStop} size="sm" variant="destructive" data-testid="factory-stop-button">
          {isStopping ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Square className="mr-1 h-4 w-4" />}
          Stop
        </Button>
      </div>

      {error && (
        <div className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</div>
      )}

      {runId && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">
            Run: <code className="bg-muted px-1 rounded">{runId.slice(0, 8)}</code>
          </span>
          <Link
            href={`/projects/${projectId}/factory/runs/${runId}`}
            className="flex items-center gap-1 text-blue-600 hover:underline"
            data-testid="view-run-details"
          >
            <ExternalLink className="h-3 w-3" />
            View details
          </Link>
        </div>
      )}

      {runs.length > 0 && (
        <div className="mt-3 pt-3 border-t">
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
            <History className="h-3 w-3" />
            Recent runs
          </div>
          <div className="space-y-1">
            {runs.slice(0, 3).map((r) => (
              <RunHistoryItem key={r.id} run={r} projectId={projectId} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
