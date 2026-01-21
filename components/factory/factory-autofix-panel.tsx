/** Factory Auto-Fix Panel (PR-99, PR-100) - UI for triggering auto-fix */
"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wrench, Loader2, AlertCircle, CheckCircle, Search, Sparkles } from "lucide-react";

export type AutoFixMode = "diagnostics" | "claude";

export interface AutofixStatus {
  total: number;
  used: number;
}

interface FactoryAutofixPanelProps {
  runId: string | null;
  autofixStatus: AutofixStatus | null;
  isLoading: boolean;
  onRunAutofix: (runId: string, mode: AutoFixMode) => void;
}

export function FactoryAutofixPanel({
  runId,
  autofixStatus,
  isLoading,
  onRunAutofix,
}: FactoryAutofixPanelProps) {
  const total = autofixStatus?.total ?? 0;
  const used = autofixStatus?.used ?? 0;
  const allUsed = total > 0 && used >= total;
  const noFailedPrs = total === 0;
  const isDisabled = !runId || allUsed || isLoading || noFailedPrs;

  const handleDiagnostics = () => {
    if (runId && !isDisabled) onRunAutofix(runId, "diagnostics");
  };

  const handleClaude = () => {
    if (runId && !isDisabled) onRunAutofix(runId, "claude");
  };

  return (
    <div className="rounded-lg border bg-card p-3 space-y-2" data-testid="factory-autofix-panel">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Auto-Fix</span>
          {autofixStatus && (
            <Badge variant="outline" className="text-xs">{used} / {total}</Badge>
          )}
        </div>

        {isLoading && (
          <div className="flex items-center gap-1 text-muted-foreground" data-testid="autofix-loading">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="text-xs">Running...</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs flex-1"
          disabled={isDisabled}
          onClick={handleDiagnostics}
          data-testid="diagnostics-button"
        >
          <Search className="h-3 w-3 mr-1" />
          Run Diagnostics
        </Button>

        <Button
          variant="default"
          size="sm"
          className="h-7 text-xs flex-1"
          disabled={isDisabled}
          onClick={handleClaude}
          data-testid="autofix-button"
        >
          <Sparkles className="h-3 w-3 mr-1" />
          Smart Auto-Fix (1x)
        </Button>
      </div>

      {allUsed && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <CheckCircle className="h-3 w-3" />
          <span>All attempts used</span>
        </div>
      )}

      {noFailedPrs && !allUsed && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <AlertCircle className="h-3 w-3" />
          <span>No failed PRs to fix</span>
        </div>
      )}
    </div>
  );
}
