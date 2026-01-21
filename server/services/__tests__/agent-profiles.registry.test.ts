/** Agent Profiles Registry Tests (PR-103) - TDD */
import { describe, it, expect } from "vitest";
import {
  getAgentProfiles,
  getDefaultAgentProfile,
  getAgentProfileById,
  validateAgentProfile,
} from "../agents/agent-profiles.registry";

describe("agent-profiles.registry", () => {
  describe("getAgentProfiles", () => {
    it("returns array of profiles", () => {
      const profiles = getAgentProfiles();
      expect(Array.isArray(profiles)).toBe(true);
      expect(profiles.length).toBeGreaterThan(0);
    });

    it("includes claude-default profile", () => {
      const profiles = getAgentProfiles();
      const claude = profiles.find((p) => p.id === "claude-default");
      expect(claude).toBeDefined();
      expect(claude?.kind).toBe("claude");
    });

    it("includes local-default profile", () => {
      const profiles = getAgentProfiles();
      const local = profiles.find((p) => p.id === "local-default");
      expect(local).toBeDefined();
      expect(local?.kind).toBe("local");
    });

    it("includes mock profile", () => {
      const profiles = getAgentProfiles();
      const mock = profiles.find((p) => p.id === "mock");
      expect(mock).toBeDefined();
      expect(mock?.kind).toBe("mock");
    });
  });

  describe("getDefaultAgentProfile", () => {
    it("returns a profile", () => {
      const profile = getDefaultAgentProfile();
      expect(profile).toBeDefined();
      expect(profile.id).toBeDefined();
      expect(profile.kind).toBeDefined();
    });

    it("returns claude-default as default", () => {
      const profile = getDefaultAgentProfile();
      expect(profile.id).toBe("claude-default");
    });
  });

  describe("getAgentProfileById", () => {
    it("returns profile for valid id", () => {
      const profile = getAgentProfileById("claude-default");
      expect(profile).not.toBeNull();
      expect(profile?.id).toBe("claude-default");
    });

    it("returns null for unknown id", () => {
      const profile = getAgentProfileById("unknown-profile");
      expect(profile).toBeNull();
    });

    it("returns null for empty id", () => {
      const profile = getAgentProfileById("");
      expect(profile).toBeNull();
    });
  });

  describe("validateAgentProfile", () => {
    it("returns true for valid profile without env", () => {
      const result = validateAgentProfile({
        id: "test",
        label: "Test",
        kind: "mock",
      });
      expect(result.valid).toBe(true);
    });

    it("returns true for profile with allowed env keys", () => {
      const result = validateAgentProfile({
        id: "test",
        label: "Test",
        kind: "claude",
        env: { FEATURE_REAL_AI: "true", ANTHROPIC_MODEL: "claude-3" },
      });
      expect(result.valid).toBe(true);
    });

    it("returns false for profile with disallowed env keys", () => {
      const result = validateAgentProfile({
        id: "test",
        label: "Test",
        kind: "claude",
        env: { ANTHROPIC_API_KEY: "secret" },
      });
      expect(result.valid).toBe(false);
      expect(result.invalidKeys).toContain("ANTHROPIC_API_KEY");
    });

    it("allows VIBE_ prefixed keys", () => {
      const result = validateAgentProfile({
        id: "test",
        label: "Test",
        kind: "local",
        env: { VIBE_CUSTOM_SETTING: "value" },
      });
      expect(result.valid).toBe(true);
    });

    it("rejects NEXT_PUBLIC_ prefixed keys", () => {
      const result = validateAgentProfile({
        id: "test",
        label: "Test",
        kind: "local",
        env: { NEXT_PUBLIC_API_URL: "http://..." },
      });
      expect(result.valid).toBe(false);
    });
  });
});
