/**
 * PRPreview - Display PR information for completed attempts
 *
 * Responsibility: Show PR details (number, URL, status), Create PR action, and Sync PR status
 * Props-driven, no internal state or side effects
 */

import { Button } from "@/components/ui/button";
import { ExternalLink, GitPullRequest, RefreshCw } from "lucide-react";
import { Attempt } from "@/types";

interface PRPreviewProps {
  attempt: Attempt;
  isCreating: boolean;
  onCreatePR: () => void;
  // PR sync props (optional for backward compatibility)
  isSyncingPR?: boolean;
  onSyncPR?: () => void;
  syncError?: string | null;
  permissionError?: string | null;
}

export function PRPreview({
  attempt,
  isCreating,
  onCreatePR,
  isSyncingPR = false,
  onSyncPR,
  syncError,
  permissionError
}: PRPreviewProps) {
  const hasPR = !!attempt.prUrl;

  // Status badge styling
  const statusStyles = {
    open: "bg-green-600/10 text-green-600 border-green-600/30",
    merged: "bg-purple-600/10 text-purple-600 border-purple-600/30",
    closed: "bg-red-600/10 text-red-600 border-red-600/30",
  };

  const statusStyle = attempt.prStatus ? statusStyles[attempt.prStatus] : statusStyles.open;

  return (
    <div
      className="rounded-lg border border-border bg-card p-3 space-y-2"
      data-testid="pr-preview"
    >
      <div className="flex items-center gap-2">
        <GitPullRequest className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-semibold text-foreground">Pull Request</span>
      </div>

      {hasPR ? (
        <>
          {/* PR Link */}
          <a
            href={attempt.prUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-primary hover:underline"
            data-testid="pr-link"
          >
            <span>PR #{attempt.prNumber}</span>
            <ExternalLink className="h-3 w-3" />
          </a>

          {/* PR Status Badge */}
          {attempt.prStatus && (
            <div
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusStyle}`}
              data-testid="pr-status-badge"
            >
              {attempt.prStatus.charAt(0).toUpperCase() + attempt.prStatus.slice(1)}
            </div>
          )}

          {/* Sync PR Status Button */}
          {onSyncPR && (
            <Button
              onClick={onSyncPR}
              size="sm"
              variant="outline"
              className="w-full h-7 text-xs"
              disabled={isSyncingPR}
              data-testid="sync-pr-button"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isSyncingPR ? 'animate-spin' : ''}`} />
              {isSyncingPR ? "Syncing..." : "Sync PR Status"}
            </Button>
          )}

          {/* Sync Error */}
          {syncError && (
            <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded px-2 py-1">
              {syncError}
            </div>
          )}

          {/* PR Info */}
          <div className="text-xs text-muted-foreground">
            <p>Target: main</p>
            <p>Branch: {attempt.branchName}</p>
          </div>
        </>
      ) : (
        <>
          {/* Create PR Button */}
          <Button
            onClick={onCreatePR}
            size="sm"
            variant="outline"
            className="w-full h-8 text-xs"
            disabled={isCreating || !!permissionError}
            data-testid="create-pr-button"
          >
            {isCreating ? "Creating PR..." : "Create PR"}
          </Button>

          {/* Permission Error */}
          {permissionError && (
            <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded px-2 py-1.5">
              {permissionError}
            </div>
          )}

          {/* Info text */}
          <p className="text-xs text-muted-foreground">
            Create a pull request from this attempt's changes
          </p>
        </>
      )}
    </div>
  );
}
