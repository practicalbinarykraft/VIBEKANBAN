/**
 * AI Status Service
 *
 * Returns current AI configuration status for Settings UI.
 * Does NOT expose sensitive data (API keys).
 */

import { checkProviderBudget } from "./ai-budget-guard";

export type AiStatusReason =
  | "FEATURE_REAL_AI_DISABLED"
  | "MISSING_API_KEY"
  | "TEST_MODE_FORCED_MOCK"
  | "BUDGET_LIMIT_EXCEEDED";

export interface AiStatusResponse {
  realAiEligible: boolean;
  provider: "anthropic" | "mock" | "db";
  model: string;
  reason?: AiStatusReason;
  limitUSD?: number;
  spendUSD?: number;
}

/**
 * Check if test mode is active
 */
function isTestMode(): boolean {
  return process.env.PLAYWRIGHT === "1" || process.env.NODE_ENV === "test";
}

/**
 * Check if FEATURE_REAL_AI flag is enabled
 */
function isRealAiFlagEnabled(): boolean {
  const value = process.env.FEATURE_REAL_AI;
  return value === "1" || value === "true";
}

/**
 * Check if ANTHROPIC_API_KEY is configured
 */
function hasAnthropicKey(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

/**
 * Get current AI status for Settings UI
 *
 * Priority:
 * 1. Test mode → mock provider
 * 2. FEATURE_REAL_AI + ANTHROPIC_API_KEY + within budget → anthropic
 * 3. FEATURE_REAL_AI + ANTHROPIC_API_KEY + over budget → db (blocked)
 * 4. Otherwise → db provider (fallback to DB settings)
 */
export async function getAiStatus(): Promise<AiStatusResponse> {
  // Test mode always uses mock
  if (isTestMode()) {
    return {
      realAiEligible: false,
      provider: "mock",
      model: "mock",
      reason: "TEST_MODE_FORCED_MOCK",
    };
  }

  // Check FEATURE_REAL_AI flag
  if (!isRealAiFlagEnabled()) {
    return {
      realAiEligible: false,
      provider: "db",
      model: "configured-in-db",
      reason: "FEATURE_REAL_AI_DISABLED",
    };
  }

  // Check ANTHROPIC_API_KEY
  if (!hasAnthropicKey()) {
    return {
      realAiEligible: false,
      provider: "db",
      model: "configured-in-db",
      reason: "MISSING_API_KEY",
    };
  }

  // Check budget
  const budgetCheck = await checkProviderBudget("anthropic");
  if (!budgetCheck.allowed) {
    return {
      realAiEligible: false,
      provider: "db",
      model: "configured-in-db",
      reason: "BUDGET_LIMIT_EXCEEDED",
      limitUSD: budgetCheck.limitUSD,
      spendUSD: budgetCheck.spendUSD,
    };
  }

  // All conditions met - real AI enabled
  return {
    realAiEligible: true,
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
  };
}
