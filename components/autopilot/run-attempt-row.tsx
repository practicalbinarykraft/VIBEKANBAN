/**
 * RunAttemptRow (PR-75) - Single attempt row with expandable details
 */
"use client";

import { Badge } from "@/components/ui/badge";
import { ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { useAttemptDetails } from "@/hooks/useAttemptDetails";
import { useAttemptLogs } from "@/hooks/useAttemptLogs";
import { AttemptDetailsPanel } from "./attempt-details-panel";
import type { AttemptSummary } from "@/types/autopilot-run";

interface RunAttemptRowProps {
  attempt: AttemptSummary;
  projectId: string;
  isExpanded: boolean;
  onToggle: () => void;
}

function formatDuration(start: string | null, end: string | null): string {
  if (!start) return "—";
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : new Date();
  const ms = endDate.getTime() - startDate.getTime();
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

const statusColors: Record<string, string> = {
  completed: "text-green-600",
  failed: "text-red-500",
  running: "text-blue-500",
  queued: "text-muted-foreground",
  stopped: "text-muted-foreground",
  pending: "text-muted-foreground",
};

const statusIcons: Record<string, string> = {
  completed: "✓",
  failed: "✗",
  running: "⟳",
  queued: "◯",
  stopped: "□",
  pending: "◯",
};

function AttemptDetailsPanelWrapper({ projectId, attemptId, onClose }: {
  projectId: string;
  attemptId: string;
  onClose: () => void;
}) {
  const { attempt, isLoading, isRunning } = useAttemptDetails(projectId, attemptId);
  const { lines, isLoading: logsLoading } = useAttemptLogs(projectId, attemptId, isRunning);

  return (
    <div className="border-t bg-muted/20 p-4">
      <AttemptDetailsPanel
        attempt={attempt}
        logs={lines}
        isLoading={isLoading}
        logsLoading={logsLoading}
        onClose={onClose}
      />
    </div>
  );
}

export function RunAttemptRow({ attempt, projectId, isExpanded, onToggle }: RunAttemptRowProps) {
  return (
    <div className="border-b last:border-b-0">
      <button
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50"
        onClick={onToggle}
        data-testid={`attempt-row-${attempt.attemptId}`}
      >
        <div className="flex items-center gap-3">
          <span className={`text-lg ${statusColors[attempt.status]}`}>
            {statusIcons[attempt.status]}
          </span>
          <span className="font-medium">{attempt.taskTitle}</span>
          <Badge variant="secondary" className="text-xs">
            {attempt.status}
          </Badge>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {formatDuration(attempt.startedAt, attempt.finishedAt)}
          </span>
          {attempt.prUrl && (
            <a
              href={attempt.prUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>
      {isExpanded && (
        <AttemptDetailsPanelWrapper
          projectId={projectId}
          attemptId={attempt.attemptId}
          onClose={onToggle}
        />
      )}
    </div>
  );
}
