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

export interface ConfiguredProvider {
  provider: string;
  keyPresent: boolean;
  keyMasked: string | null;
}

export interface AiStatusResponse {
  realAiEligible: boolean;
  provider: "anthropic" | "mock" | "db";
  model: string;
  reason?: AiStatusReason;
  limitUSD?: number;
  spendUSD?: number;
  /** PR-121: "real" | "mock" | "forced_mock" */
  mode: "real" | "mock" | "forced_mock";
  /** PR-121: List of configured providers with masked keys */
  configuredProviders: ConfiguredProvider[];
  /** PR-121: Which env vars triggered test mode (empty if not in test mode) */
  testModeTriggers: string[];
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
 * Get which env vars triggered test mode
 */
function getTestModeTriggers(): string[] {
  const triggers: string[] = [];
  if (process.env.PLAYWRIGHT === "1") {
    triggers.push("PLAYWRIGHT=1");
  }
  if (process.env.NODE_ENV === "test") {
    triggers.push("NODE_ENV=test");
  }
  return triggers;
}

/**
 * Mask an API key for display (show first 6 and last 4 chars)
 */
function maskApiKey(key: string): string {
  if (key.length <= 10) {
    // For short keys, show first 3 and last 3
    return key.slice(0, 3) + "****" + key.slice(-3);
  }
  return key.slice(0, 6) + "****" + key.slice(-4);
}

/**
 * Get list of configured providers with masked keys
 */
function getConfiguredProviders(): ConfiguredProvider[] {
  const providers: ConfiguredProvider[] = [];

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    providers.push({
      provider: "anthropic",
      keyPresent: true,
      keyMasked: maskApiKey(anthropicKey),
    });
  }

  // Add OpenAI if configured in future
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    providers.push({
      provider: "openai",
      keyPresent: true,
      keyMasked: maskApiKey(openaiKey),
    });
  }

  return providers;
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
  const configuredProviders = getConfiguredProviders();
  const testModeTriggers = getTestModeTriggers();

  // Test mode always uses mock
  if (isTestMode()) {
    return {
      realAiEligible: false,
      provider: "mock",
      model: "mock",
      reason: "TEST_MODE_FORCED_MOCK",
      mode: "forced_mock",
      configuredProviders,
      testModeTriggers,
    };
  }

  // Check FEATURE_REAL_AI flag
  if (!isRealAiFlagEnabled()) {
    return {
      realAiEligible: false,
      provider: "db",
      model: "configured-in-db",
      reason: "FEATURE_REAL_AI_DISABLED",
      mode: "mock",
      configuredProviders,
      testModeTriggers,
    };
  }

  // Check ANTHROPIC_API_KEY
  if (!hasAnthropicKey()) {
    return {
      realAiEligible: false,
      provider: "db",
      model: "configured-in-db",
      reason: "MISSING_API_KEY",
      mode: "mock",
      configuredProviders,
      testModeTriggers,
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
      mode: "mock",
      configuredProviders,
      testModeTriggers,
    };
  }

  // All conditions met - real AI enabled
  return {
    realAiEligible: true,
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
    mode: "real",
    configuredProviders,
    testModeTriggers,
  };
}
