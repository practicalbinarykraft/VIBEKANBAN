/**
 * API: /api/ai/usage (PR-56)
 * Read-only endpoint for AI usage history.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAiUsageHistory } from "@/server/services/ai/ai-usage-history.service";

function parseIntParam(value: string | null): number | undefined {
  if (!value) return undefined;
  const num = parseInt(value, 10);
  return isNaN(num) ? undefined : num;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseIntParam(searchParams.get("limit"));
    const days = parseIntParam(searchParams.get("days"));
    const provider = searchParams.get("provider") || undefined;

    const result = await getAiUsageHistory({ limit, days, provider });

    // Serialize dates to ISO strings (handles null and Invalid Date)
    const items = result.items.map((item) => ({
      ...item,
      createdAt: item.createdAt instanceof Date && !isNaN(item.createdAt.getTime())
        ? item.createdAt.toISOString()
        : null,
    }));

    return NextResponse.json({ items, totalUsd: result.totalUsd });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch usage history" },
      { status: 500 }
    );
  }
}
