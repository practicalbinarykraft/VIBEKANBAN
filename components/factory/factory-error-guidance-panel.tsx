/** FactoryErrorGuidancePanel (PR-92) - Display error guidance to users */
"use client";

import { Badge } from "@/components/ui/badge";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import type { FactoryError } from "@/types/factory-errors";
import type { FactoryGuidance, GuidanceSeverity } from "@/server/services/factory/factory-error-guidance";

interface FactoryErrorGuidancePanelProps {
  error: FactoryError;
  guidance: FactoryGuidance;
  compact?: boolean;
}

const SEVERITY_CONFIG: Record<GuidanceSeverity, {
  badge: "destructive" | "default" | "secondary";
  icon: typeof AlertCircle;
  bgClass: string;
  borderClass: string;
}> = {
  critical: {
    badge: "destructive",
    icon: AlertCircle,
    bgClass: "bg-destructive/10",
    borderClass: "border-destructive/50",
  },
  warning: {
    badge: "default",
    icon: AlertTriangle,
    bgClass: "bg-amber-50 dark:bg-amber-950/20",
    borderClass: "border-amber-500/50",
  },
  info: {
    badge: "secondary",
    icon: Info,
    bgClass: "bg-muted/50",
    borderClass: "border-muted-foreground/30",
  },
};

export function FactoryErrorGuidancePanel({
  error,
  guidance,
  compact = false,
}: FactoryErrorGuidancePanelProps) {
  const config = SEVERITY_CONFIG[guidance.severity];
  const Icon = config.icon;

  return (
    <div
      className={`rounded-lg border ${config.borderClass} ${config.bgClass} ${compact ? "p-3 compact" : "p-4"}`}
      data-testid="factory-error-guidance-panel"
    >
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
          guidance.severity === "critical" ? "text-destructive" :
          guidance.severity === "warning" ? "text-amber-600 dark:text-amber-500" :
          "text-muted-foreground"
        }`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={config.badge} data-testid="severity-badge">
              {guidance.severity}
            </Badge>
            <span className="text-xs text-muted-foreground" data-testid="error-code">
              {error.code}
            </span>
          </div>

          <h4 className="font-medium text-sm mb-2" data-testid="guidance-title">
            {guidance.title}
          </h4>

          {!compact && (
            <ul className="space-y-1 text-sm text-muted-foreground">
              {guidance.steps.map((step, i) => (
                <li key={i} className="flex items-start gap-2" data-testid={`guidance-step-${i}`}>
                  <span className="text-muted-foreground/60">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          )}

          {compact && guidance.steps.length > 0 && (
            <p className="text-xs text-muted-foreground" data-testid="guidance-step-0">
              {guidance.steps[0]}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
