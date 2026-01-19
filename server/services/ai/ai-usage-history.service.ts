/**
 * AI Usage History Service (PR-56)
 * Read-only service for fetching AI usage events from ai_cost_events table.
 */

import { db } from "@/server/db";
import { aiCostEvents } from "@/server/db/schema";
import { desc, eq, and, gte, sql } from "drizzle-orm";

export type AiUsageItem = {
  id: string;
  provider: "anthropic" | "openai" | "db" | "mock";
  model: string | null;
  tokensPrompt: number | null;
  tokensCompletion: number | null;
  estimatedCostUsd: number | null;
  source: string | null;
  createdAt: Date;
};

export type GetAiUsageParams = {
  limit: number;
  days?: number;
  provider?: string;
  source?: string; // for testing isolation
};

export type AiUsageResponse = {
  items: AiUsageItem[];
  totalUsd: number;
};

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function clampLimit(limit: number | undefined): number {
  if (!limit || limit < 1) return DEFAULT_LIMIT;
  return Math.min(limit, MAX_LIMIT);
}

/**
 * Get AI usage history from ai_cost_events table.
 * Read-only, sorted by createdAt DESC.
 */
export async function getAiUsageHistory(
  params?: Partial<GetAiUsageParams>
): Promise<AiUsageResponse> {
  const limit = clampLimit(params?.limit);
  const conditions = [];

  // Filter by days if provided
  if (params?.days && params.days > 0) {
    const cutoff = new Date(Date.now() - params.days * 24 * 60 * 60 * 1000);
    conditions.push(gte(aiCostEvents.createdAt, cutoff));
  }

  // Filter by provider if provided
  if (params?.provider) {
    conditions.push(eq(aiCostEvents.provider, params.provider));
  }

  // Filter by source (for testing isolation)
  if (params?.source) {
    conditions.push(eq(aiCostEvents.source, params.source));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(aiCostEvents)
    .where(whereClause)
    .orderBy(desc(aiCostEvents.createdAt))
    .limit(limit);

  const items: AiUsageItem[] = rows.map((row) => ({
    id: row.id,
    provider: row.provider as AiUsageItem["provider"],
    model: row.model,
    tokensPrompt: row.promptTokens,
    tokensCompletion: row.completionTokens,
    estimatedCostUsd: row.estimatedCostUsd,
    source: row.source,
    createdAt: row.createdAt,
  }));

  const totalUsd = items.reduce((sum, item) => sum + (item.estimatedCostUsd ?? 0), 0);

  return { items, totalUsd };
}
