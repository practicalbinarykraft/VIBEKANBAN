/**
 * AiStatusUnified - Single source of truth for AI status
 *
 * Solves UX Problem #4: Contradictory AI statuses in Settings.
 * Shows ONE clear status with actionable guidance.
 */

"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Settings,
  Key,
  DollarSign,
  FlaskConical,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export type AiStatusReason =
  | "FEATURE_REAL_AI_DISABLED"
  | "MISSING_API_KEY"
  | "TEST_MODE_FORCED_MOCK"
  | "BUDGET_LIMIT_EXCEEDED";

interface AiStatus {
  realAiEligible: boolean;
  provider: "anthropic" | "mock" | "db";
  model: string;
  reason?: AiStatusReason;
  limitUSD?: number;
  spendUSD?: number;
}

interface ReasonConfig {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick?: () => void;
  };
  severity: "error" | "warning" | "info";
}

const REASON_CONFIG: Record<AiStatusReason, ReasonConfig> = {
  FEATURE_REAL_AI_DISABLED: {
    icon: <Settings className="h-5 w-5" />,
    title: "Real AI is disabled",
    description: "Set FEATURE_REAL_AI=1 in environment variables to enable AI execution.",
    action: {
      label: "Learn how to enable",
    },
    severity: "warning",
  },
  MISSING_API_KEY: {
    icon: <Key className="h-5 w-5" />,
    title: "API key not configured",
    description: "Add your Anthropic API key below or set ANTHROPIC_API_KEY environment variable.",
    severity: "error",
  },
  TEST_MODE_FORCED_MOCK: {
    icon: <FlaskConical className="h-5 w-5" />,
    title: "Test mode active",
    description: "AI is using mock responses. This is normal during testing.",
    severity: "info",
  },
  BUDGET_LIMIT_EXCEEDED: {
    icon: <DollarSign className="h-5 w-5" />,
    title: "Budget limit reached",
    description: "Monthly spending limit exceeded. Increase the limit or wait for reset.",
    severity: "error",
  },
};

interface AiStatusUnifiedProps {
  context?: string; // e.g., "factory-blocked" to highlight why user was sent here
  onApiKeyConfigured?: () => void;
}

export function AiStatusUnified({ context, onApiKeyConfigured }: AiStatusUnifiedProps) {
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/ai/status");
      if (!response.ok) {
        throw new Error("Failed to fetch AI status");
      }
      const data = await response.json();
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div
        className="rounded-lg border bg-card p-6"
        data-testid="ai-status-unified"
      >
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Checking AI status...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-950/30"
        data-testid="ai-status-unified"
      >
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <XCircle className="h-5 w-5" />
          <span>Failed to check AI status: {error}</span>
        </div>
        <Button variant="outline" size="sm" className="mt-3" onClick={fetchStatus}>
          Retry
        </Button>
      </div>
    );
  }

  if (!status) return null;

  // Ready state
  if (status.realAiEligible) {
    return (
      <div
        className="rounded-lg border border-green-200 bg-green-50 p-6 dark:border-green-800 dark:bg-green-950/30"
        data-testid="ai-status-unified"
        data-status="ready"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-100 p-2 dark:bg-green-900/50">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-green-800 dark:text-green-200">
                AI Ready
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300">
                Real AI execution is enabled and configured correctly.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="border-green-300 text-green-700 dark:border-green-700 dark:text-green-300">
            <Zap className="mr-1 h-3 w-3" />
            {status.provider}
          </Badge>
        </div>

        <div className="mt-4 rounded-md bg-green-100/50 p-3 dark:bg-green-900/30">
          <p className="text-sm text-green-800 dark:text-green-200">
            <span className="font-medium">Model:</span> {status.model}
          </p>
          <p className="text-sm text-green-700 dark:text-green-300 mt-1">
            You can use Council Planning and Factory to execute AI-powered tasks.
          </p>
        </div>
      </div>
    );
  }

  // Not ready state
  const reason = status.reason || "FEATURE_REAL_AI_DISABLED";
  const config = REASON_CONFIG[reason];

  const severityStyles = {
    error: {
      border: "border-red-200 dark:border-red-800",
      bg: "bg-red-50 dark:bg-red-950/30",
      iconBg: "bg-red-100 dark:bg-red-900/50",
      iconColor: "text-red-600 dark:text-red-400",
      titleColor: "text-red-800 dark:text-red-200",
      textColor: "text-red-700 dark:text-red-300",
    },
    warning: {
      border: "border-amber-200 dark:border-amber-800",
      bg: "bg-amber-50 dark:bg-amber-950/30",
      iconBg: "bg-amber-100 dark:bg-amber-900/50",
      iconColor: "text-amber-600 dark:text-amber-400",
      titleColor: "text-amber-800 dark:text-amber-200",
      textColor: "text-amber-700 dark:text-amber-300",
    },
    info: {
      border: "border-blue-200 dark:border-blue-800",
      bg: "bg-blue-50 dark:bg-blue-950/30",
      iconBg: "bg-blue-100 dark:bg-blue-900/50",
      iconColor: "text-blue-600 dark:text-blue-400",
      titleColor: "text-blue-800 dark:text-blue-200",
      textColor: "text-blue-700 dark:text-blue-300",
    },
  };

  const styles = severityStyles[config.severity];

  return (
    <div
      className={`rounded-lg border p-6 ${styles.border} ${styles.bg}`}
      data-testid="ai-status-unified"
      data-status="not-ready"
      data-reason={reason}
    >
      {/* Context banner - shows why user was sent to Settings */}
      {context === "factory-blocked" && (
        <div className="mb-4 rounded-md bg-amber-100 p-3 dark:bg-amber-900/50">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            Factory cannot start because AI is not configured.
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Fix the issue below to continue.
          </p>
        </div>
      )}

      <div className="flex items-start gap-3">
        <div className={`rounded-full p-2 ${styles.iconBg}`}>
          <span className={styles.iconColor}>{config.icon}</span>
        </div>
        <div className="flex-1">
          <h3 className={`font-semibold ${styles.titleColor}`}>
            AI Not Ready: {config.title}
          </h3>
          <p className={`text-sm mt-1 ${styles.textColor}`}>
            {config.description}
          </p>

          {/* Budget info */}
          {reason === "BUDGET_LIMIT_EXCEEDED" && status.limitUSD && status.spendUSD && (
            <div className="mt-3 rounded-md bg-red-100/50 p-3 dark:bg-red-900/30">
              <p className="text-sm">
                <span className="font-medium">Limit:</span> ${status.limitUSD.toFixed(2)}
              </p>
              <p className="text-sm">
                <span className="font-medium">Spent:</span> ${status.spendUSD.toFixed(2)}
              </p>
            </div>
          )}

          {/* Action button */}
          {config.action && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={config.action.onClick}
            >
              {config.action.label}
            </Button>
          )}
        </div>
      </div>

      {/* Current provider info */}
      <div className="mt-4 pt-4 border-t border-current/10">
        <p className={`text-xs ${styles.textColor}`}>
          Current mode: <span className="font-medium">{status.provider}</span>
          {status.provider === "mock" && " (simulated responses)"}
          {status.provider === "db" && " (using saved settings)"}
        </p>
      </div>
    </div>
  );
}
