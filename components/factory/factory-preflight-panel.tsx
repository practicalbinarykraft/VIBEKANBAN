/**
 * Factory Preflight Panel (PR-101, PR-116)
 *
 * UI for preflight validation with actionable fix links.
 * Solves UX Problems #7, #10: Shows exactly what needs to be done.
 */
"use client";

import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, Shield, X, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

export interface PreflightCheckDisplay {
  name: string;
  label: string;
  passed: boolean;
  description?: string;  // PR-116: Added description
  fixUrl?: string;       // PR-116: Added fix URL
  fixLabel?: string;     // PR-116: Added fix label
}

export interface PreflightDisplayResult {
  ok: boolean;
  errorCode?: string;
  errorMessage?: string;
  checks: PreflightCheckDisplay[];
}

interface FactoryPreflightPanelProps {
  result: PreflightDisplayResult | null;
  isRunning: boolean;
  onRunPreflight: () => void;
  onDismiss: () => void;
}

export function FactoryPreflightPanel({
  result,
  isRunning,
  onRunPreflight,
  onDismiss,
}: FactoryPreflightPanelProps) {
  return (
    <div className="rounded-lg border bg-card p-3 space-y-2" data-testid="factory-preflight-panel">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Preflight Checks</span>
        </div>

        {result && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={onDismiss}
            data-testid="preflight-dismiss"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {!result && (
        <Button
          variant="outline"
          size="sm"
          className="w-full h-7 text-xs"
          disabled={isRunning}
          onClick={onRunPreflight}
          data-testid="run-preflight-button"
        >
          {isRunning ? (
            <>
              <Loader2 className="h-3 w-3 mr-1 animate-spin" data-testid="preflight-spinner" />
              Running checks...
            </>
          ) : (
            "Run Preflight"
          )}
        </Button>
      )}

      {result && (
        <div className="space-y-2">
          {result.ok ? (
            <div className="flex items-center gap-1 text-xs text-green-500" data-testid="preflight-success">
              <CheckCircle className="h-3 w-3" />
              <span>All checks passed</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-xs text-destructive" data-testid="preflight-failure">
              <XCircle className="h-3 w-3" />
              <span>{result.errorMessage}</span>
            </div>
          )}

          <div className="space-y-2">
            {result.checks.map((check) => (
              <div
                key={check.name}
                className={cn(
                  "rounded-md p-2",
                  check.passed
                    ? "bg-green-50 dark:bg-green-950/30"
                    : "bg-amber-50 dark:bg-amber-950/30"
                )}
                data-testid={`preflight-check-${check.name}`}
              >
                <div className="flex items-start gap-2">
                  {check.passed ? (
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <span
                      className={cn(
                        "text-xs font-medium",
                        check.passed
                          ? "text-green-700 dark:text-green-300"
                          : "text-amber-700 dark:text-amber-300"
                      )}
                    >
                      {check.label}
                    </span>
                    {check.description && (
                      <p
                        className={cn(
                          "text-xs mt-0.5",
                          check.passed
                            ? "text-green-600 dark:text-green-400"
                            : "text-amber-600 dark:text-amber-400"
                        )}
                      >
                        {check.description}
                      </p>
                    )}
                  </div>
                  {/* PR-116: Fix button for failed checks */}
                  {!check.passed && check.fixUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-xs shrink-0"
                      asChild
                    >
                      <Link href={check.fixUrl}>
                        {check.fixLabel || "Fix"}
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
