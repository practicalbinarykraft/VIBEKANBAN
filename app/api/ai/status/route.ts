import { NextResponse } from "next/server";
import { getAiStatus } from "@/server/services/ai/ai-status";

/**
 * GET /api/ai/status
 *
 * Returns current AI configuration status.
 * Used by Settings UI to display Real AI status card.
 *
 * Response:
 * - realAiEligible: boolean
 * - provider: "anthropic" | "mock" | "db"
 * - model: string
 * - reason?: AiStatusReason (when realAiEligible is false)
 * - limitUSD?: number (when BUDGET_LIMIT_EXCEEDED)
 * - spendUSD?: number (when BUDGET_LIMIT_EXCEEDED)
 */
export async function GET() {
  const status = await getAiStatus();
  return NextResponse.json(status);
}
