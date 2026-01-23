/**
 * Provider Accounts Service (PR-55)
 *
 * Functions to query and manage provider_accounts table.
 */

import { db } from "@/server/db";
import { providerAccounts } from "@/server/db/schema";
import type { Provider } from "./provider-adapter";
import { getProviderLimit } from "./balance-estimator";
import { refreshProviderBalance, type RefreshResult } from "./provider-balance.service";

export interface ProviderAccountRow {
  provider: string;
  balanceUsd: number | null;
  spendUsd: number | null;
  limitUsd: number | null;
  balanceSource: string;
  updatedAt: string | null;
  status: "ok" | "over_budget" | "unknown";
}

/**
 * Check if a provider has an API key configured
 */
function isProviderConfigured(provider: Provider): boolean {
  if (provider === "anthropic") {
    return !!process.env.ANTHROPIC_API_KEY;
  }
  if (provider === "openai") {
    return !!process.env.OPENAI_API_KEY;
  }
  return false;
}

/**
 * Get all provider accounts from DB
 * PR-121: Only returns providers that are actually configured (have API keys)
 */
export async function getAllProviderAccounts(): Promise<ProviderAccountRow[]> {
  const rows = await db.select().from(providerAccounts);

  // PR-121: Only include providers that have API keys configured
  const allProviders: Provider[] = ["anthropic", "openai"];
  const configuredProviders = allProviders.filter(isProviderConfigured);
  const result: ProviderAccountRow[] = [];

  for (const provider of configuredProviders) {
    const row = rows.find((r) => r.provider === provider);
    const limitUsd = getProviderLimit(provider);

    if (row) {
      // Determine status
      let status: "ok" | "over_budget" | "unknown" = "unknown";
      if (row.balanceUsd !== null && limitUsd !== null) {
        status = row.balanceUsd < 0 ? "over_budget" : "ok";
      } else if (row.balanceSource === "estimator" || row.balanceSource === "provider_api") {
        status = "ok";
      }

      result.push({
        provider: row.provider,
        balanceUsd: row.balanceUsd,
        spendUsd: limitUsd !== null && row.balanceUsd !== null ? limitUsd - row.balanceUsd : null,
        limitUsd,
        balanceSource: row.balanceSource,
        updatedAt: row.balanceUpdatedAt?.toISOString() ?? null,
        status,
      });
    } else {
      // Provider configured but no DB record yet
      result.push({
        provider,
        balanceUsd: null,
        spendUsd: null,
        limitUsd,
        balanceSource: "not_tracked",
        updatedAt: null,
        status: "unknown",
      });
    }
  }

  return result;
}

/**
 * Refresh all provider balances
 */
export async function refreshAllProviderBalances(): Promise<RefreshResult[]> {
  const providers: Provider[] = ["anthropic", "openai"];
  const results: RefreshResult[] = [];

  for (const provider of providers) {
    const result = await refreshProviderBalance(provider);
    results.push(result);
  }

  return results;
}
