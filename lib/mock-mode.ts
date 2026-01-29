/**
 * Centralized Mock Mode Gating (PR-130)
 *
 * IMPORTANT: This is the ONLY place that controls mock mode.
 * DO NOT use process.env.PLAYWRIGHT for mock gating anywhere else.
 *
 * Mock mode is enabled ONLY when:
 * - CI=true (GitHub Actions, etc.)
 * - VK_TEST_MODE=1 (explicit test mode flag)
 * - E2E_PROFILE=ci (E2E test profile)
 *
 * PLAYWRIGHT=1 is NOT a trigger for mock mode.
 * It's only used for test fixture route protection.
 */

export type MockModeTrigger = "CI" | "VK_TEST_MODE" | "E2E_PROFILE" | "NODE_ENV_TEST";

/**
 * Check if mock mode is enabled.
 * This is the SINGLE SOURCE OF TRUTH for mock mode.
 */
export function isMockModeEnabled(): boolean {
  return (
    process.env.CI === "true" ||
    process.env.VK_TEST_MODE === "1" ||
    process.env.E2E_PROFILE === "ci" ||
    process.env.NODE_ENV === "test"
  );
}

/**
 * Get the list of triggers that activated mock mode.
 * Useful for debugging and UI display.
 */
export function getMockModeTriggers(): MockModeTrigger[] {
  const triggers: MockModeTrigger[] = [];

  if (process.env.CI === "true") triggers.push("CI");
  if (process.env.VK_TEST_MODE === "1") triggers.push("VK_TEST_MODE");
  if (process.env.E2E_PROFILE === "ci") triggers.push("E2E_PROFILE");
  if (process.env.NODE_ENV === "test") triggers.push("NODE_ENV_TEST");

  return triggers;
}

/**
 * Get human-readable description of why mock mode is active.
 */
export function getMockModeReason(): string | null {
  const triggers = getMockModeTriggers();
  if (triggers.length === 0) return null;

  const descriptions: Record<MockModeTrigger, string> = {
    CI: "CI=true",
    VK_TEST_MODE: "VK_TEST_MODE=1",
    E2E_PROFILE: "E2E_PROFILE=ci",
    NODE_ENV_TEST: "NODE_ENV=test",
  };

  return triggers.map((t) => descriptions[t]).join(", ");
}

/**
 * @deprecated Use isMockModeEnabled() instead.
 * This function is kept for backward compatibility during migration.
 */
export function isTestMode(): boolean {
  return isMockModeEnabled();
}
