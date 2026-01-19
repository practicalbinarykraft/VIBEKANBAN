/**
 * POST /api/ai/balance/refresh
 *
 * Refresh provider balance (Anthropic/OpenAI).
 * Updates provider_accounts table with latest balance info.
 *
 * Request Body: { provider: "anthropic" | "openai" }
 * Response: { provider, balanceUsd, balanceSource, spendUsd, limitUsd, updatedAt }
 */

import { NextRequest, NextResponse } from "next/server";
import { refreshProviderBalance } from "@/server/services/providers/provider-balance.service";
import type { Provider } from "@/server/services/providers/provider-adapter";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate provider
    const { provider } = body as { provider?: string };
    if (!provider || !["anthropic", "openai"].includes(provider)) {
      return NextResponse.json(
        { error: "Invalid provider. Must be 'anthropic' or 'openai'" },
        { status: 400 }
      );
    }

    const result = await refreshProviderBalance(provider as Provider);

    return NextResponse.json({
      provider: result.provider,
      balanceUsd: result.balanceUsd,
      balanceSource: result.source,
      spendUsd: result.spendUsd,
      limitUsd: result.limitUsd,
      updatedAt: result.updatedAt,
    });
  } catch (error) {
    console.error("Error refreshing provider balance:", error);
    return NextResponse.json(
      { error: "Failed to refresh provider balance" },
      { status: 500 }
    );
  }
}
