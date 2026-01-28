/**
 * Real AI Configuration (PR-130: Mock mode gating)
 *
 * Handles FEATURE_REAL_AI flag for enabling real AI via env vars.
 * This allows CI/local testing with real Anthropic without DB config.
 *
 * Priority:
 * 1. Mock mode enabled (CI/VK_TEST_MODE/E2E_PROFILE) → always mock
 * 2. FEATURE_REAL_AI=1 + ANTHROPIC_API_KEY → use real Anthropic
 * 3. Otherwise → fallback to database settings (existing behavior)
 */

import { isMockModeEnabled } from "@/lib/mock-mode";

export interface RealAiConfig {
  provider: "anthropic";
  apiKey: string;
  model: string;
}

// isTestMode removed - use isMockModeEnabled() from @/lib/mock-mode

/**
 * Check if FEATURE_REAL_AI flag is enabled
 */
function isRealAiFlagEnabled(): boolean {
  const value = process.env.FEATURE_REAL_AI;
  return value === "1" || value === "true";
}

/**
 * Check if should use real AI from env vars
 *
 * Returns true only when:
 * - NOT in test mode (PLAYWRIGHT=1 or NODE_ENV=test)
 * - FEATURE_REAL_AI=1
 * - ANTHROPIC_API_KEY is set
 */
export function shouldUseRealAi(): boolean {
  if (isMockModeEnabled()) {
    return false;
  }
  if (!isRealAiFlagEnabled()) {
    return false;
  }
  return !!process.env.ANTHROPIC_API_KEY;
}

/**
 * Get real AI configuration from env vars
 *
 * Returns null if shouldUseRealAi() is false
 */
export function getRealAiConfig(): RealAiConfig | null {
  if (!shouldUseRealAi()) {
    return null;
  }

  return {
    provider: "anthropic",
    apiKey: process.env.ANTHROPIC_API_KEY!,
    model: "claude-sonnet-4-20250514",
  };
}
