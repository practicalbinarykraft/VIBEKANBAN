/**
 * AI Status Service
 *
 * Returns current AI configuration status for Settings UI.
 * Does NOT expose sensitive data (API keys).
 */

export interface AiStatusResponse {
  realAiEligible: boolean;
  provider: "anthropic" | "mock" | "db";
  model: string;
  reason?: string;
}

/**
 * Check if test mode is active
 */
function isTestMode(): { active: boolean; reason?: string } {
  if (process.env.PLAYWRIGHT === "1") {
    return { active: true, reason: "Test mode active (PLAYWRIGHT=1)" };
  }
  if (process.env.NODE_ENV === "test") {
    return { active: true, reason: "Test mode active (NODE_ENV=test)" };
  }
  return { active: false };
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
 * 2. FEATURE_REAL_AI + ANTHROPIC_API_KEY → anthropic provider
 * 3. Otherwise → db provider (fallback to DB settings)
 */
export function getAiStatus(): AiStatusResponse {
  const testMode = isTestMode();

  // Test mode always uses mock
  if (testMode.active) {
    return {
      realAiEligible: false,
      provider: "mock",
      model: "mock",
      reason: testMode.reason,
    };
  }

  // Check FEATURE_REAL_AI flag
  if (!isRealAiFlagEnabled()) {
    return {
      realAiEligible: false,
      provider: "db",
      model: "configured-in-db",
      reason: "FEATURE_REAL_AI flag not enabled",
    };
  }

  // Check ANTHROPIC_API_KEY
  if (!hasAnthropicKey()) {
    return {
      realAiEligible: false,
      provider: "db",
      model: "configured-in-db",
      reason: "ANTHROPIC_API_KEY not configured",
    };
  }

  // All conditions met - real AI enabled
  return {
    realAiEligible: true,
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
  };
}
