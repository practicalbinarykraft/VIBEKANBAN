/** FactoryRunResultsPanel (PR-88, PR-98) - Factory run results dashboard */
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, FileText, RotateCcw, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import type { FactoryRunResultsDTO, ResultItem } from "@/server/services/factory/factory-run-results.service";
import { FactoryPrStatusCell } from "./factory-pr-status-cell";
import type { PrCheckStatus } from "@/server/services/factory/factory-pr-checks.service";

interface FactoryRunResultsPanelProps {
  results: FactoryRunResultsDTO | null;
  isLoading: boolean;
  error: string | null;
  onRetry: (taskId: string) => void;
  onOpenLogs: (attemptId: string) => void;
  prCheckStatusMap?: Record<string, PrCheckStatus>; // PR-98: taskId → CI status
  prChecksLoading?: boolean; // PR-98
}

function StatusBadge({ status, attemptId }: { status?: string; attemptId?: string }) {
  const variant = status === "completed" ? "default" :
    status === "failed" ? "destructive" :
    status === "running" ? "secondary" : "outline";
  return (
    <Badge variant={variant} data-testid={attemptId ? `status-badge-${attemptId}` : undefined}>
      {status || "pending"}
    </Badge>
  );
}

function ResultItemRow({ item, onRetry, onOpenLogs, prCheckStatus, prChecksLoading }: {
  item: ResultItem;
  onRetry: (taskId: string) => void;
  onOpenLogs: (attemptId: string) => void;
  prCheckStatus?: PrCheckStatus;
  prChecksLoading?: boolean;
}) {
  const isFailed = item.attemptStatus === "failed";

  return (
    <div className="border rounded-md p-3 space-y-2" data-testid={`result-item-${item.taskId}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <StatusBadge status={item.attemptStatus} attemptId={item.attemptId} />
          <span className="font-medium text-sm truncate">{item.taskTitle}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {/* PR-98: Show CI status cell instead of simple PR button */}
          {item.prUrl ? (
            <FactoryPrStatusCell
              status={prCheckStatus ?? null}
              prUrl={item.prUrl}
              isLoading={prChecksLoading}
            />
          ) : null}
          {item.attemptId && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onOpenLogs(item.attemptId!)}
              data-testid={`logs-button-${item.attemptId}`}
            >
              <FileText className="h-3 w-3 mr-1" />
              Logs
            </Button>
          )}
          {isFailed && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onRetry(item.taskId)}
              data-testid={`retry-button-${item.taskId}`}
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          )}
        </div>
      </div>

      {isFailed && item.errorMessage && (
        <div className="text-xs text-destructive flex items-start gap-1">
          <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
          <span>{item.errorMessage}</span>
        </div>
      )}

      {isFailed && item.guidance && (
        <div className="bg-muted/50 rounded p-2 text-xs space-y-1">
          <div className="font-medium">{item.guidance.title}</div>
          <ul className="list-disc list-inside text-muted-foreground">
            {item.guidance.bullets.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

export function FactoryRunResultsPanel({
  results, isLoading, error, onRetry, onOpenLogs, prCheckStatusMap, prChecksLoading,
}: FactoryRunResultsPanelProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card p-4" data-testid="factory-run-results-panel">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading results...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border bg-card p-4" data-testid="factory-run-results-panel">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="rounded-lg border bg-card p-4" data-testid="factory-run-results-panel">
        <span className="text-sm text-muted-foreground">No results</span>
      </div>
    );
  }

  const { counts, items } = results;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3" data-testid="factory-run-results-panel">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Run Results</span>
        <div className="flex items-center gap-2">
          {counts.ok > 0 && (
            <Badge variant="default" className="gap-1">
              <CheckCircle className="h-3 w-3" />
              {counts.ok} ok
            </Badge>
          )}
          {counts.failed > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              {counts.failed} failed
            </Badge>
          )}
          {counts.running > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              {counts.running} running
            </Badge>
          )}
          {counts.queued > 0 && (
            <Badge variant="outline">{counts.queued} queued</Badge>
          )}
        </div>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {items.map((item) => (
          <ResultItemRow
            key={item.taskId}
            item={item}
            onRetry={onRetry}
            onOpenLogs={onOpenLogs}
            prCheckStatus={prCheckStatusMap?.[item.taskId]}
            prChecksLoading={prChecksLoading}
          />
        ))}
      </div>
    </div>
  );
}
