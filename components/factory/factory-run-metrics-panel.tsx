/** FactoryRunMetricsPanel (PR-94) - Display run metrics: throughput, durations, timeline */
"use client";

import { Clock, TrendingUp, Timer, BarChart3 } from "lucide-react";
import type { FactoryRunMetrics, TimelineBucket } from "@/hooks/useFactoryRunMetrics";

interface FactoryRunMetricsPanelProps {
  metrics: FactoryRunMetrics | null;
  loading?: boolean;
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function TimelineRow({ bucket }: { bucket: TimelineBucket }) {
  return (
    <div
      className="flex items-center justify-between py-1.5 px-2 text-xs border-b last:border-b-0"
      data-testid={`timeline-row-${bucket.t}`}
    >
      <span className="text-muted-foreground font-mono">{formatTime(bucket.t)}</span>
      <div className="flex items-center gap-3">
        {bucket.started > 0 && (
          <span className="text-blue-600" data-testid="started-count">+{bucket.started} started</span>
        )}
        {bucket.completed > 0 && (
          <span className="text-green-600" data-testid="completed-count">✓{bucket.completed}</span>
        )}
        {bucket.failed > 0 && (
          <span className="text-red-600" data-testid="failed-count">✗{bucket.failed}</span>
        )}
      </div>
    </div>
  );
}

export function FactoryRunMetricsPanel({ metrics, loading = false }: FactoryRunMetricsPanelProps) {
  if (loading) {
    return (
      <div
        className="rounded-lg border bg-card p-4"
        data-testid="factory-run-metrics-panel"
      >
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted rounded w-1/3" />
          <div className="grid grid-cols-3 gap-4">
            <div className="h-12 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div
        className="rounded-lg border bg-card p-4 text-sm text-muted-foreground"
        data-testid="factory-run-metrics-panel"
      >
        No metrics available
      </div>
    );
  }

  const { counts, durationsSec, throughput, timeline } = metrics;

  return (
    <div
      className="rounded-lg border bg-card"
      data-testid="factory-run-metrics-panel"
    >
      <div className="border-b px-4 py-3 flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-medium text-sm">Run Metrics</h3>
      </div>

      <div className="p-4 space-y-4">
        {/* Throughput + Duration stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg" data-testid="throughput-stat">
            <div className="flex items-center justify-center gap-1 text-lg font-semibold">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span>{throughput.completedPerMinute}</span>
            </div>
            <div className="text-xs text-muted-foreground">tasks/min</div>
          </div>

          <div className="text-center p-3 bg-muted/50 rounded-lg" data-testid="avg-duration-stat">
            <div className="flex items-center justify-center gap-1 text-lg font-semibold">
              <Timer className="h-4 w-4 text-blue-600" />
              <span>{formatDuration(durationsSec.avg)}</span>
            </div>
            <div className="text-xs text-muted-foreground">avg duration</div>
          </div>

          <div className="text-center p-3 bg-muted/50 rounded-lg" data-testid="p90-duration-stat">
            <div className="flex items-center justify-center gap-1 text-lg font-semibold">
              <Clock className="h-4 w-4 text-amber-600" />
              <span>{formatDuration(durationsSec.p90)}</span>
            </div>
            <div className="text-xs text-muted-foreground">p90 duration</div>
          </div>
        </div>

        {/* Progress summary */}
        <div className="text-sm" data-testid="progress-summary">
          <span className="text-muted-foreground">Progress: </span>
          <span className="font-medium">
            {counts.completed + counts.failed} / {counts.total}
          </span>
          <span className="text-muted-foreground ml-1">
            ({counts.running} running, {counts.queued} queued)
          </span>
        </div>

        {/* Timeline list */}
        {timeline.length > 0 && (
          <div data-testid="timeline-section">
            <div className="text-xs font-medium text-muted-foreground mb-2">
              Timeline
            </div>
            <div className="border rounded-md max-h-48 overflow-y-auto">
              {timeline.map((bucket) => (
                <TimelineRow key={bucket.t} bucket={bucket} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
