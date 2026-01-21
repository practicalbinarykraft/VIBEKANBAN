/** Agent Profile Types (PR-103) - Runner configuration for factory tasks */

export type AgentRunnerKind = "claude" | "local" | "mock";

export interface AgentProfile {
  id: string;
  label: string;
  kind: AgentRunnerKind;
  env?: Record<string, string>;
}

/** Allowed env keys for agent profiles (security allowlist) */
export const ALLOWED_ENV_KEYS = [
  "FEATURE_REAL_AI",
  "ANTHROPIC_MODEL",
  "OPENAI_MODEL",
] as const;

/** Check if env key is in allowlist */
export function isAllowedEnvKey(key: string): boolean {
  if (ALLOWED_ENV_KEYS.includes(key as typeof ALLOWED_ENV_KEYS[number])) {
    return true;
  }
  // Allow VIBE_* keys (but not NEXT_PUBLIC_*)
  if (key.startsWith("VIBE_") && !key.startsWith("NEXT_PUBLIC_")) {
    return true;
  }
  return false;
}

/** Filter env object to only allowed keys */
export function filterAllowedEnv(env: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (isAllowedEnvKey(key)) {
      result[key] = value;
    }
  }
  return result;
}
