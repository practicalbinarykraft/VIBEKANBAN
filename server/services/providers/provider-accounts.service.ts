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
 * Get all provider accounts from DB
 */
export async function getAllProviderAccounts(): Promise<ProviderAccountRow[]> {
  const rows = await db.select().from(providerAccounts);

  const providers: Provider[] = ["anthropic", "openai"];
  const result: ProviderAccountRow[] = [];

  for (const provider of providers) {
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
      // No record yet - return placeholder
      result.push({
        provider,
        balanceUsd: null,
        spendUsd: null,
        limitUsd,
        balanceSource: "unknown",
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
