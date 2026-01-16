/**
 * AI Provider Settings API
 *
 * GET: Returns current AI mode and provider configuration
 */

import { NextResponse } from "next/server";
import { detectAiMode } from "@/lib/ai-provider-config";

export async function GET() {
  const config = detectAiMode();

  return NextResponse.json({
    mode: config.mode,
    primaryProvider: config.primaryProvider,
    availableProviders: config.availableProviders,
    canRunAi: config.canRunAi,
    bannerText: config.bannerText,
    bannerVariant: config.bannerVariant,
  });
}
