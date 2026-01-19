/**
 * AI Usage Aggregates Service (PR-57)
 *
 * Read-only aggregation of AI usage data from ai_cost_events table.
 * Provides daily and provider summaries.
 */

import { db } from "@/server/db";
import { aiCostEvents } from "@/server/db/schema";
import { eq, and, sql, isNotNull } from "drizzle-orm";

export interface DayUsage {
  date: string; // YYYY-MM-DD
  totalUsd: number;
}

export interface ProviderUsage {
  provider: string;
  totalUsd: number;
}

export interface AggregateParams {
  testSource?: string; // For test isolation
}

/**
 * Get AI usage aggregated by day
 *
 * @returns Array of { date, totalUsd } sorted ASC by date
 */
export async function getAiUsageByDay(params: AggregateParams = {}): Promise<DayUsage[]> {
  const { testSource } = params;

  // Build conditions
  const conditions = [isNotNull(aiCostEvents.estimatedCostUsd)];
  if (testSource) {
    conditions.push(eq(aiCostEvents.source, testSource));
  }

  // Query with GROUP BY date, ORDER BY date ASC
  const results = await db
    .select({
      date: sql<string>`date(${aiCostEvents.createdAt}, 'unixepoch')`.as("date"),
      totalUsd: sql<number>`COALESCE(SUM(${aiCostEvents.estimatedCostUsd}), 0)`.as("total"),
    })
    .from(aiCostEvents)
    .where(and(...conditions))
    .groupBy(sql`date(${aiCostEvents.createdAt}, 'unixepoch')`)
    .orderBy(sql`date(${aiCostEvents.createdAt}, 'unixepoch') ASC`);

  return results.map((r) => ({
    date: r.date,
    totalUsd: r.totalUsd,
  }));
}

/**
 * Get AI usage aggregated by provider
 *
 * @returns Array of { provider, totalUsd } sorted DESC by totalUsd
 */
export async function getAiUsageByProvider(params: AggregateParams = {}): Promise<ProviderUsage[]> {
  const { testSource } = params;

  // Build conditions
  const conditions = [isNotNull(aiCostEvents.estimatedCostUsd)];
  if (testSource) {
    conditions.push(eq(aiCostEvents.source, testSource));
  }

  // Query with GROUP BY provider, ORDER BY totalUsd DESC
  const results = await db
    .select({
      provider: aiCostEvents.provider,
      totalUsd: sql<number>`COALESCE(SUM(${aiCostEvents.estimatedCostUsd}), 0)`.as("total"),
    })
    .from(aiCostEvents)
    .where(and(...conditions))
    .groupBy(aiCostEvents.provider)
    .orderBy(sql`total DESC`);

  return results.map((r) => ({
    provider: r.provider,
    totalUsd: r.totalUsd,
  }));
}
