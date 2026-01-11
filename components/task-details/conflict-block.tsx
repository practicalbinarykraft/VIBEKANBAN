/**
 * ConflictBlock - Display merge conflict information and resolution actions
 *
 * Responsibility: Show conflict warning, list conflicted files, and provide manual resolution actions
 * Props-driven, no internal state or side effects
 */

import { Button } from "@/components/ui/button";
import { AlertTriangle, FolderOpen } from "lucide-react";
import { useState } from "react";

interface ConflictBlockProps {
  conflictFiles: string[];
  worktreePath: string;
  isResolving: boolean;
  onMarkResolved: () => void;
}

export function ConflictBlock({
  conflictFiles,
  worktreePath,
  isResolving,
  onMarkResolved,
}: ConflictBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyWorkspace = () => {
    navigator.clipboard.writeText(`cd ${worktreePath}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3"
      data-testid="conflict-block"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-destructive" />
        <span className="text-sm font-semibold text-destructive">
          ⚠️ Merge conflict detected
        </span>
      </div>

      {/* Explanation */}
      <p className="text-xs text-muted-foreground leading-relaxed">
        These changes cannot be applied automatically. Resolve conflicts manually and retry.
      </p>

      {/* Conflicted Files List */}
      {conflictFiles.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-foreground">Conflicted files:</p>
          <ul
            className="space-y-1 text-xs text-muted-foreground font-mono"
            data-testid="conflict-files-list"
          >
            {conflictFiles.map((file, index) => (
              <li key={index} className="flex items-start gap-1.5">
                <span className="text-destructive mt-0.5">•</span>
                <span className="break-all">{file}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Workspace Command */}
      <div className="rounded border border-border bg-muted/30 p-2">
        <p className="text-xs font-medium text-foreground mb-1">Workspace location:</p>
        <code className="text-xs text-muted-foreground font-mono block break-all">
          cd {worktreePath}
        </code>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={handleCopyWorkspace}
          variant="outline"
          size="sm"
          className="flex-1 h-8 text-xs"
          data-testid="open-workspace-button"
        >
          <FolderOpen className="h-3.5 w-3.5 mr-1.5" />
          {copied ? "Copied!" : "Copy Workspace Path"}
        </Button>

        <Button
          onClick={onMarkResolved}
          variant="default"
          size="sm"
          className="flex-1 h-8 text-xs"
          disabled={isResolving}
          data-testid="mark-resolved-button"
        >
          {isResolving ? "Marking..." : "Mark as Resolved"}
        </Button>
      </div>

      {/* Info note */}
      <p className="text-xs text-muted-foreground/70 italic">
        After resolving conflicts manually in the workspace, click "Mark as Resolved" to re-enable Apply/PR actions.
      </p>
    </div>
  );
}
