/**
 * AiStatusUnified - Single source of truth for AI status (PR-121 refactored)
 *
 * Solves UX Problem #4: Contradictory AI statuses in Settings.
 * Shows ONE clear status with actionable guidance.
 */

"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { REASON_CONFIG, SEVERITY_STYLES, type AiStatusReason } from "./ai-status-config";
import { ConfiguredApiKeys } from "./configured-api-keys";

interface ConfiguredProvider {
  provider: string;
  keyPresent: boolean;
  keyMasked: string | null;
}

interface AiStatus {
  realAiEligible: boolean;
  provider: "anthropic" | "mock" | "db";
  model: string;
  reason?: AiStatusReason;
  limitUSD?: number;
  spendUSD?: number;
  mode?: "real" | "mock" | "forced_mock";
  configuredProviders?: ConfiguredProvider[];
  testModeTriggers?: string[];
}

interface AiStatusUnifiedProps {
  context?: string;
  onApiKeyConfigured?: () => void;
}

export function AiStatusUnified({ context }: AiStatusUnifiedProps) {
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchStatus(); }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/ai/status");
      if (!response.ok) throw new Error("Failed to fetch AI status");
      setStatus(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-6" data-testid="ai-status-unified">
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Checking AI status...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-950/30" data-testid="ai-status-unified">
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <XCircle className="h-5 w-5" />
          <span>Failed to check AI status: {error}</span>
        </div>
        <Button variant="outline" size="sm" className="mt-3" onClick={fetchStatus}>Retry</Button>
      </div>
    );
  }

  if (!status) return null;

  // Ready state
  if (status.realAiEligible) {
    return (
      <>
        <div className="rounded-lg border border-green-200 bg-green-50 p-6 dark:border-green-800 dark:bg-green-950/30" data-testid="ai-status-unified" data-status="ready">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-100 p-2 dark:bg-green-900/50">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-green-800 dark:text-green-200">AI Ready</h3>
                <p className="text-sm text-green-700 dark:text-green-300">Real AI execution is enabled and configured correctly.</p>
              </div>
            </div>
            <Badge variant="outline" className="border-green-300 text-green-700 dark:border-green-700 dark:text-green-300">
              <Zap className="mr-1 h-3 w-3" />{status.provider}
            </Badge>
          </div>
          <div className="mt-4 rounded-md bg-green-100/50 p-3 dark:bg-green-900/30 space-y-1">
            <p className="text-sm text-green-800 dark:text-green-200"><span className="font-medium">Model:</span> {status.model}</p>
            {status.configuredProviders?.[0]?.keyMasked && (
              <p className="text-sm text-green-800 dark:text-green-200">
                <span className="font-medium">Key:</span>{" "}
                <code className="bg-green-200/50 dark:bg-green-800/50 px-1 rounded text-xs">{status.configuredProviders[0].keyMasked}</code>
              </p>
            )}
            <p className="text-sm text-green-700 dark:text-green-300 mt-1">You can use Council Planning and Factory to execute AI-powered tasks.</p>
          </div>
        </div>
        <ConfiguredApiKeys
          configuredProviders={status.configuredProviders || []}
          onKeyRemoved={fetchStatus}
        />
      </>
    );
  }

  // Not ready state
  const reason = status.reason || "FEATURE_REAL_AI_DISABLED";
  const config = REASON_CONFIG[reason];
  const styles = SEVERITY_STYLES[config.severity];

  return (
    <>
      <div className={`rounded-lg border p-6 ${styles.border} ${styles.bg}`} data-testid="ai-status-unified" data-status="not-ready" data-reason={reason}>
        {context === "factory-blocked" && (
          <div className="mb-4 rounded-md bg-amber-100 p-3 dark:bg-amber-900/50">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Factory cannot start because AI is not configured.</p>
            <p className="text-sm text-amber-700 dark:text-amber-300">Fix the issue below to continue.</p>
          </div>
        )}
        <div className="flex items-start gap-3">
          <div className={`rounded-full p-2 ${styles.iconBg}`}>
            <span className={styles.iconColor}>{config.icon}</span>
          </div>
          <div className="flex-1">
            <h3 className={`font-semibold ${styles.titleColor}`}>AI Not Ready: {config.title}</h3>
            <p className={`text-sm mt-1 ${styles.textColor}`}>{config.description}</p>

            {/* Test mode triggers */}
            {reason === "TEST_MODE_FORCED_MOCK" && status.testModeTriggers?.length ? (
              <div className="mt-3 rounded-md bg-blue-100/50 p-3 dark:bg-blue-900/30">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Triggered by:</p>
                <ul className="text-sm text-blue-700 dark:text-blue-300 list-disc list-inside">
                  {status.testModeTriggers.map((t) => <li key={t}><code className="bg-blue-200/50 dark:bg-blue-800/50 px-1 rounded text-xs">{t}</code></li>)}
                </ul>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">To disable test mode, remove these environment variables and restart the server.</p>
              </div>
            ) : null}

            {/* Budget info */}
            {reason === "BUDGET_LIMIT_EXCEEDED" && status.limitUSD && status.spendUSD && (
              <div className="mt-3 rounded-md bg-red-100/50 p-3 dark:bg-red-900/30">
                <p className="text-sm"><span className="font-medium">Limit:</span> ${status.limitUSD.toFixed(2)}</p>
                <p className="text-sm"><span className="font-medium">Spent:</span> ${status.spendUSD.toFixed(2)}</p>
              </div>
            )}

            {config.action && <Button variant="outline" size="sm" className="mt-3" onClick={config.action.onClick}>{config.action.label}</Button>}
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-current/10">
          <p className={`text-xs ${styles.textColor}`}>
            Current mode: <span className="font-medium">{status.provider}</span>
            {status.provider === "mock" && " (simulated responses)"}
            {status.provider === "db" && " (using saved settings)"}
          </p>
        </div>
      </div>
      <ConfiguredApiKeys
        configuredProviders={status.configuredProviders || []}
        onKeyRemoved={fetchStatus}
      />
    </>
  );
}

// Re-export for backwards compatibility
export type { AiStatusReason };
