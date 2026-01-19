"use client";

import { useState, useEffect, useRef } from "react";
import { Wallet, RefreshCw, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BalanceData {
  provider: string;
  balanceUsd: number | null;
  spendUsd: number | null;
  limitUsd: number | null;
  balanceSource: string;
  updatedAt: string | null;
}

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

const formatUsd = (val: number | null): string => {
  if (val === null || val === undefined) return "Unknown";
  return `$${val.toFixed(2)}`;
};

const isStale = (updatedAt: string | null): boolean => {
  if (!updatedAt) return true;
  const updated = new Date(updatedAt).getTime();
  return Date.now() - updated > SIX_HOURS_MS;
};

interface Props {
  provider: "anthropic" | "openai";
}

/** Provider Balance Card (PR-53) - Shows balance with refresh capability */
export function ProviderBalanceCard({ provider }: Props) {
  const [data, setData] = useState<BalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoRefreshDone = useRef(false);

  const fetchBalance = async () => {
    try {
      const res = await fetch(`/api/ai/balance?provider=${provider}`);
      if (!res.ok) throw new Error("Failed to fetch balance");
      const json = await res.json();
      // Handle both single object and providers array format
      const balanceData = json.providers
        ? json.providers.find((p: BalanceData) => p.provider === provider)
        : json;
      setData(balanceData || null);
      return balanceData;
    } catch {
      setError("Failed to load balance");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const doRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/balance/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      if (!res.ok) throw new Error("Refresh failed");
      const refreshed = await res.json();
      setData(refreshed);
    } catch {
      setError("Failed to refresh");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBalance().then((balanceData) => {
      // Auto-refresh if stale and not already done
      if (!autoRefreshDone.current && balanceData && isStale(balanceData.updatedAt)) {
        autoRefreshDone.current = true;
        doRefresh();
      } else if (!autoRefreshDone.current && !balanceData) {
        autoRefreshDone.current = true;
        doRefresh();
      }
    });
  }, [provider]);

  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-6" data-testid="provider-balance-loading">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Loading balance...</span>
        </div>
      </div>
    );
  }

  const providerLabel = provider === "anthropic" ? "Anthropic" : "OpenAI";

  return (
    <div className="rounded-lg border bg-card p-6" data-testid="provider-balance-card">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900">
          <Wallet className="h-5 w-5 text-purple-600" />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold">{providerLabel} Balance</h2>
          <p className="text-sm text-muted-foreground">Provider account balance</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={doRefresh}
          disabled={refreshing}
          data-testid="refresh-balance-btn"
        >
          <RefreshCw className={`mr-1 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="mb-3 flex items-center gap-2 rounded-md bg-red-50 p-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Remaining</span>
          <span className="font-medium">{formatUsd(data?.balanceUsd ?? null)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Spend</span>
          <span className="font-medium">{formatUsd(data?.spendUsd ?? null)}</span>
        </div>
        {data?.limitUsd !== null && data?.limitUsd !== undefined && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Limit</span>
            <span className="font-medium">{formatUsd(data.limitUsd)}</span>
          </div>
        )}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Source</span>
          <span className="font-medium">{data?.balanceSource || "unknown"}</span>
        </div>
        {data?.updatedAt && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Updated</span>
            <span>{new Date(data.updatedAt).toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}
