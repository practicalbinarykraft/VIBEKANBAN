/**
 * Balance Estimator (PR-52)
 *
 * Estimates provider balance from ai_cost_events table.
 * Used as fallback when provider API doesn't support balance queries.
 */

import { db } from "@/server/db";
import { aiCostEvents } from "@/server/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import type { Provider } from "./provider-adapter";

export interface EstimateResult {
  spendUsd: number;
  remainingUsd: number | null;
}

export interface EstimateOptions {
  windowDays?: number;
  testSource?: string;
}

/**
 * Get monthly limit from environment variable
 */
function getMonthlyLimitUsd(provider: Provider): number | null {
  const envKey =
    provider === "anthropic"
      ? "ANTHROPIC_MONTHLY_LIMIT_USD"
      : "OPENAI_MONTHLY_LIMIT_USD";

  const value = process.env[envKey];
  if (!value || value === "") return null;

  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Estimate provider balance from ai_cost_events
 *
 * @param provider - anthropic or openai
 * @param options - Optional: windowDays (default 30), testSource for testing
 * @returns EstimateResult with spendUsd and remainingUsd
 */
export async function estimateProviderBalance(
  provider: Provider,
  options: EstimateOptions = {}
): Promise<EstimateResult> {
  const { windowDays = 30, testSource } = options;

  // Calculate window start date
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - windowDays);

  // Build query conditions
  const conditions = [
    eq(aiCostEvents.provider, provider),
    gte(aiCostEvents.createdAt, windowStart),
  ];

  // For testing: filter by source
  if (testSource) {
    conditions.push(eq(aiCostEvents.source, testSource));
  }

  // Sum estimated costs for provider in window
  const result = await db
    .select({
      totalSpend: sql<number>`COALESCE(SUM(${aiCostEvents.estimatedCostUsd}), 0)`,
    })
    .from(aiCostEvents)
    .where(and(...conditions))
    .get();

  const spendUsd = result?.totalSpend ?? 0;
  const limitUsd = getMonthlyLimitUsd(provider);

  // Calculate remaining (can be negative if over budget)
  const remainingUsd = limitUsd !== null ? limitUsd - spendUsd : null;

  return {
    spendUsd,
    remainingUsd,
  };
}

/**
 * Get the monthly limit for a provider from env vars
 */
export function getProviderLimit(provider: Provider): number | null {
  return getMonthlyLimitUsd(provider);
}
