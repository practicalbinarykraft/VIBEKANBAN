/**
 * ErrorGuidancePanel (PR-77) - Display structured error guidance
 */
"use client";

import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { deserializeRunError } from "@/server/services/autopilot/autopilot-run-error.store";
import { getGuidanceForError, type ErrorGuidance } from "@/server/services/autopilot/autopilot-error-guidance";

interface ErrorGuidancePanelProps {
  runError: string | null | undefined;
}

const severityConfig: Record<ErrorGuidance["severity"], { icon: React.ReactNode; variant: "default" | "secondary" | "destructive" }> = {
  info: { icon: <Info className="h-4 w-4" />, variant: "secondary" },
  warning: { icon: <AlertTriangle className="h-4 w-4" />, variant: "default" },
  critical: { icon: <AlertCircle className="h-4 w-4" />, variant: "destructive" },
};

export function ErrorGuidancePanel({ runError }: ErrorGuidancePanelProps) {
  if (!runError) return null;

  const error = deserializeRunError(runError);
  if (!error) return null;

  const guidance = getGuidanceForError(error);
  const config = severityConfig[guidance.severity];

  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4" data-testid="error-guidance-panel">
      <div className="mb-2 flex items-center gap-2">
        {config.icon}
        <span className="font-medium">{guidance.title}</span>
        <Badge variant={config.variant} className="ml-auto text-xs">
          {error.code}
        </Badge>
      </div>
      {error.message && error.code !== "UNKNOWN" && (
        <p className="mb-3 text-sm text-muted-foreground">{error.message}</p>
      )}
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">What to do next:</p>
        <ul className="list-inside list-disc space-y-1 text-sm">
          {guidance.nextSteps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
