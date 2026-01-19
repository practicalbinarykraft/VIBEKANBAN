/**
 * Tests for FEATURE_REAL_AI flag integration
 *
 * FEATURE_REAL_AI=1 + ANTHROPIC_API_KEY should enable real AI
 * PLAYWRIGHT=1 should always use mocks (override FEATURE_REAL_AI)
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
      // Set NODE_ENV to development to avoid test mode
      (process.env as Record<string, string | undefined>).NODE_ENV = "development";
      process.env.FEATURE_REAL_AI = "1";
      process.env.ANTHROPIC_API_KEY = "sk-ant-test";
      expect(shouldUseRealAi()).toBe(true);
    });

    it("returns false when PLAYWRIGHT=1 (overrides FEATURE_REAL_AI)", () => {
      process.env.FEATURE_REAL_AI = "1";
      process.env.ANTHROPIC_API_KEY = "sk-ant-test";
      process.env.PLAYWRIGHT = "1";
      expect(shouldUseRealAi()).toBe(false);
    });

    it("returns false when NODE_ENV=test (overrides FEATURE_REAL_AI)", () => {
      process.env.FEATURE_REAL_AI = "1";
      process.env.ANTHROPIC_API_KEY = "sk-ant-test";
      (process.env as Record<string, string | undefined>).NODE_ENV = "test";
      expect(shouldUseRealAi()).toBe(false);
    });
  });

  describe("getRealAiConfig", () => {
    it("returns null when shouldUseRealAi is false", () => {
      expect(getRealAiConfig()).toBeNull();
    });

    it("returns anthropic config when FEATURE_REAL_AI=1 and key set", () => {
      // Set NODE_ENV to development to avoid test mode
      (process.env as Record<string, string | undefined>).NODE_ENV = "development";
      process.env.FEATURE_REAL_AI = "1";
      process.env.ANTHROPIC_API_KEY = "sk-ant-test-key";
      const config = getRealAiConfig();
      expect(config).not.toBeNull();
      expect(config?.provider).toBe("anthropic");
      expect(config?.apiKey).toBe("sk-ant-test-key");
      expect(config?.model).toBe("claude-sonnet-4-20250514");
    });

    it("returns null when PLAYWRIGHT=1 even with keys", () => {
      process.env.FEATURE_REAL_AI = "1";
      process.env.ANTHROPIC_API_KEY = "sk-ant-test";
      process.env.PLAYWRIGHT = "1";
      expect(getRealAiConfig()).toBeNull();
    });
  });
});
