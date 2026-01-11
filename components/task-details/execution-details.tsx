/**
 * ExecutionDetails - Display execution metadata for an attempt
 *
 * Responsibility: Show git info, workspace path, merge status, timing
 * Props-driven, no internal state or side effects
 */

import { Attempt } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Copy } from "lucide-react";

interface ExecutionDetailsProps {
  attempt: Attempt;
  onCopyToClipboard: (text: string) => void;
}

export function ExecutionDetails({ attempt, onCopyToClipboard }: ExecutionDetailsProps) {
  return (
    <div className="space-y-2" data-testid="execution-details">
      <div className="flex items-center justify-between pb-1">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Execution Details
        </h3>
        <Badge
          variant={attempt.status === "running" ? "default" : attempt.status === "completed" ? "secondary" : "destructive"}
          className={`text-[10px] h-5 px-2 font-semibold ${attempt.status === "running" ? "animate-pulse bg-blue-600 dark:bg-blue-500" : ""}`}
        >
          {attempt.status.toUpperCase()}
        </Badge>
      </div>
      <div className="space-y-2 text-xs bg-muted/30 rounded-md p-2">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground/70">Started</span>
          <span className="font-mono text-[11px]">
            {attempt.startedAt.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground/70">Agent</span>
          <span className="font-medium" data-testid="agent-role">
            {attempt.status === "running" && "🤖 "}
            {attempt.agent}
            {attempt.status === "running" && " is working..."}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground/70">Base Branch</span>
          <code className="text-[11px] bg-background px-1.5 py-0.5 rounded">{attempt.baseBranch}</code>
        </div>
        {attempt.branchName && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground/70">Branch</span>
            <button
              onClick={() => onCopyToClipboard(attempt.branchName!)}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-background text-[11px] font-mono"
            >
              <span className="truncate max-w-[260px]">{attempt.branchName}</span>
              <Copy className="h-3 w-3 shrink-0" />
            </button>
          </div>
        )}
        {attempt.baseCommit && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground/70">Base Commit</span>
            <button
              onClick={() => onCopyToClipboard(attempt.baseCommit!)}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-background text-[11px] font-mono"
            >
              <span>{attempt.baseCommit.slice(0, 8)}</span>
              <Copy className="h-3 w-3 shrink-0" />
            </button>
          </div>
        )}
        {attempt.headCommit && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground/70">Head Commit</span>
            <button
              onClick={() => onCopyToClipboard(attempt.headCommit!)}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-background text-[11px] font-mono"
            >
              <span>{attempt.headCommit.slice(0, 8)}</span>
              <Copy className="h-3 w-3 shrink-0" />
            </button>
          </div>
        )}
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground/70">Merge Status</span>
          <Badge
            variant={attempt.mergeStatus === "merged" ? "default" : "outline"}
            className={`text-[10px] h-4 px-1.5 ${attempt.mergeStatus === "merged" ? "bg-green-600" : ""}`}
          >
            {attempt.mergeStatus.replace("_", " ")}
          </Badge>
        </div>
        {attempt.appliedAt && (
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground/70">Applied</span>
            <span className="font-mono text-[11px] text-green-600">
              {new Date(attempt.appliedAt).toLocaleString()}
            </span>
          </div>
        )}
        {attempt.applyError && (
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground/70">Apply Error</span>
            <span className="text-[11px] text-red-500 truncate max-w-[240px]">
              {attempt.applyError}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground/70">Workspace</span>
          <button
            onClick={() => onCopyToClipboard(attempt.worktreePath)}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-background text-[11px] font-mono"
          >
            <span className="truncate max-w-[240px]">{attempt.worktreePath}</span>
            <Copy className="h-3 w-3 shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
}
