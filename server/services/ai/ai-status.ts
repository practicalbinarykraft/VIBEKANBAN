/**
 * AI Status Service (PR-122: BYOK support)
 *
 * Returns current AI configuration status for Settings UI.
 * Reads API keys from BYOK storage (DB settings table) first,
 * falls back to env vars for dev/CI scenarios.
 * Does NOT expose sensitive data (API keys).
 */

import { checkProviderBudget } from "./ai-budget-guard";
import { getByokSettings, getApiKey, type ByokSettings } from "./ai-byok";

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
  mode: "real" | "mock" | "forced_mock";
  configuredProviders: ConfiguredProvider[];
  testModeTriggers: string[];
}

function isTestMode(): boolean {
  return process.env.PLAYWRIGHT === "1" || process.env.NODE_ENV === "test";
}

function isRealAiFlagEnabled(): boolean {
  const value = process.env.FEATURE_REAL_AI;
  return value === "1" || value === "true";
}

function getTestModeTriggers(): string[] {
  const triggers: string[] = [];
  if (process.env.PLAYWRIGHT === "1") triggers.push("PLAYWRIGHT=1");
  if (process.env.NODE_ENV === "test") triggers.push("NODE_ENV=test");
  return triggers;
}

function maskApiKey(key: string): string {
  if (key.length <= 10) return key.slice(0, 3) + "****" + key.slice(-3);
  return key.slice(0, 6) + "****" + key.slice(-4);
}

function getConfiguredProviders(byokSettings: ByokSettings | null): ConfiguredProvider[] {
  const providers: ConfiguredProvider[] = [];
  const anthropicKey = getApiKey("anthropic", byokSettings);
  if (anthropicKey) {
    providers.push({ provider: "anthropic", keyPresent: true, keyMasked: maskApiKey(anthropicKey) });
  }
  const openaiKey = getApiKey("openai", byokSettings);
  if (openaiKey) {
    providers.push({ provider: "openai", keyPresent: true, keyMasked: maskApiKey(openaiKey) });
  }
  return providers;
}

/**
 * Get current AI status for Settings UI
 * PR-122: Reads from BYOK (DB settings) first, falls back to env vars.
 */
export async function getAiStatus(): Promise<AiStatusResponse> {
  const byokSettings = await getByokSettings();
  const configuredProviders = getConfiguredProviders(byokSettings);
  const testModeTriggers = getTestModeTriggers();
  const model = byokSettings?.model || "claude-sonnet-4-20250514";

  if (isTestMode()) {
    return {
      realAiEligible: false, provider: "mock", model: "mock",
      reason: "TEST_MODE_FORCED_MOCK", mode: "forced_mock",
      configuredProviders, testModeTriggers,
    };
  }

  if (!isRealAiFlagEnabled()) {
    return {
      realAiEligible: false, provider: "db", model: "configured-in-db",
      reason: "FEATURE_REAL_AI_DISABLED", mode: "mock",
      configuredProviders, testModeTriggers,
    };
  }

  const anthropicKey = getApiKey("anthropic", byokSettings);
  if (!anthropicKey) {
    return {
      realAiEligible: false, provider: "db", model: "configured-in-db",
      reason: "MISSING_API_KEY", mode: "mock",
      configuredProviders, testModeTriggers,
    };
  }

  const budgetCheck = await checkProviderBudget("anthropic");
  if (!budgetCheck.allowed) {
    return {
      realAiEligible: false, provider: "db", model: "configured-in-db",
      reason: "BUDGET_LIMIT_EXCEEDED", mode: "mock",
      limitUSD: budgetCheck.limitUSD, spendUSD: budgetCheck.spendUSD,
      configuredProviders, testModeTriggers,
    };
  }

  return {
    realAiEligible: true, provider: "anthropic", model, mode: "real",
    configuredProviders, testModeTriggers,
  };
}
