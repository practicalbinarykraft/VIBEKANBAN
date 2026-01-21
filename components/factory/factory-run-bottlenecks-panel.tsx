/** Factory Run Bottlenecks Panel (PR-96) - Display detected issues */
"use client";

import type { BottleneckHint } from "@/server/services/factory/factory-run-bottlenecks";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";

interface FactoryRunBottlenecksPanelProps {
  hints: BottleneckHint[];
}

const SEVERITY_STYLES: Record<string, { bg: string; border: string; icon: React.ReactNode }> = {
  critical: {
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-800",
    icon: <AlertCircle className="h-4 w-4 text-red-500" />,
  },
  warning: {
    bg: "bg-yellow-50 dark:bg-yellow-950/30",
    border: "border-yellow-200 dark:border-yellow-800",
    icon: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
  },
  info: {
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800",
    icon: <Info className="h-4 w-4 text-blue-500" />,
  },
};

export function FactoryRunBottlenecksPanel({ hints }: FactoryRunBottlenecksPanelProps) {
  if (hints.length === 0) {
    return null;
  }

  return (
    <div data-testid="bottlenecks-panel" className="space-y-3">
      <h4 className="text-sm font-medium text-muted-foreground">Issues Detected</h4>
      <div className="space-y-2">
        {hints.map((hint) => {
          const styles = SEVERITY_STYLES[hint.severity] ?? SEVERITY_STYLES.info;
          return (
            <div
              key={hint.code}
              data-testid={`bottleneck-hint-${hint.code}`}
              data-severity={hint.severity}
              className={`flex items-start gap-3 p-3 rounded-lg border ${styles.bg} ${styles.border}`}
            >
              <div className="flex-shrink-0 mt-0.5">{styles.icon}</div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{hint.title}</p>
                <p className="text-xs text-muted-foreground">{hint.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
