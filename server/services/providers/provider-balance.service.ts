/**
 * Provider Balance Service (PR-52)
 *
 * Refreshes provider balances and stores in provider_accounts table.
 * Logic:
 * 1. Try provider adapter (e.g., anthropic API)
 * 2. If unknown -> fall back to estimator
 * 3. Save to provider_accounts table
 */

import { db } from "@/server/db";
import { providerAccounts } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import type { Provider, BalanceSource } from "./provider-adapter";
import { getAnthropicBalance } from "./adapters/anthropic-balance.adapter";
import { estimateProviderBalance, getProviderLimit } from "./balance-estimator";

export interface RefreshOptions {
  testSource?: string;
}

export interface RefreshResult {
  provider: Provider;
  balanceUsd: number | null;
  source: BalanceSource;
  spendUsd: number;
  limitUsd: number | null;
  updatedAt: string;
}

/**
 * Get adapter function for provider
 */
function getAdapter(provider: Provider) {
  switch (provider) {
    case "anthropic":
      return getAnthropicBalance;
    case "openai":
      // OpenAI adapter not implemented yet - return unknown
      return async () => ({ availableUsd: null as null, source: "unknown" as const });
  }
}

/**
 * Refresh provider balance
 *
 * 1. Try provider adapter (API)
 * 2. If unknown -> estimator from ai_cost_events
 * 3. Save to provider_accounts
 *
 * @param provider - anthropic or openai
 * @param options - Optional: testSource for testing
 * @returns RefreshResult with balance info
 */
export async function refreshProviderBalance(
  provider: Provider,
  options: RefreshOptions = {}
): Promise<RefreshResult> {
  const { testSource } = options;
  const now = new Date();

  // Step 1: Try adapter
  const adapter = getAdapter(provider);
  const adapterResult = await adapter();

  let balanceUsd: number | null = null;
  let source: BalanceSource = "unknown";
  let spendUsd = 0;

  if (adapterResult.source === "provider_api" && adapterResult.availableUsd !== null) {
    // Adapter returned real balance
    balanceUsd = adapterResult.availableUsd;
    source = "provider_api";
  } else {
    // Step 2: Fall back to estimator
    const estimate = await estimateProviderBalance(provider, {
      testSource,
    });

    spendUsd = estimate.spendUsd;
    balanceUsd = estimate.remainingUsd;

    // Determine source
    if (estimate.spendUsd > 0 || estimate.remainingUsd !== null) {
      source = "estimator";
    } else {
      source = "unknown";
    }
  }

  const limitUsd = getProviderLimit(provider);

  // Step 3: Upsert to provider_accounts
  const existing = await db
    .select()
    .from(providerAccounts)
    .where(eq(providerAccounts.provider, provider))
    .get();

  if (existing) {
    // Update existing record
    await db
      .update(providerAccounts)
      .set({
        balanceUsd,
        balanceSource: source,
        balanceUpdatedAt: now,
        monthlyLimitUsd: limitUsd,
        updatedAt: now,
      })
      .where(eq(providerAccounts.provider, provider));
  } else {
    // Insert new record
    await db.insert(providerAccounts).values({
      id: crypto.randomUUID(),
      provider,
      balanceUsd,
      balanceSource: source,
      balanceUpdatedAt: now,
      monthlyLimitUsd: limitUsd,
      createdAt: now,
      updatedAt: now,
    });
  }

  return {
    provider,
    balanceUsd,
    source,
    spendUsd,
    limitUsd,
    updatedAt: now.toISOString(),
  };
}
