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
 * - reason?: string (when realAiEligible is false)
 */
export async function GET() {
  const status = getAiStatus();
  return NextResponse.json(status);
}
