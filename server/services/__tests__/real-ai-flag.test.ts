/**
 * Tests for FEATURE_REAL_AI flag integration
 *
 * PR-130 NEW CONTRACT:
 * - Mock mode is ONLY triggered by explicit flags: VK_TEST_MODE=1, E2E_PROFILE
 * - PLAYWRIGHT=1 alone does NOT trigger mock mode
 * - NODE_ENV=test does NOT trigger mock mode (allows unit testing real AI branches)
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { shouldUseRealAi, getRealAiConfig } from "../ai/real-ai-config";

describe("real-ai-config", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset env vars
    delete (process.env as Record<string, string | undefined>).FEATURE_REAL_AI;
    delete (process.env as Record<string, string | undefined>).ANTHROPIC_API_KEY;
    delete (process.env as Record<string, string | undefined>).PLAYWRIGHT;
    delete (process.env as Record<string, string | undefined>).VK_TEST_MODE;
    delete (process.env as Record<string, string | undefined>).E2E_PROFILE;
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
  });

  afterEach(() => {
    // Restore env vars
    process.env = { ...originalEnv };
  });

  describe("shouldUseRealAi", () => {
    it("returns false when FEATURE_REAL_AI not set", () => {
      process.env.ANTHROPIC_API_KEY = "sk-ant-test";
      expect(shouldUseRealAi()).toBe(false);
    });

    it("returns false when ANTHROPIC_API_KEY not set", () => {
      process.env.FEATURE_REAL_AI = "1";
      expect(shouldUseRealAi()).toBe(false);
    });

    it("returns true when both FEATURE_REAL_AI=1 and ANTHROPIC_API_KEY set", () => {
      process.env.FEATURE_REAL_AI = "1";
      process.env.ANTHROPIC_API_KEY = "sk-ant-test";
      expect(shouldUseRealAi()).toBe(true);
    });

    // PR-130: PLAYWRIGHT alone does NOT trigger mock mode
    it("returns true when PLAYWRIGHT=1 (PLAYWRIGHT alone is not a mock trigger)", () => {
      process.env.FEATURE_REAL_AI = "1";
      process.env.ANTHROPIC_API_KEY = "sk-ant-test";
      process.env.PLAYWRIGHT = "1";
      expect(shouldUseRealAi()).toBe(true);
    });

    // PR-130: NODE_ENV=test does NOT trigger mock mode
    it("returns true when NODE_ENV=test (NODE_ENV is not a mock trigger)", () => {
      process.env.FEATURE_REAL_AI = "1";
      process.env.ANTHROPIC_API_KEY = "sk-ant-test";
      (process.env as Record<string, string | undefined>).NODE_ENV = "test";
      expect(shouldUseRealAi()).toBe(true);
    });

    // PR-130: VK_TEST_MODE is an explicit mock trigger
    it("returns false when VK_TEST_MODE=1 (overrides FEATURE_REAL_AI)", () => {
      process.env.FEATURE_REAL_AI = "1";
      process.env.ANTHROPIC_API_KEY = "sk-ant-test";
      process.env.VK_TEST_MODE = "1";
      expect(shouldUseRealAi()).toBe(false);
    });

    // PR-130: E2E_PROFILE is an explicit mock trigger
    it("returns false when E2E_PROFILE=ci (overrides FEATURE_REAL_AI)", () => {
      process.env.FEATURE_REAL_AI = "1";
      process.env.ANTHROPIC_API_KEY = "sk-ant-test";
      process.env.E2E_PROFILE = "ci";
      expect(shouldUseRealAi()).toBe(false);
    });
  });

  describe("getRealAiConfig", () => {
    it("returns null when shouldUseRealAi is false", () => {
      expect(getRealAiConfig()).toBeNull();
    });

    it("returns anthropic config when FEATURE_REAL_AI=1 and key set", () => {
      process.env.FEATURE_REAL_AI = "1";
      process.env.ANTHROPIC_API_KEY = "sk-ant-test-key";
      const config = getRealAiConfig();
      expect(config).not.toBeNull();
      expect(config?.provider).toBe("anthropic");
      expect(config?.apiKey).toBe("sk-ant-test-key");
      expect(config?.model).toBe("claude-sonnet-4-20250514");
    });

    // PR-130: PLAYWRIGHT alone does NOT block real AI config
    it("returns config when PLAYWRIGHT=1 (PLAYWRIGHT alone is not a mock trigger)", () => {
      process.env.FEATURE_REAL_AI = "1";
      process.env.ANTHROPIC_API_KEY = "sk-ant-test";
      process.env.PLAYWRIGHT = "1";
      expect(getRealAiConfig()).not.toBeNull();
    });

    // PR-130: VK_TEST_MODE blocks real AI config
    it("returns null when VK_TEST_MODE=1 even with keys", () => {
      process.env.FEATURE_REAL_AI = "1";
      process.env.ANTHROPIC_API_KEY = "sk-ant-test";
      process.env.VK_TEST_MODE = "1";
      expect(getRealAiConfig()).toBeNull();
    });
  });
});
