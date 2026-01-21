/** FactoryRunMetricsPanelV2 (PR-95) - Display run metrics with 5-min buckets */
"use client";

import { TrendingUp, Timer, Zap, Users } from "lucide-react";
import { useFactoryRunMetricsV2 } from "@/hooks/useFactoryRunMetricsV2";

interface FactoryRunMetricsPanelV2Props {
  runId: string;
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function FactoryRunMetricsPanelV2({ runId }: FactoryRunMetricsPanelV2Props) {
  const { data, loading, error } = useFactoryRunMetricsV2(runId);

  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-4" data-testid="metrics-panel">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border bg-card p-4" data-testid="metrics-panel">
        <div className="text-sm text-destructive">Failed to load metrics</div>
      </div>
    );
  }

  if (!data || data.totals.started === 0) {
    return (
      <div className="rounded-lg border bg-card p-4" data-testid="metrics-panel">
        <div className="text-sm text-muted-foreground">No attempts yet</div>
      </div>
    );
  }

  const { timing, timeline } = data;
  const displayTimeline = timeline.slice(-12);

  return (
    <div className="rounded-lg border bg-card" data-testid="metrics-panel">
      <div className="border-b px-4 py-3">
        <h3 className="font-medium text-sm">Metrics</h3>
      </div>

      <div className="p-4 space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3 text-center">
          <div className="p-2 bg-muted/50 rounded">
            <div className="flex items-center justify-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <span className="text-sm font-semibold" data-testid="throughput-value">
                {timing.throughputPerMin ?? "—"}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">tasks/min</div>
          </div>

          <div className="p-2 bg-muted/50 rounded">
            <div className="flex items-center justify-center gap-1">
              <Timer className="h-3 w-3 text-blue-600" />
              <span className="text-sm font-semibold" data-testid="avg-duration-value">
                {formatDuration(timing.avgDurationSec)}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">avg</div>
          </div>

          <div className="p-2 bg-muted/50 rounded">
            <div className="flex items-center justify-center gap-1">
              <Zap className="h-3 w-3 text-amber-600" />
              <span className="text-sm font-semibold" data-testid="p95-duration-value">
                {formatDuration(timing.p95DurationSec)}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">p95</div>
          </div>

          <div className="p-2 bg-muted/50 rounded">
            <div className="flex items-center justify-center gap-1">
              <Users className="h-3 w-3 text-purple-600" />
              <span className="text-sm font-semibold" data-testid="peak-running-value">
                {timing.peakRunning}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">peak</div>
          </div>
        </div>

        {/* Timeline */}
        {displayTimeline.length > 0 && (
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2">Timeline (5-min)</div>
            <div className="border rounded max-h-40 overflow-y-auto">
              {displayTimeline.map((bucket) => (
                <div
                  key={bucket.t}
                  className="flex items-center justify-between py-1 px-2 text-xs border-b last:border-b-0"
                  data-testid={`timeline-row-${bucket.t}`}
                >
                  <span className="text-muted-foreground font-mono">{formatTime(bucket.t)}</span>
                  <div className="flex items-center gap-2">
                    {bucket.started > 0 && <span className="text-blue-600">+{bucket.started}</span>}
                    {bucket.completed > 0 && <span className="text-green-600">✓{bucket.completed}</span>}
                    {bucket.failed > 0 && <span className="text-red-600">✗{bucket.failed}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
