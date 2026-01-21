/** FactoryRunMetricsPanelV2 (PR-95/96) - Display run metrics with chart and bottlenecks */
"use client";

import { useMemo } from "react";
import { TrendingUp, Timer, Zap, Users } from "lucide-react";
import { useFactoryRunMetricsV2 } from "@/hooks/useFactoryRunMetricsV2";
import { FactoryRunMetricsChart } from "./factory-run-metrics-chart";
import { FactoryRunBottlenecksPanel } from "./factory-run-bottlenecks-panel";
import { getFactoryRunBottlenecks } from "@/server/services/factory/factory-run-bottlenecks";

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
  const bottlenecks = useMemo(() => getFactoryRunBottlenecks(data), [data]);

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

        {/* Chart */}
        {displayTimeline.length > 0 && (
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2">Timeline (5-min)</div>
            <div className="overflow-x-auto">
              <FactoryRunMetricsChart timeline={displayTimeline} />
            </div>
          </div>
        )}

        {/* Bottlenecks */}
        <FactoryRunBottlenecksPanel hints={bottlenecks} />
      </div>
    </div>
  );
}
