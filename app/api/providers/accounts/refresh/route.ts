/**
 * POST /api/providers/accounts/refresh
 *
 * Refresh all provider balances (Anthropic, OpenAI).
 * Updates provider_accounts table with latest balance info.
 *
 * Response:
 * {
 *   results: [
 *     { provider, balanceUsd, source, spendUsd, limitUsd, updatedAt }
 *   ]
 * }
 */

import { NextResponse } from "next/server";
import { refreshAllProviderBalances } from "@/server/services/providers/provider-accounts.service";

export async function POST() {
  try {
    const results = await refreshAllProviderBalances();

    return NextResponse.json({
      results: results.map((r) => ({
        provider: r.provider,
        balanceUsd: r.balanceUsd,
        balanceSource: r.source,
        spendUsd: r.spendUsd,
        limitUsd: r.limitUsd,
        updatedAt: r.updatedAt,
      })),
    });
  } catch (error) {
    console.error("Error refreshing provider balances:", error);
    return NextResponse.json(
      { error: "Failed to refresh provider balances" },
      { status: 500 }
    );
  }
}
