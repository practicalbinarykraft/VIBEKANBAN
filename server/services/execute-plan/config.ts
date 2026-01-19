/**
 * Execute Plan Configuration
 */

import type { ExecutionMode } from "./types";

/**
 * Determine execution mode from environment
 */
export function getExecutionMode(): ExecutionMode {
  if (process.env.EXECUTION_MODE === "mock") return "mock";
  if (process.env.EXECUTION_MODE === "real") return "real";
  if (process.env.PLAYWRIGHT === "1") return "mock";
  if (process.env.NODE_ENV === "test") return "mock";
  return "real";
}

/**
 * Check if feature flag is enabled
 */
export function isExecutePlanV2Enabled(): boolean {
  return process.env.FEATURE_EXECUTE_PLAN_V2 === "1";
}

/**
 * Generate stable key for task deduplication
 * Pattern: [plan:{planId}:idx:{index}]
 */
export function getStableKey(planId: string, index: number): string {
  return `[plan:${planId}:idx:${index}]`;
}
