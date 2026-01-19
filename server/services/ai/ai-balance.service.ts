/**
 * AI Balance Service (PR-49)
 *
 * Provides unified interface for getting AI provider balances.
 * Priority: 1) API balance 2) Fallback estimator 3) unknown
 */

import { db } from "@/server/db";
import { aiCostEvents } from "@/server/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";

export type BalanceSource = "api" | "estimator" | "unknown";
export type ProviderType = "anthropic" | "openai";

export interface ProviderBalanceAdapter {
  provider: ProviderType;
  getBalance(): Promise<{
    balanceUSD: number | null;
    source: BalanceSource;
  }>;
}

export interface EstimateBalanceResult {
  estimatedSpendUSD: number;
  estimatedBalanceUSD: number | null;
}

export interface ProviderBalanceResult {
  provider: ProviderType;
  balanceUSD: number | null;
  estimatedSpendUSD?: number;
  source: BalanceSource;
}

/**
 * Get monthly limit from environment variable
 */
function getMonthlyLimitUSD(provider: ProviderType): number | null {
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
 * Calculate spend from ai_cost_events within time window
 */
export async function estimateBalanceFromEvents(options: {
  provider: ProviderType;
  windowDays?: number;
  testSource?: string;
}): Promise<EstimateBalanceResult> {
  const { provider, windowDays = 30, testSource } = options;

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

  // Sum estimatedCostUsd for provider in window
  const result = await db
    .select({
      totalSpend: sql<number>`COALESCE(SUM(${aiCostEvents.estimatedCostUsd}), 0)`,
    })
    .from(aiCostEvents)
    .where(and(...conditions))
    .get();

  const estimatedSpendUSD = result?.totalSpend ?? 0;
  const monthlyLimit = getMonthlyLimitUSD(provider);
  const estimatedBalanceUSD =
    monthlyLimit !== null ? monthlyLimit - estimatedSpendUSD : null;

  return {
    estimatedSpendUSD,
    estimatedBalanceUSD,
  };
}

/**
 * Anthropic balance adapter
 * Note: Anthropic API does not provide balance endpoint, returns null
 */
class AnthropicBalanceAdapter implements ProviderBalanceAdapter {
  provider: ProviderType = "anthropic";

  async getBalance(): Promise<{ balanceUSD: number | null; source: BalanceSource }> {
    // Anthropic API does not provide a balance endpoint
    return { balanceUSD: null, source: "unknown" };
  }
}

/**
 * OpenAI balance adapter
 * Note: OpenAI billing API requires org admin access, returns null for now
 */
class OpenAIBalanceAdapter implements ProviderBalanceAdapter {
  provider: ProviderType = "openai";

  async getBalance(): Promise<{ balanceUSD: number | null; source: BalanceSource }> {
    // OpenAI billing API requires special access, not implemented
    return { balanceUSD: null, source: "unknown" };
  }
}

/**
 * Get balance adapter for provider
 */
function getBalanceAdapter(provider: ProviderType): ProviderBalanceAdapter {
  switch (provider) {
    case "anthropic":
      return new AnthropicBalanceAdapter();
    case "openai":
      return new OpenAIBalanceAdapter();
  }
}

/**
 * Get AI provider balance with fallback to estimator
 *
 * Priority:
 * 1. API balance (if available)
 * 2. Fallback estimator (from ai_cost_events)
 * 3. unknown
 */
export async function getAiProviderBalance(
  provider: ProviderType,
  options?: { testSource?: string }
): Promise<ProviderBalanceResult> {
  const adapter = getBalanceAdapter(provider);

  // Try API balance first
  const apiResult = await adapter.getBalance();
  if (apiResult.source === "api" && apiResult.balanceUSD !== null) {
    return {
      provider,
      balanceUSD: apiResult.balanceUSD,
      source: "api",
    };
  }

  // Fallback to estimator
  const estimate = await estimateBalanceFromEvents({
    provider,
    windowDays: 30,
    testSource: options?.testSource,
  });

  // If we have spend data, return estimator result
  if (estimate.estimatedSpendUSD > 0 || estimate.estimatedBalanceUSD !== null) {
    return {
      provider,
      balanceUSD: estimate.estimatedBalanceUSD,
      estimatedSpendUSD: estimate.estimatedSpendUSD,
      source: "estimator",
    };
  }

  // No data available
  return {
    provider,
    balanceUSD: null,
    source: "unknown",
  };
}

/**
 * Get balances for all configured providers
 */
export async function getAllProviderBalances(): Promise<ProviderBalanceResult[]> {
  const providers: ProviderType[] = ["anthropic", "openai"];
  const results = await Promise.all(
    providers.map((provider) => getAiProviderBalance(provider))
  );
  return results;
}
