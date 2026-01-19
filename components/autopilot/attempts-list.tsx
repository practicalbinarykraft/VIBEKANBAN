/**
 * AttemptsList Component (PR-61)
 *
 * Displays a list of autopilot attempt summaries.
 * Props-driven, no direct API calls.
 */

import { Badge } from "@/components/ui/badge";
import type { AttemptsListProps, AutopilotAttemptStatus } from "@/types/autopilot";

const statusVariants: Record<AutopilotAttemptStatus, "default" | "secondary" | "destructive" | "outline"> = {
  queued: "secondary",
  running: "default",
  done: "outline",
  failed: "destructive",
};

export function AttemptsList({ attempts, onOpen }: AttemptsListProps) {
  if (!attempts || attempts.length === 0) {
    return (
      <div data-testid="attempts-empty" className="py-4 text-center text-sm text-muted-foreground">
        No attempts yet
      </div>
    );
  }

  return (
    <div data-testid="attempts-list" className="divide-y">
      {attempts.map((attempt) => (
        <div
          key={attempt.id}
          data-testid="attempt-row"
          onClick={onOpen ? () => onOpen(attempt.id) : undefined}
          className={`flex items-center justify-between py-3 px-2 ${
            onOpen ? "cursor-pointer hover:bg-muted/50" : ""
          }`}
        >
          <div className="flex items-center gap-3">
            <Badge variant={statusVariants[attempt.status]} className="text-xs">
              {attempt.status}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {new Date(attempt.createdAt).toLocaleString()}
            </span>
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {attempt.id.slice(0, 8)}
          </span>
        </div>
      ))}
    </div>
  );
}
