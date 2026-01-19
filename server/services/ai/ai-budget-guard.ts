/**
 * AI Budget Guard
 *
 * Enforces spending limits on AI providers.
 * Reads limits from env vars, calculates spend from database.
 *
 * ENV vars:
 * - ANTHROPIC_MONTHLY_LIMIT_USD
 * - OPENAI_MONTHLY_LIMIT_USD
 */

import { db } from "@/server/db";
import { aiCostEvents } from "@/server/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";

export type Provider = "anthropic" | "openai";

export type BudgetDecision =
  | { allowed: true; provider: Provider; reason: "within_limit" | "no_limit" }
  | { allowed: false; provider: Provider; reason: "limit_exceeded"; limitUSD: number; spendUSD: number };

/**
 * Get the start of current month as Date
 */
function getMonthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

/**
 * Get monthly spending limit from env var
 * Returns null if not set or invalid
 */
function getProviderLimit(provider: Provider): number | null {
  const envVar = provider === "anthropic"
    ? process.env.ANTHROPIC_MONTHLY_LIMIT_USD
    : process.env.OPENAI_MONTHLY_LIMIT_USD;

  if (!envVar) return null;

  const limit = parseFloat(envVar);
  if (isNaN(limit)) return null;

  return limit;
}

/**
 * Get total estimated spend for provider in current month
 */
export async function getMonthlySpend(provider: Provider): Promise<number> {
  const monthStart = getMonthStart();

  const events = await db
    .select({ estimatedCostUsd: aiCostEvents.estimatedCostUsd })
    .from(aiCostEvents)
    .where(
      and(
        eq(aiCostEvents.provider, provider),
        gte(aiCostEvents.createdAt, monthStart)
      )
    )
    .all();

  return events.reduce((sum, e) => sum + (e.estimatedCostUsd || 0), 0);
}

/**
 * Check if provider is within budget
 *
 * Returns decision with:
 * - allowed: true if within budget or no limit set
 * - allowed: false if spend >= limit
 */
export async function checkProviderBudget(provider: Provider): Promise<BudgetDecision> {
  const limit = getProviderLimit(provider);

  // No limit configured - always allowed
  if (limit === null) {
    return {
      allowed: true,
      provider,
      reason: "no_limit",
    };
  }

  const spend = await getMonthlySpend(provider);

  // Check if within budget
  if (spend < limit) {
    return {
      allowed: true,
      provider,
      reason: "within_limit",
    };
  }

  // Budget exceeded
  return {
    allowed: false,
    provider,
    reason: "limit_exceeded",
    limitUSD: limit,
    spendUSD: spend,
  };
}
