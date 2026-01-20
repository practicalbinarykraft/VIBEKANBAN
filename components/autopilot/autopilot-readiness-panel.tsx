/** AutopilotReadinessPanel (PR-81) - Shows blockers preventing autopilot start */
"use client";

import { AlertCircle } from "lucide-react";
import type { AutopilotBlocker } from "@/hooks/useAutopilotReadiness";

interface AutopilotReadinessPanelProps {
  ready: boolean;
  blockers: AutopilotBlocker[];
}

const BLOCKER_MESSAGES: Record<string, (b: AutopilotBlocker) => string> = {
  NO_TASKS: () => "No tasks ready to run",
  AI_NOT_CONFIGURED: () => "AI provider not configured",
  BUDGET_EXCEEDED: (b) => {
    if (b.type === "BUDGET_EXCEEDED") return `Budget exceeded: $${b.spendUSD.toFixed(2)} / $${b.limitUSD.toFixed(2)}`;
    return "Budget exceeded";
  },
  AUTOPILOT_RUNNING: () => "Autopilot is already running",
  REPO_NOT_READY: () => "Repository is not ready for execution",
};

export function AutopilotReadinessPanel({ ready, blockers }: AutopilotReadinessPanelProps) {
  if (ready || blockers.length === 0) return null;

  return (
    <div
      className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30"
      data-testid="autopilot-readiness-panel"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-400" />
        <div className="flex-1">
          <h3 className="font-medium text-amber-800 dark:text-amber-200">Cannot start Autopilot</h3>
          <ul className="mt-2 space-y-1">
            {blockers.map((blocker, i) => (
              <li
                key={i}
                className="text-sm text-amber-700 dark:text-amber-300"
                data-testid="autopilot-blocker"
              >
                • {BLOCKER_MESSAGES[blocker.type]?.(blocker) ?? "Unknown issue"}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
