/**
 * FriendlyError - Human-readable error display
 *
 * Shows error title, message, and optional action link.
 * No stack traces - just clear, actionable information.
 */

"use client";

import Link from "next/link";
import { AlertCircle, ArrowRight } from "lucide-react";
import { FriendlyError as FriendlyErrorType, toFriendlyError } from "@/lib/friendly-errors";

interface FriendlyErrorProps {
  error: unknown;
  className?: string;
}

export function FriendlyError({ error, className = "" }: FriendlyErrorProps) {
  const friendly = toFriendlyError(error);

  return (
    <div
      className={`rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950 ${className}`}
      data-testid="friendly-error"
    >
      <div className="flex items-start gap-2">
        <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-red-800 dark:text-red-200">
            {friendly.title}
          </p>
          <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
            {friendly.message}
          </p>
          {friendly.action && (
            <div className="mt-2">
              {friendly.actionUrl ? (
                <Link
                  href={friendly.actionUrl}
                  className="inline-flex items-center gap-1 text-xs font-medium text-red-700 hover:text-red-900 dark:text-red-300 dark:hover:text-red-100"
                >
                  {friendly.action}
                  <ArrowRight className="h-3 w-3" />
                </Link>
              ) : (
                <span className="text-xs text-red-600 dark:text-red-400">
                  {friendly.action}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Compact inline error for smaller spaces
 */
export function FriendlyErrorInline({ error, className = "" }: FriendlyErrorProps) {
  const friendly = toFriendlyError(error);

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400 ${className}`}
      title={friendly.message}
    >
      <AlertCircle className="h-3 w-3" />
      {friendly.title}
    </span>
  );
}
