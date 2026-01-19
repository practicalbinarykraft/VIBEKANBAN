import { NextResponse } from "next/server";
import { getAllProviderBalances } from "@/server/services/ai/ai-balance.service";

/**
 * GET /api/ai/balance
 *
 * Returns balance information for all AI providers.
 * Uses API balance if available, falls back to estimator from cost events.
 *
 * Response:
 * {
 *   "providers": [
 *     {
 *       "provider": "anthropic",
 *       "balanceUSD": null | number,
 *       "estimatedSpendUSD": number,
 *       "source": "api" | "estimator" | "unknown"
 *     }
 *   ]
 * }
 */
export async function GET() {
  const providers = await getAllProviderBalances();
  return NextResponse.json({ providers });
}
