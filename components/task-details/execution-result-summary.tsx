/**
 * Execution Result Summary
 *
 * Displays the execution result from attempt artifacts.
 * Shows: status, diff summary, changed files, PR link
 * Uses human-readable error messages.
 */

"use client";

import Link from "next/link";
import { AlertCircle, CheckCircle, ExternalLink, FileCode, GitBranch, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getFriendlyError } from "@/lib/friendly-errors";
import type { ExecutionResult } from "@/types/execution-result";

interface ExecutionResultSummaryProps {
  result: ExecutionResult | null;
  prUrl?: string | null;
}

export function ExecutionResultSummary({ result, prUrl }: ExecutionResultSummaryProps) {
  if (!result) return null;

  const displayPrUrl = result.prUrl || prUrl;

  return (
    <div
      className={`rounded-lg border p-3 ${
        result.ok
          ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950"
          : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950"
      }`}
      data-testid="execution-result-summary"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        {result.ok ? (
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
        ) : (
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
        )}
        <span className="font-medium text-sm">
          {result.ok ? "Execution Successful" : "Execution Failed"}
        </span>
        {result.error && (
          <Badge variant="destructive" className="text-[10px]">
            {result.error.code}
          </Badge>
        )}
      </div>

      {/* Error message with friendly text */}
      {result.error && (() => {
        const friendly = getFriendlyError(result.error.code);
        return (
          <div className="mb-2">
            <p className="text-xs text-red-700 dark:text-red-300">
              {friendly.message}
            </p>
            {friendly.action && (
              <div className="mt-1">
                {friendly.actionUrl ? (
                  <Link
                    href={friendly.actionUrl}
                    className="inline-flex items-center gap-1 text-[10px] font-medium text-red-700 hover:text-red-900 dark:text-red-300 dark:hover:text-red-100"
                  >
                    {friendly.action}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                ) : (
                  <span className="text-[10px] text-red-600 dark:text-red-400">
                    {friendly.action}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* Diff summary */}
      {result.diffSummary && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <FileCode className="h-3 w-3" />
          <span>{result.diffSummary}</span>
        </div>
      )}

      {/* Changed files */}
      {result.changedFiles && result.changedFiles.length > 0 && (
        <div className="mb-2">
          <p className="text-[10px] text-muted-foreground mb-1">Changed files:</p>
          <div className="flex flex-wrap gap-1">
            {result.changedFiles.slice(0, 5).map((file) => (
              <Badge key={file.path} variant="secondary" className="text-[10px] font-mono">
                {file.path.split("/").pop()}
                {file.additions !== undefined && (
                  <span className="ml-1 text-green-600">+{file.additions}</span>
                )}
                {file.deletions !== undefined && (
                  <span className="ml-1 text-red-600">-{file.deletions}</span>
                )}
              </Badge>
            ))}
            {result.changedFiles.length > 5 && (
              <Badge variant="outline" className="text-[10px]">
                +{result.changedFiles.length - 5} more
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Branch & Commit */}
      {(result.branchName || result.commitSha) && (
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground mb-2">
          {result.branchName && (
            <span className="flex items-center gap-1">
              <GitBranch className="h-3 w-3" />
              {result.branchName}
            </span>
          )}
          {result.commitSha && (
            <span className="font-mono">{result.commitSha.slice(0, 7)}</span>
          )}
        </div>
      )}

      {/* PR Link */}
      {displayPrUrl && (
        <a
          href={displayPrUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
        >
          <ExternalLink className="h-3 w-3" />
          View Pull Request
        </a>
      )}
    </div>
  );
}

/**
 * Parse ExecutionResult from artifact content
 */
export function parseExecutionResult(content: string): ExecutionResult | null {
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}
