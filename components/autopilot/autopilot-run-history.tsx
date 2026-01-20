/** Autopilot Run History (PR-65) - Display run history and details */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import type { RunSummary, RunDetails, RunError, RunStatus } from "@/types/autopilot-run";

interface AutopilotRunHistoryProps {
  runs: RunSummary[];
  isLoading: boolean;
  selectedRun: RunDetails | null;
  selectedRunLoading: boolean;
  onSelectRun: (runId: string) => void;
  onCloseDetails: () => void;
}

const statusVariants: Record<RunStatus, "default" | "secondary" | "destructive" | "outline"> = {
  idle: "secondary",
  running: "default",
  stopped: "secondary",
  failed: "destructive",
  done: "outline",
};

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

function ErrorList({ errors, maxShow = 3 }: { errors: RunError[]; maxShow?: number }) {
  const [showAll, setShowAll] = useState(false);
  const displayed = showAll ? errors : errors.slice(0, maxShow);
  const hasMore = errors.length > maxShow;

  if (errors.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-destructive">
        <AlertCircle className="h-4 w-4" />
        Failed: {errors.length} task{errors.length !== 1 ? "s" : ""}
      </div>
      <div className="space-y-1 text-sm">
        {displayed.map((err, i) => (
          <div key={i} className="rounded bg-destructive/10 px-2 py-1 text-destructive">
            {err.taskTitle && <span className="font-medium">{err.taskTitle}: </span>}
            {err.message}
          </div>
        ))}
        {hasMore && !showAll && (
          <Button variant="ghost" size="sm" onClick={() => setShowAll(true)}>
            Show {errors.length - maxShow} more...
          </Button>
        )}
      </div>
    </div>
  );
}

function RunItem({
  run,
  isSelected,
  details,
  detailsLoading,
  onSelect,
  onClose,
}: {
  run: RunSummary;
  isSelected: boolean;
  details: RunDetails | null;
  detailsLoading: boolean;
  onSelect: () => void;
  onClose: () => void;
}) {
  return (
    <div className="border-b last:border-b-0">
      <button
        className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted/50"
        onClick={isSelected ? onClose : onSelect}
        data-testid={`run-item-${run.runId}`}
      >
        <div className="flex items-center gap-3">
          <Badge variant={statusVariants[run.status]}>{run.status}</Badge>
          <span className="text-sm text-muted-foreground">{formatTime(run.startedAt)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {run.doneTasks}/{run.totalTasks} done
            {run.failedTasks > 0 && <span className="text-destructive"> • {run.failedTasks} failed</span>}
          </span>
          {isSelected ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>
      {isSelected && (
        <div className="bg-muted/30 px-3 py-2">
          {detailsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading details...
            </div>
          ) : details ? (
            <div>
              <div className="mb-2 text-sm">
                <span className="text-muted-foreground">Attempts: </span>
                {details.attempts.length}
              </div>
              <ErrorList errors={details.errors} />
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No details available</div>
          )}
        </div>
      )}
    </div>
  );
}

export function AutopilotRunHistory({
  runs,
  isLoading,
  selectedRun,
  selectedRunLoading,
  onSelectRun,
  onCloseDetails,
}: AutopilotRunHistoryProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = (runId: string) => {
    setSelectedId(runId);
    onSelectRun(runId);
  };

  const handleClose = () => {
    setSelectedId(null);
    onCloseDetails();
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card p-4" data-testid="run-history-loading">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading run history...
        </div>
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        No runs yet
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b px-4 py-3">
        <h3 className="font-medium">Run History</h3>
      </div>
      <div data-testid="run-history-list">
        {runs.map((run) => (
          <RunItem
            key={run.runId}
            run={run}
            isSelected={selectedId === run.runId}
            details={selectedId === run.runId ? selectedRun : null}
            detailsLoading={selectedId === run.runId && selectedRunLoading}
            onSelect={() => handleSelect(run.runId)}
            onClose={handleClose}
          />
        ))}
      </div>
    </div>
  );
}
