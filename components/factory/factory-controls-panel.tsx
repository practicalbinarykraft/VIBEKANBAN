/** FactoryControlsPanel (PR-83) - Factory start/stop controls with progress */
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Play, Square, Factory } from "lucide-react";
import type { FactoryRunStatus } from "@/server/services/factory/factory-status.service";

interface FactoryControlsPanelProps {
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

export function FactoryControlsPanel({
  status, total, completed, failed, cancelled, running, queued, runId,
  isLoading, isStarting, isStopping, error, onStart, onStop,
}: FactoryControlsPanelProps) {
  const [maxParallel, setMaxParallel] = useState(3);
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
        <div className="mt-2 text-xs text-muted-foreground">
          Run: <code className="bg-muted px-1 rounded">{runId.slice(0, 8)}</code>
        </div>
      )}
    </div>
  );
}
