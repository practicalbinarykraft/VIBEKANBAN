"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle, XCircle, Ban, Loader2 } from "lucide-react";

type AlertStatus = "ok" | "warning" | "critical" | "blocked";

interface AlertData {
  provider: string;
  status: AlertStatus;
  spendUsd: number;
  limitUsd: number | null;
  percentUsed: number | null;
}

const STATUS_CONFIG: Record<
  AlertStatus,
  { icon: typeof CheckCircle; color: string; bg: string; text: string }
> = {
  ok: {
    icon: CheckCircle,
    color: "text-green-600",
    bg: "bg-green-100 dark:bg-green-900",
    text: "Usage within limits",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-yellow-600",
    bg: "bg-yellow-100 dark:bg-yellow-900",
    text: "Approaching limit",
  },
  critical: {
    icon: XCircle,
    color: "text-red-600",
    bg: "bg-red-100 dark:bg-red-900",
    text: "Near limit",
  },
  blocked: {
    icon: Ban,
    color: "text-gray-500",
    bg: "bg-gray-100 dark:bg-gray-800",
    text: "Usage blocked",
  },
};

const formatUsd = (val: number | null): string =>
  val === null ? "—" : `$${val.toFixed(2)}`;

const StatusBadge = ({ status }: { status: AlertStatus }) => {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.bg} ${config.color}`}
      data-testid="status-badge"
    >
      <Icon className="h-3 w-3" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

/** AI Usage Alerts Card (PR-59) - Shows budget status read-only */
export function AIUsageAlertsCard() {
  const [data, setData] = useState<AlertData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await fetch("/api/ai/usage/alerts");
        if (!res.ok) throw new Error("Failed to fetch");
        const json = await res.json();
        setData(json);
        setError(null);
      } catch {
        setError("Failed to load usage alerts");
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-6" data-testid="alerts-loading">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Loading alerts...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border bg-card p-6" data-testid="alerts-error">
        <div className="flex items-center gap-2 text-muted-foreground">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm">{error || "No data available"}</span>
        </div>
      </div>
    );
  }

  const config = STATUS_CONFIG[data.status];
  const providerLabel = data.provider === "anthropic" ? "Anthropic" : "OpenAI";
  const isBlocked = data.status === "blocked";

  return (
    <div
      className={`rounded-lg border bg-card p-6 ${isBlocked ? "opacity-75" : ""}`}
      data-testid="alerts-card"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${config.bg}`}
          >
            <config.icon className={`h-5 w-5 ${config.color}`} />
          </div>
          <div>
            <h2 className="font-semibold">AI Usage Status</h2>
            <p className="text-sm text-muted-foreground">{providerLabel}</p>
          </div>
        </div>
        <StatusBadge status={data.status} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Spend / Limit</span>
          <span className="font-medium" data-testid="spend-limit">
            {formatUsd(data.spendUsd)} / {formatUsd(data.limitUsd)}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Usage</span>
          <span className="font-medium" data-testid="percent-used">
            {data.percentUsed !== null ? `${data.percentUsed.toFixed(1)}%` : "—"}
          </span>
        </div>

        <div className="h-2 w-full rounded-full bg-muted">
          <div
            className={`h-2 rounded-full transition-all ${
              data.status === "ok"
                ? "bg-green-500"
                : data.status === "warning"
                  ? "bg-yellow-500"
                  : data.status === "critical"
                    ? "bg-red-500"
                    : "bg-gray-400"
            }`}
            style={{ width: `${Math.min(data.percentUsed ?? 0, 100)}%` }}
            data-testid="progress-bar"
          />
        </div>

        <p className={`text-sm ${config.color}`} data-testid="status-text">
          {config.text}
        </p>
      </div>
    </div>
  );
}
