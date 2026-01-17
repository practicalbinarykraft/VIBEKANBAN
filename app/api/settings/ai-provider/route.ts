/**
 * AI Provider Settings API
 *
 * GET: Returns current AI mode and provider configuration
 * Uses BYOK settings from database, falls back to env vars
 */

import { NextResponse } from "next/server";
import { detectAiModeAsync } from "@/lib/ai-provider-config";

export async function GET() {
  const config = await detectAiModeAsync();

  return NextResponse.json({
    mode: config.mode,
    primaryProvider: config.primaryProvider,
    availableProviders: config.availableProviders,
    canRunAi: config.canRunAi,
    bannerText: config.bannerText,
    bannerVariant: config.bannerVariant,
  });
}
