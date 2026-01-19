"use client";

import { useState, useEffect } from "react";
import { History, Loader2, AlertCircle } from "lucide-react";

interface UsageItem {
  id: string;
  provider: string;
  model: string | null;
  tokensPrompt: number | null;
  tokensCompletion: number | null;
  estimatedCostUsd: number | null;
  source: string | null;
  createdAt: string;
}

interface UsageResponse {
  items: UsageItem[];
  totalUsd: number;
}

const formatCost = (val: number | null): string => {
  if (val === null) return "-";
  return `$${val.toFixed(4)}`;
};

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

/** AI Usage History Card (PR-56) - Read-only list of AI usage events */
export function AiUsageHistoryCard() {
  const [data, setData] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/ai/usage?limit=50&days=30")
      .then((res) => { if (!res.ok) throw new Error(); return res.json(); })
      .then((json) => setData(json))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-6" data-testid="ai-usage-history-loading">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Loading usage history...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border bg-card p-6" data-testid="ai-usage-history-error">
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">Failed to load usage history</span>
        </div>
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6" data-testid="ai-usage-history-empty">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <History className="h-5 w-5 text-muted-foreground" />
          </div>
          <h2 className="font-semibold">AI Usage History</h2>
        </div>
        <p className="text-sm text-muted-foreground">No AI usage yet</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-6" data-testid="ai-usage-history-card">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
          <History className="h-5 w-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold">AI Usage History</h2>
          <p className="text-sm text-muted-foreground">Last 30 days</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="font-semibold">${data.totalUsd.toFixed(2)}</p>
        </div>
      </div>

      <div className="max-h-64 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground border-b">
            <tr>
              <th className="text-left py-2">Date</th>
              <th className="text-left py-2">Provider</th>
              <th className="text-left py-2">Tokens</th>
              <th className="text-right py-2">Cost</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
              <tr key={item.id} className="border-b last:border-0">
                <td className="py-2">
                  <div className="text-xs">{formatDate(item.createdAt)}</div>
                </td>
                <td className="py-2">
                  <div className="font-medium">{item.provider}</div>
                  <div className="text-xs text-muted-foreground truncate max-w-[120px]">
                    {item.model || "-"}
                  </div>
                  {item.source && (
                    <span className="inline-block text-[10px] px-1 rounded bg-muted">
                      {item.source}
                    </span>
                  )}
                </td>
                <td className="py-2 text-xs text-muted-foreground">
                  {item.tokensPrompt ?? 0}/{item.tokensCompletion ?? 0}
                </td>
                <td className="py-2 text-right font-mono text-xs">
                  {formatCost(item.estimatedCostUsd)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
