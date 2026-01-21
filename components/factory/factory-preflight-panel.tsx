/** Factory Preflight Panel (PR-101) - UI for preflight validation */
"use client";

import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, Shield, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PreflightCheckDisplay {
  name: string;
  label: string;
  passed: boolean;
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

          <div className="space-y-1">
            {result.checks.map((check) => (
              <div
                key={check.name}
                className={cn(
                  "flex items-center gap-1 text-xs",
                  check.passed ? "text-green-500" : "text-destructive"
                )}
                data-testid={`preflight-check-${check.name}`}
              >
                {check.passed ? (
                  <CheckCircle className="h-3 w-3" />
                ) : (
                  <XCircle className="h-3 w-3" />
                )}
                <span>{check.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
