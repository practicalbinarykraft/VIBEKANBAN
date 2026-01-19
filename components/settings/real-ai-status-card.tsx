"use client";

import { useState, useEffect } from "react";
import { Zap, Loader2, CheckCircle2, XCircle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AiStatus {
  realAiEligible: boolean;
  provider: "anthropic" | "mock" | "db";
  model: string;
  reason?: string;
}

/**
 * Real AI Status Card
 *
 * Displays the current Real AI (Anthropic) configuration status.
 * Shows whether FEATURE_REAL_AI + ANTHROPIC_API_KEY are configured.
 */
export function RealAiStatusCard() {
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const response = await fetch("/api/ai/status");
        if (!response.ok) {
          throw new Error("Failed to fetch AI status");
        }
        const data = await response.json();
        setStatus(data);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    fetchStatus();
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-6" data-testid="real-ai-status-card">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">
            Checking AI status...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border bg-card p-6" data-testid="real-ai-status-card">
        <div className="flex items-center gap-2 text-red-600">
          <XCircle className="h-4 w-4" />
          <span className="text-sm">Failed to load AI status</span>
        </div>
      </div>
    );
  }

  if (!status) return null;

  const isActive = status.realAiEligible;
  const providerLabel = {
    anthropic: "Anthropic (Claude)",
    mock: "Mock (Test Mode)",
    db: "Database Settings",
  }[status.provider];

  return (
    <div className="rounded-lg border bg-card p-6" data-testid="real-ai-status-card">
      <div className="mb-4 flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${
            isActive ? "bg-green-100 dark:bg-green-900" : "bg-muted"
          }`}
        >
          <Zap
            className={`h-5 w-5 ${
              isActive ? "text-green-600" : "text-muted-foreground"
            }`}
          />
        </div>
        <div>
          <h2 className="font-semibold">Real AI (Anthropic)</h2>
          <p className="text-sm text-muted-foreground">
            Environment-based AI configuration
          </p>
        </div>
        <Badge
          variant={isActive ? "default" : "secondary"}
          className={`ml-auto ${isActive ? "bg-green-600" : ""}`}
          data-testid="real-ai-status-badge"
        >
          {isActive ? "Active" : "Inactive"}
        </Badge>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Provider</span>
          <span className="font-medium">{providerLabel}</span>
        </div>

        {status.provider === "anthropic" && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Model</span>
            <span className="font-medium">{status.model}</span>
          </div>
        )}

        {status.reason && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              {status.reason}
            </p>
          </div>
        )}

        {isActive && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
            <p className="text-sm text-green-800 dark:text-green-200">
              Real AI is active. Council discussions will use Anthropic Claude.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
