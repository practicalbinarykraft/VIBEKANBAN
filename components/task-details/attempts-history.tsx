/**
 * AttemptsHistory - List of execution attempts for a task
 *
 * Responsibility: Display list of attempts with stats and selection
 * Props-driven, navigation via callback, no internal state
 */

import { AttemptWithStats } from "@/types";
import { Badge } from "@/components/ui/badge";

interface AttemptsHistoryProps {
  attempts: AttemptWithStats[];
  selectedAttemptId: string | null;
  loading: boolean;
  onSelectAttempt: (attemptId: string) => void;
}

export function AttemptsHistory({
  attempts,
  selectedAttemptId,
  loading,
  onSelectAttempt,
}: AttemptsHistoryProps) {
  if (loading) {
    return (
      <div className="space-y-2 pt-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Attempts History
        </h3>
        <div className="flex items-center justify-center py-4">
          <p className="text-xs text-muted-foreground">Loading attempts...</p>
        </div>
      </div>
    );
  }

  if (attempts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 pt-2" data-testid="attempts-history">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Attempts History
      </h3>
      <div className="space-y-1 max-h-[200px] overflow-y-auto">
        {attempts.map((att) => {
          const duration = att.finishedAt
            ? Math.round((new Date(att.finishedAt).getTime() - new Date(att.startedAt).getTime()) / 1000)
            : null;
          const isActive = att.id === selectedAttemptId;

          return (
            <button
              key={att.id}
              onClick={() => onSelectAttempt(att.id)}
              data-testid={`attempt-item-${att.id}`}
              className={`w-full text-left rounded-md p-2 text-xs transition-colors ${
                isActive ? "bg-muted/60 border border-border" : "bg-muted/20 hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <Badge
                  variant={
                    att.status === "running" ? "default" :
                    att.status === "queued" ? "outline" :
                    att.status === "completed" ? "secondary" :
                    "destructive"
                  }
                  className="text-[9px] h-4 px-1.5 font-semibold"
                  data-testid="attempt-status"
                  data-status={att.status}
                >
                  {att.status.toUpperCase()}
                </Badge>
                <span className="text-[10px] text-muted-foreground font-mono">
                  #{att.id.slice(0, 8)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span>{new Date(att.startedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                {duration !== null && <span>· {duration}s</span>}
                <span>· {att.logsCount} logs</span>
                {att.artifactsCount > 0 && <span>· {att.artifactsCount} artifacts</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
