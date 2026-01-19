"use client";

import { useState, useEffect } from "react";
import { Cpu, RefreshCw, Loader2, AlertCircle, CheckCircle, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProviderData {
  provider: string;
  balanceUsd: number | null;
  spendUsd: number | null;
  limitUsd: number | null;
  balanceSource: string;
  updatedAt: string | null;
  status: "ok" | "over_budget" | "unknown";
}

const formatUsd = (val: number | null): string => {
  if (val === null || val === undefined) return "—";
  return `$${val.toFixed(2)}`;
};

const StatusBadge = ({ status }: { status: ProviderData["status"] }) => {
  switch (status) {
    case "ok":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900 dark:text-green-300">
          <CheckCircle className="h-3 w-3" />
          OK
        </span>
      );
    case "over_budget":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700 dark:bg-red-900 dark:text-red-300">
          <AlertCircle className="h-3 w-3" />
          Over Budget
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
          <HelpCircle className="h-3 w-3" />
          Unknown
        </span>
      );
  }
};

const ProviderRow = ({ data }: { data: ProviderData }) => {
  const label = data.provider === "anthropic" ? "Anthropic" : "OpenAI";

  return (
    <div className="border-b py-3 last:border-b-0" data-testid={`provider-row-${data.provider}`}>
      <div className="mb-2 flex items-center justify-between">
        <span className="font-medium">{label}</span>
        <StatusBadge status={data.status} />
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Balance</span>
          <span>{formatUsd(data.balanceUsd)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Spend MTD</span>
          <span>{formatUsd(data.spendUsd)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Limit</span>
          <span>{formatUsd(data.limitUsd)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Source</span>
          <span>{data.balanceSource}</span>
        </div>
      </div>
      {data.updatedAt && (
        <div className="mt-1 text-xs text-muted-foreground">
          Updated: {new Date(data.updatedAt).toLocaleString()}
        </div>
      )}
    </div>
  );
};

/** AI Providers Card (PR-55) - Shows all provider balances with refresh */
export function AIProvidersCard() {
  const [providers, setProviders] = useState<ProviderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProviders = async () => {
    try {
      const res = await fetch("/api/providers/accounts");
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setProviders(json.providers || []);
      setError(null);
    } catch {
      setError("Failed to load provider accounts");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/providers/accounts/refresh", { method: "POST" });
      if (!res.ok) throw new Error("Refresh failed");
      // Refetch to get updated data with status
      await fetchProviders();
    } catch {
      setError("Failed to refresh balances");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-6" data-testid="ai-providers-loading">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Loading providers...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-6" data-testid="ai-providers-card">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
          <Cpu className="h-5 w-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold">AI Providers</h2>
          <p className="text-sm text-muted-foreground">Provider account balances</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          data-testid="refresh-all-btn"
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

      <div className="divide-y">
        {providers.map((p) => (
          <ProviderRow key={p.provider} data={p} />
        ))}
        {providers.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No providers configured
          </p>
        )}
      </div>
    </div>
  );
}
