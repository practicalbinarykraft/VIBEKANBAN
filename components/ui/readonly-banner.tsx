/**
 * ReadOnlyBanner - Execution not available banner
 *
 * Shows when AI or Git is not configured, disabling task execution.
 * Planning still works, but Run/Apply are disabled.
 */

"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

interface ReadOnlyBannerProps {
  reason?: string;
  className?: string;
}

export function ReadOnlyBanner({ reason, className = "" }: ReadOnlyBannerProps) {
  return (
    <div
      className={`rounded-md border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900 dark:bg-amber-950 ${className}`}
      data-testid="readonly-banner"
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
            Read-only mode
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-300">
            {reason || "Configure AI and Git to execute tasks"}
          </p>
        </div>
        <Link
          href="/settings"
          className="text-xs font-medium text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100 underline flex-shrink-0"
        >
          Settings
        </Link>
      </div>
    </div>
  );
}
