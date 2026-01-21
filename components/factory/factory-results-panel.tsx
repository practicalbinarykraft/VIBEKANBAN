/** FactoryResultsPanel (PR-89, PR-90) - Display factory run results inline */
"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, Factory } from "lucide-react";
import { FactoryAttemptRow } from "./factory-attempt-row";
import type { FactoryResultsResponse } from "@/server/services/factory/factory-results.service";

interface FactoryResultsPanelProps {
  data: FactoryResultsResponse | null;
  loading: boolean;
  error: string | null;
  projectId: string;
}

function StatusBadge({ status }: { status: string }) {
  const variant = status === "completed" ? "default" :
    status === "failed" ? "destructive" :
    status === "running" ? "secondary" : "outline";
  return <Badge variant={variant} data-testid="status-badge">{status}</Badge>;
}

export function FactoryResultsPanel({ data, loading, error, projectId }: FactoryResultsPanelProps) {
  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-3" data-testid="factory-results-panel">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading factory results...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border bg-card p-3" data-testid="factory-results-panel">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  if (!data || data.status === "idle" || !data.runId) {
    return (
      <div className="rounded-lg border bg-card p-3" data-testid="factory-results-panel">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Factory className="h-4 w-4" />
          <span className="text-sm">No factory run yet</span>
        </div>
      </div>
    );
  }

  const { totals, attempts, runId, status } = data;

  return (
    <div className="rounded-lg border bg-card p-3 space-y-2" data-testid="factory-results-panel">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Factory className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Factory results</span>
          <StatusBadge status={status} />
        </div>
        <Link href={`/projects/${projectId}/autopilot/runs/${runId}`} data-testid="open-run-button">
          <Button variant="outline" size="sm" className="h-7 text-xs">
            Open run
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <Badge variant="outline">{totals.queued} queued</Badge>
        <Badge variant="secondary">{totals.running} running</Badge>
        <Badge variant="default">{totals.completed} completed</Badge>
        <Badge variant="destructive">{totals.failed} failed</Badge>
      </div>

      {attempts.length > 0 && (
        <div className="max-h-[200px] overflow-y-auto border rounded p-2 bg-muted/20">
          {attempts.map((a) => <FactoryAttemptRow key={a.attemptId} attempt={a} projectId={projectId} />)}
        </div>
      )}
    </div>
  );
}
