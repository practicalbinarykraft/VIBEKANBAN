/**
 * GET /api/ai/usage/summary
 *
 * Returns aggregated AI usage data:
 * - byDay: usage per day, sorted ASC by date
 * - byProvider: usage per provider, sorted DESC by totalUsd
 *
 * Response:
 * {
 *   "byDay": [
 *     { "date": "2026-01-18", "totalUsd": 1.23 },
 *     { "date": "2026-01-19", "totalUsd": 0.87 }
 *   ],
 *   "byProvider": [
 *     { "provider": "anthropic", "totalUsd": 1.80 },
 *     { "provider": "openai", "totalUsd": 0.30 }
 *   ]
 * }
 */

import { NextResponse } from "next/server";
import {
  getAiUsageByDay,
  getAiUsageByProvider,
} from "@/server/services/ai/ai-usage-aggregates.service";

export async function GET() {
  try {
    const [byDay, byProvider] = await Promise.all([
      getAiUsageByDay(),
      getAiUsageByProvider(),
    ]);

    return NextResponse.json({
      byDay,
      byProvider,
    });
  } catch (error) {
    console.error("Error fetching usage summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch usage summary" },
      { status: 500 }
    );
  }
}
