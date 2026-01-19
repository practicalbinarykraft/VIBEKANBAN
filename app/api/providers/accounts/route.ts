/**
 * GET /api/providers/accounts
 *
 * Returns list of all provider accounts with balance info.
 *
 * Response:
 * {
 *   providers: [
 *     {
 *       provider: "anthropic" | "openai",
 *       balanceUsd: number | null,
 *       spendUsd: number | null,
 *       limitUsd: number | null,
 *       balanceSource: "provider_api" | "estimator" | "unknown",
 *       updatedAt: string | null,
 *       status: "ok" | "over_budget" | "unknown"
 *     }
 *   ]
 * }
 */

import { NextResponse } from "next/server";
import { getAllProviderAccounts } from "@/server/services/providers/provider-accounts.service";

export async function GET() {
  try {
    const providers = await getAllProviderAccounts();
    return NextResponse.json({ providers });
  } catch (error) {
    console.error("Error fetching provider accounts:", error);
    return NextResponse.json(
      { error: "Failed to fetch provider accounts" },
      { status: 500 }
    );
  }
}
