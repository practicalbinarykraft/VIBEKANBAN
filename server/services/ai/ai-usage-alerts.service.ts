/**
 * AI Usage Alerts Service (PR-58)
 * Read-only service for checking usage thresholds and generating alerts.
 */

import { estimateProviderBalance, getProviderLimit } from "../providers/balance-estimator";

export type AlertStatus = "ok" | "warning" | "critical" | "blocked";

export interface UsageAlertResult {
  status: AlertStatus;
  limitUsd: number | null;
  spendUsd: number;
  percentUsed: number | null;
  threshold?: number;
}

export interface AlertOptions {
  testSource?: string;
}

const THRESHOLD_WARNING = 70;
const THRESHOLD_CRITICAL = 85;
const THRESHOLD_BLOCKED = 100;

function computeStatus(percentUsed: number | null): { status: AlertStatus; threshold?: number } {
  if (percentUsed === null) return { status: "ok" };
  if (percentUsed >= THRESHOLD_BLOCKED) return { status: "blocked", threshold: THRESHOLD_BLOCKED };
  if (percentUsed >= THRESHOLD_CRITICAL) return { status: "critical", threshold: THRESHOLD_CRITICAL };
  if (percentUsed >= THRESHOLD_WARNING) return { status: "warning", threshold: THRESHOLD_WARNING };
  return { status: "ok" };
}

function roundPercent(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Get AI usage alerts for a provider.
 * Read-only, no side effects.
 */
export async function getAiUsageAlerts(
  provider: "anthropic" | "openai",
  options: AlertOptions = {}
): Promise<UsageAlertResult> {
  const estimate = await estimateProviderBalance(provider, {
    testSource: options.testSource,
  });

  const limitUsd = getProviderLimit(provider);
  const spendUsd = estimate.spendUsd;

  let percentUsed: number | null = null;
  if (limitUsd !== null && limitUsd > 0) {
    percentUsed = roundPercent((spendUsd / limitUsd) * 100);
  }

  const { status, threshold } = computeStatus(percentUsed);

  return {
    status,
    limitUsd,
    spendUsd,
    percentUsed,
    ...(threshold !== undefined && { threshold }),
  };
}
