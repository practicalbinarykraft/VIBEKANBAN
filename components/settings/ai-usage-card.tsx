"use client";

import { useState, useEffect } from "react";
import { DollarSign, Loader2, XCircle, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AiStatus {
  realAiEligible: boolean;
  provider: "anthropic" | "mock" | "db";
  model: string;
  reason?: string;
}

interface ProviderBalance {
  provider: string;
  balanceUSD: number | null;
  estimatedSpendUSD?: number;
  source: "api" | "estimator" | "unknown";
}

const formatUSD = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return "unknown";
  const abs = Math.abs(value);
  return value < 0 ? `-$${abs.toFixed(2)}` : `$${abs.toFixed(2)}`;
};

/** AI Usage & Budget Card (PR-51) - Read-only display */
export function AiUsageCard() {
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [balance, setBalance] = useState<ProviderBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statusRes, balanceRes] = await Promise.all([
          fetch("/api/ai/status"),
          fetch("/api/ai/balance?provider=anthropic"),
        ]);
        if (!statusRes.ok || !balanceRes.ok) throw new Error("Failed to load");
        const statusData: AiStatus = await statusRes.json();
        const balanceData = await balanceRes.json();
        setStatus(statusData);
        setBalance(balanceData.providers?.find((p: ProviderBalance) => p.provider === "anthropic") || null);
      } catch {
        setError("Failed to load AI usage data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-6" data-testid="ai-usage-card-loading">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Loading AI usage...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border bg-card p-6" data-testid="ai-usage-card-error">
        <div className="flex items-center gap-2 text-red-600">
          <XCircle className="h-4 w-4" />
          <span className="text-sm">Failed to load AI usage data</span>
        </div>
      </div>
    );
  }

  if (!status) return null;

  const isActive = status.realAiEligible;
  const isOverBudget = balance?.balanceUSD !== null && balance?.balanceUSD !== undefined && balance.balanceUSD < 0;
  const hasUsageData = balance !== null && balance.source !== "unknown";

  const iconBg = isOverBudget ? "bg-red-100 dark:bg-red-900" : isActive ? "bg-blue-100 dark:bg-blue-900" : "bg-muted";
  const iconColor = isOverBudget ? "text-red-600" : isActive ? "text-blue-600" : "text-muted-foreground";
  const badgeClass = isOverBudget ? "bg-red-600" : isActive ? "bg-blue-600" : "";
  const badgeText = isOverBudget ? "Over budget" : isActive ? "Real AI active" : "Real AI disabled";

  return (
    <div className="rounded-lg border bg-card p-6" data-testid="ai-usage-card">
      <div className="mb-4 flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}>
          <DollarSign className={`h-5 w-5 ${iconColor}`} />
        </div>
        <div>
          <h2 className="font-semibold">AI Usage & Budget</h2>
          <p className="text-sm text-muted-foreground">Current usage and spend tracking</p>
        </div>
        <Badge variant={isActive ? "default" : "secondary"} className={`ml-auto ${badgeClass}`}>
          {badgeText}
        </Badge>
      </div>

      <div className="space-y-3">
        {status.provider === "anthropic" && (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Provider</span>
              <span className="font-medium">Anthropic</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Model</span>
              <span className="font-medium">{status.model}</span>
            </div>
          </>
        )}

        {status.reason && (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
            <p className="text-sm text-amber-800 dark:text-amber-200">{status.reason}</p>
          </div>
        )}

        {hasUsageData && balance && (
          <div className="mt-4 rounded-md border p-3">
            <h3 className="mb-2 text-sm font-medium">Usage this month</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Spend</span>
                <span className="font-medium">{formatUSD(balance.estimatedSpendUSD)}</span>
              </div>
              {balance.balanceUSD !== null && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Remaining</span>
                  <span className={`font-medium ${balance.balanceUSD < 0 ? "text-red-600" : ""}`}>
                    {formatUSD(balance.balanceUSD)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Source</span>
                <span>{balance.source}</span>
              </div>
            </div>
          </div>
        )}

        {!hasUsageData && (
          <div className="mt-4 rounded-md border border-dashed p-3">
            <p className="text-sm text-muted-foreground">Usage: unknown (no data)</p>
          </div>
        )}
      </div>
    </div>
  );
}
