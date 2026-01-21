"use client";

import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { GitFork, Settings, ExternalLink, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface CloneRequiredBannerProps {
  projectId: string;
  className?: string;
}

/**
 * CloneRequiredBanner - Explains why repository configuration is needed
 *
 * Addresses UX Problem #10: "Go to Settings" without specifics
 * Instead of a vague redirect, this banner:
 * - Explains WHY repository is needed (git worktrees for isolation)
 * - Shows WHAT happens without it (read-only mode)
 * - Provides direct action (Configure Repository button)
 */
export function CloneRequiredBanner({ projectId, className }: CloneRequiredBannerProps) {
  return (
    <Alert
      data-testid="clone-required-banner"
      className={cn("border-amber-500/50 bg-amber-50 dark:bg-amber-950/20", className)}
    >
      <GitFork className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-800 dark:text-amber-200">
        Repository Not Configured
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        <div className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
          <p>
            <strong>Factory creates isolated git worktrees</strong> for each task execution,
            allowing parallel development without conflicts.
          </p>
          <p>
            <strong>AI agents need access to your codebase</strong> to understand context,
            make changes, and run tests.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>Without a repository, tasks are read-only and cannot be executed by Factory.</span>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button asChild size="sm" className="gap-1.5">
            <Link href={`/projects/${projectId}/settings`}>
              <Settings className="h-3.5 w-3.5" />
              Configure Repository
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href="/docs/repository-setup">
              <ExternalLink className="h-3.5 w-3.5" />
              Learn More
            </Link>
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
