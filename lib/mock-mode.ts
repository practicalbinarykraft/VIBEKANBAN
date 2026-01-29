/**
 * Centralized Mock Mode Gating (PR-130)
 *
 * IMPORTANT: This is the ONLY place that controls mock mode.
 *
 * Mock mode is enabled ONLY by EXPLICIT FLAGS:
 * - VK_TEST_MODE=1 (explicit test mode flag)
 * - E2E_PROFILE=ci (E2E CI test profile)
 * - E2E_PROFILE=local (E2E local test profile)
 *
 * NOT triggered by (so unit tests can validate real AI logic):
 * - NODE_ENV=test
 * - CI=true
 * - PLAYWRIGHT=1 alone
 */

export type MockModeTrigger = "VK_TEST_MODE" | "E2E_PROFILE";

/**
 * Check if mock mode is enabled.
 * This is the SINGLE SOURCE OF TRUTH for mock mode.
 *
 * Only explicit flags activate mock mode, NOT environment detection.
 * This allows unit tests to test both mock and real AI branches.
 */
export function isMockModeEnabled(): boolean {
  return (
    process.env.VK_TEST_MODE === "1" ||
    process.env.E2E_PROFILE === "ci" ||
    process.env.E2E_PROFILE === "local"
  );
}

/**
 * Get the list of triggers that activated mock mode.
 * Useful for debugging and UI display.
 */
export function getMockModeTriggers(): MockModeTrigger[] {
  const triggers: MockModeTrigger[] = [];

  if (process.env.VK_TEST_MODE === "1") triggers.push("VK_TEST_MODE");
  if (process.env.E2E_PROFILE === "ci" || process.env.E2E_PROFILE === "local") {
    triggers.push("E2E_PROFILE");
  }

  return triggers;
}

/**
 * Get human-readable description of why mock mode is active.
 */
export function getMockModeReason(): string | null {
  const triggers = getMockModeTriggers();
  if (triggers.length === 0) return null;

  const parts: string[] = [];

  if (process.env.VK_TEST_MODE === "1") {
    parts.push("VK_TEST_MODE=1");
  }
  if (process.env.E2E_PROFILE === "ci") {
    parts.push("E2E_PROFILE=ci");
  }
  if (process.env.E2E_PROFILE === "local") {
    parts.push("E2E_PROFILE=local");
  }

  return parts.join(", ");
}

/**
 * @deprecated Use isMockModeEnabled() instead.
 * This function is kept for backward compatibility during migration.
 */
export function isTestMode(): boolean {
  return isMockModeEnabled();
}
