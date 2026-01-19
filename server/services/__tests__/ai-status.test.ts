/**
 * Unit tests for AI Status service
 *
 * Tests getAiStatus() function that returns:
 * - realAiEligible: boolean
 * - provider: "anthropic" | "mock" | "db"
 * - model: string
 * - reason?: string (when OFF)
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getAiStatus, type AiStatusResponse } from "../ai/ai-status";

describe("ai-status", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clear relevant env vars
    delete process.env.FEATURE_REAL_AI;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.PLAYWRIGHT;
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("getAiStatus", () => {
    it("returns mock provider when in test mode (PLAYWRIGHT=1)", () => {
      process.env.PLAYWRIGHT = "1";
      process.env.FEATURE_REAL_AI = "1";
      process.env.ANTHROPIC_API_KEY = "sk-ant-test";

      const status = getAiStatus();

      expect(status.realAiEligible).toBe(false);
      expect(status.provider).toBe("mock");
      expect(status.reason).toBe("Test mode active (PLAYWRIGHT=1)");
    });

    it("returns mock provider when in test mode (NODE_ENV=test)", () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = "test";
      process.env.FEATURE_REAL_AI = "1";
      process.env.ANTHROPIC_API_KEY = "sk-ant-test";

      const status = getAiStatus();

      expect(status.realAiEligible).toBe(false);
      expect(status.provider).toBe("mock");
      expect(status.reason).toBe("Test mode active (NODE_ENV=test)");
    });

    it("returns db provider when FEATURE_REAL_AI not set", () => {
      delete process.env.FEATURE_REAL_AI;

      const status = getAiStatus();

      expect(status.realAiEligible).toBe(false);
      expect(status.provider).toBe("db");
      expect(status.reason).toBe("FEATURE_REAL_AI flag not enabled");
    });

    it("returns db provider when ANTHROPIC_API_KEY not set", () => {
      process.env.FEATURE_REAL_AI = "1";
      delete process.env.ANTHROPIC_API_KEY;

      const status = getAiStatus();

      expect(status.realAiEligible).toBe(false);
      expect(status.provider).toBe("db");
      expect(status.reason).toBe("ANTHROPIC_API_KEY not configured");
    });

    it("returns anthropic provider when all conditions met", () => {
      process.env.FEATURE_REAL_AI = "1";
      process.env.ANTHROPIC_API_KEY = "sk-ant-real-key";

      const status = getAiStatus();

      expect(status.realAiEligible).toBe(true);
      expect(status.provider).toBe("anthropic");
      expect(status.model).toBe("claude-sonnet-4-20250514");
      expect(status.reason).toBeUndefined();
    });

    it("accepts FEATURE_REAL_AI=true as valid", () => {
      process.env.FEATURE_REAL_AI = "true";
      process.env.ANTHROPIC_API_KEY = "sk-ant-real-key";

      const status = getAiStatus();

      expect(status.realAiEligible).toBe(true);
      expect(status.provider).toBe("anthropic");
    });

    it("does not expose API key in response", () => {
      process.env.FEATURE_REAL_AI = "1";
      process.env.ANTHROPIC_API_KEY = "sk-ant-secret-key";

      const status = getAiStatus();
      const statusString = JSON.stringify(status);

      expect(statusString).not.toContain("sk-ant");
      expect(statusString).not.toContain("secret");
    });
  });
});
