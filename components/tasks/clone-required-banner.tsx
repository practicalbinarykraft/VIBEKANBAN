/**
 * CloneRequiredBanner - Explains why tasks can't execute
 *
 * Solves UX Problem #3: User gets "read-only" without understanding why.
 * Shows clear explanation and action for repository cloning.
 */

"use client";

import { FolderGit2, ExternalLink, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface CloneRequiredBannerProps {
  projectId: string;
  projectName?: string;
  onClone?: () => void;
  className?: string;
}

export function CloneRequiredBanner({
  projectId,
  projectName,
  onClone,
  className = "",
}: CloneRequiredBannerProps) {
  return (
    <div
      className={`rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30 ${className}`}
      data-testid="clone-required-banner"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-amber-100 p-2 dark:bg-amber-900/50">
          <FolderGit2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-amber-800 dark:text-amber-200">
            Repository Not Configured
          </h3>
          <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
            To execute tasks, you need to configure a repository path.
            Factory agents need a working directory to create branches and make changes.
          </p>
        </div>
      </div>

      {/* Why this is needed */}
      <div className="mt-4 rounded-md bg-amber-100/50 p-3 dark:bg-amber-900/30">
        <p className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-2">
          Why is this needed?
        </p>
        <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1 list-disc list-inside">
          <li>Factory creates isolated git worktrees for each task</li>
          <li>AI agents need access to your codebase to make changes</li>
          <li>Changes are committed to separate branches for review</li>
        </ul>
      </div>

      {/* What happens without it */}
      <div className="mt-3 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
        <AlertTriangle className="h-3 w-3" />
        <span>
          Without a repository, tasks are read-only and cannot be executed.
        </span>
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="default"
          size="sm"
          asChild
        >
          <Link href={`/projects/${projectId}/settings`}>
            <FolderGit2 className="mr-2 h-4 w-4" />
            Configure Repository
          </Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          asChild
        >
          <Link href="/docs/repository-setup" target="_blank">
            Learn More
            <ExternalLink className="ml-2 h-3 w-3" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
