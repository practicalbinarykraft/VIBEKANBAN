/**
 * AttemptLogModal Component (PR-61)
 *
 * Modal dialog for displaying attempt details and logs.
 * Props-driven, no direct API calls.
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { AttemptLogModalProps, AutopilotAttemptStatus } from "@/types/autopilot";

const statusVariants: Record<AutopilotAttemptStatus, "default" | "secondary" | "destructive" | "outline"> = {
  queued: "secondary",
  running: "default",
  done: "outline",
  failed: "destructive",
};

export function AttemptLogModal({ isOpen, attempt, onClose }: AttemptLogModalProps) {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent data-testid="attempt-modal" className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Attempt Details
            {attempt && (
              <Badge variant={statusVariants[attempt.status]} className="text-xs">
                {attempt.status}
              </Badge>
            )}
          </DialogTitle>
          {attempt && (
            <DialogDescription>
              {new Date(attempt.createdAt).toLocaleString()} • ID: {attempt.id}
            </DialogDescription>
          )}
        </DialogHeader>

        {!attempt ? (
          <div className="py-4 text-center text-muted-foreground">
            No attempt data available
          </div>
        ) : (
          <div className="space-y-4 overflow-y-auto">
            {attempt.resultSummary && (
              <div>
                <h4 className="mb-1 text-sm font-medium">Result</h4>
                <p className="text-sm text-muted-foreground">{attempt.resultSummary}</p>
              </div>
            )}

            <div>
              <h4 className="mb-1 text-sm font-medium">Logs</h4>
              {attempt.logs ? (
                <pre
                  data-testid="attempt-logs"
                  className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs font-mono whitespace-pre-wrap"
                >
                  {attempt.logs}
                </pre>
              ) : (
                <p className="text-sm text-muted-foreground">No logs available</p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
