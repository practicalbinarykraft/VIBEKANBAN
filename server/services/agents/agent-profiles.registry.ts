/** Agent Profiles Registry (PR-103) - Manages available agent profiles */
import { AgentProfile, isAllowedEnvKey } from "@/types/agent-profile";

/** Predefined agent profiles */
const AGENT_PROFILES: AgentProfile[] = [
  {
    id: "claude-default",
    label: "Claude (Default)",
    kind: "claude",
    env: { FEATURE_REAL_AI: "true" },
  },
  {
    id: "local-default",
    label: "Local Agent",
    kind: "local",
  },
  {
    id: "mock",
    label: "Mock (Testing)",
    kind: "mock",
  },
];

/** Get all available agent profiles */
export function getAgentProfiles(): AgentProfile[] {
  return [...AGENT_PROFILES];
}

/** Get the default agent profile */
export function getDefaultAgentProfile(): AgentProfile {
  return AGENT_PROFILES.find((p) => p.id === "claude-default")!;
}

/** Get agent profile by ID */
export function getAgentProfileById(id: string): AgentProfile | null {
  if (!id) return null;
  return AGENT_PROFILES.find((p) => p.id === id) ?? null;
}

/** Validation result for agent profile */
export interface ValidateAgentProfileResult {
  valid: boolean;
  invalidKeys?: string[];
}

/** Validate agent profile env keys against allowlist */
export function validateAgentProfile(
  profile: Partial<AgentProfile>
): ValidateAgentProfileResult {
  if (!profile.env) {
    return { valid: true };
  }

  const invalidKeys: string[] = [];
  for (const key of Object.keys(profile.env)) {
    if (!isAllowedEnvKey(key)) {
      invalidKeys.push(key);
    }
  }

  if (invalidKeys.length > 0) {
    return { valid: false, invalidKeys };
  }

  return { valid: true };
}
