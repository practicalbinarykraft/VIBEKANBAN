/**
 * API: /api/ai/usage/alerts (PR-58)
 * Read-only endpoint for AI usage alerts and thresholds.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAiUsageAlerts } from "@/server/services/ai/ai-usage-alerts.service";

type Provider = "anthropic" | "openai";

function isValidProvider(value: string | null): value is Provider {
  return value === "anthropic" || value === "openai";
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const providerParam = searchParams.get("provider") || "anthropic";

    if (!isValidProvider(providerParam)) {
      return NextResponse.json(
        { error: "Invalid provider. Use 'anthropic' or 'openai'." },
        { status: 400 }
      );
    }

    const result = await getAiUsageAlerts(providerParam);

    return NextResponse.json({
      provider: providerParam,
      ...result,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch usage alerts" },
      { status: 500 }
    );
  }
}
