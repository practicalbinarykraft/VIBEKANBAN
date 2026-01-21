/** FactoryAttemptRow (PR-90) - Attempt row with summary for factory results */
"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, FileText, AlertCircle } from "lucide-react";
import { useAttemptSummary } from "@/hooks/useAttemptSummary";
import type { FactoryAttemptResult } from "@/server/services/factory/factory-results.service";

interface FactoryAttemptRowProps {
  attempt: FactoryAttemptResult;
  projectId: string;
}

function getStatusVariant(status: string) {
  if (status === "completed") return "default";
  if (status === "failed") return "destructive";
  if (status === "running") return "secondary";
  return "outline";
}

export function FactoryAttemptRow({ attempt, projectId }: FactoryAttemptRowProps) {
  const { data: summary } = useAttemptSummary(attempt.attemptId);

  const statusVariant = getStatusVariant(attempt.status);
  const attemptUrl = `/projects/${projectId}?task=${attempt.taskId}&attempt=${attempt.attemptId}`;

  return (
    <div className="py-1.5 border-b last:border-b-0" data-testid={`attempt-row-${attempt.attemptId}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Task #{attempt.taskId}</span>
          <Badge variant={statusVariant} className="text-xs">{attempt.status}</Badge>
        </div>
        <div className="flex items-center gap-1">
          {attempt.prUrl && (
            <a
              href={attempt.prUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-testid={`pr-link-${attempt.attemptId}`}
            >
              <Button variant="ghost" size="sm" className="h-6 text-xs">
                <ExternalLink className="h-3 w-3 mr-1" />
                PR
              </Button>
            </a>
          )}
          <Link href={attemptUrl} data-testid={`open-attempt-${attempt.attemptId}`}>
            <Button variant="ghost" size="sm" className="h-6 text-xs">
              <FileText className="h-3 w-3 mr-1" />
              Open
            </Button>
          </Link>
        </div>
      </div>
      {/* Last log line */}
      {summary?.lastLogLine && (
        <div
          className="mt-1 text-xs text-muted-foreground truncate max-w-full"
          data-testid={`last-log-${attempt.attemptId}`}
          title={summary.lastLogLine}
        >
          {summary.lastLogLine}
        </div>
      )}
      {/* Error message */}
      {summary?.errorMessage && (
        <div
          className="mt-1 flex items-center gap-1 text-xs text-destructive truncate max-w-full"
          data-testid={`error-${attempt.attemptId}`}
          title={summary.errorMessage}
        >
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">Error: {summary.errorMessage}</span>
        </div>
      )}
    </div>
  );
}
