/** Factory Auto-Fix Panel (PR-99) - UI for triggering auto-fix attempts */
"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wrench, Loader2, AlertCircle, CheckCircle } from "lucide-react";

export interface AutofixStatus {
  total: number;
  used: number;
}

interface FactoryAutofixPanelProps {
  runId: string | null;
  autofixStatus: AutofixStatus | null;
  isLoading: boolean;
  onRunAutofix: (runId: string) => void;
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

  const handleClick = () => {
    if (runId && !isDisabled) {
      onRunAutofix(runId);
    }
  };

  return (
    <div
      className="rounded-lg border bg-card p-3 space-y-2"
      data-testid="factory-autofix-panel"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Auto-Fix</span>
          {autofixStatus && (
            <Badge variant="outline" className="text-xs">
              {used} / {total}
            </Badge>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          disabled={isDisabled}
          onClick={handleClick}
          data-testid="autofix-button"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-3 w-3 mr-1 animate-spin" data-testid="autofix-loading" />
              Running...
            </>
          ) : (
            <>
              <Wrench className="h-3 w-3 mr-1" />
              Run Auto-Fix (1 iteration)
            </>
          )}
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
