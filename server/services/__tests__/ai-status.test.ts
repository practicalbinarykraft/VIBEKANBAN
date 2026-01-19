/**
 * Unit tests for AI Status service
 *
 * Tests getAiStatus() function that returns:
 * - realAiEligible: boolean
 * - provider: "anthropic" | "mock" | "db"
 * - model: string
 * - reason?: AiStatusReason (when OFF)
 * - limitUSD?: number (when BUDGET_LIMIT_EXCEEDED)
 * - spendUSD?: number (when BUDGET_LIMIT_EXCEEDED)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock the budget guard
vi.mock("../ai/ai-budget-guard", () => ({
  checkProviderBudget: vi.fn(),
}));

import { checkProviderBudget } from "../ai/ai-budget-guard";
import { getAiStatus, type AiStatusResponse } from "../ai/ai-status";

describe("ai-status", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear relevant env vars
    delete process.env.FEATURE_REAL_AI;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.PLAYWRIGHT;
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";

    // Default mock: budget allowed
    vi.mocked(checkProviderBudget).mockResolvedValue({
      allowed: true,
      provider: "anthropic",
      reason: "no_limit",
    });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("getAiStatus", () => {
    it("returns mock provider when in test mode (PLAYWRIGHT=1)", async () => {
      process.env.PLAYWRIGHT = "1";
      process.env.FEATURE_REAL_AI = "1";
      process.env.ANTHROPIC_API_KEY = "sk-ant-test";

      const status = await getAiStatus();

      expect(status.realAiEligible).toBe(false);
      expect(status.provider).toBe("mock");
      expect(status.reason).toBe("TEST_MODE_FORCED_MOCK");
    });

    it("returns mock provider when in test mode (NODE_ENV=test)", async () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = "test";
      process.env.FEATURE_REAL_AI = "1";
      process.env.ANTHROPIC_API_KEY = "sk-ant-test";

      const status = await getAiStatus();

      expect(status.realAiEligible).toBe(false);
      expect(status.provider).toBe("mock");
      expect(status.reason).toBe("TEST_MODE_FORCED_MOCK");
    });

    it("returns db provider when FEATURE_REAL_AI not set", async () => {
      delete process.env.FEATURE_REAL_AI;

      const status = await getAiStatus();

      expect(status.realAiEligible).toBe(false);
      expect(status.provider).toBe("db");
      expect(status.reason).toBe("FEATURE_REAL_AI_DISABLED");
    });

    it("returns db provider when ANTHROPIC_API_KEY not set", async () => {
      process.env.FEATURE_REAL_AI = "1";
      delete process.env.ANTHROPIC_API_KEY;

      const status = await getAiStatus();

      expect(status.realAiEligible).toBe(false);
      expect(status.provider).toBe("db");
      expect(status.reason).toBe("MISSING_API_KEY");
    });

    it("returns anthropic provider when all conditions met", async () => {
      process.env.FEATURE_REAL_AI = "1";
      process.env.ANTHROPIC_API_KEY = "sk-ant-real-key";

      const status = await getAiStatus();

      expect(status.realAiEligible).toBe(true);
      expect(status.provider).toBe("anthropic");
      expect(status.model).toBe("claude-sonnet-4-20250514");
      expect(status.reason).toBeUndefined();
    });

    it("accepts FEATURE_REAL_AI=true as valid", async () => {
      process.env.FEATURE_REAL_AI = "true";
      process.env.ANTHROPIC_API_KEY = "sk-ant-real-key";

      const status = await getAiStatus();

      expect(status.realAiEligible).toBe(true);
      expect(status.provider).toBe("anthropic");
    });

    it("does not expose API key in response", async () => {
      process.env.FEATURE_REAL_AI = "1";
      process.env.ANTHROPIC_API_KEY = "sk-ant-secret-key";

      const status = await getAiStatus();
      const statusString = JSON.stringify(status);

      expect(statusString).not.toContain("sk-ant");
      expect(statusString).not.toContain("secret");
    });

    it("returns BUDGET_LIMIT_EXCEEDED when over budget", async () => {
      process.env.FEATURE_REAL_AI = "1";
      process.env.ANTHROPIC_API_KEY = "sk-ant-key";

      vi.mocked(checkProviderBudget).mockResolvedValue({
        allowed: false,
        provider: "anthropic",
        reason: "limit_exceeded",
        limitUSD: 10,
        spendUSD: 15.5,
      });

      const status = await getAiStatus();

      expect(status.realAiEligible).toBe(false);
      expect(status.provider).toBe("db");
      expect(status.reason).toBe("BUDGET_LIMIT_EXCEEDED");
      expect(status.limitUSD).toBe(10);
      expect(status.spendUSD).toBe(15.5);
    });

    it("includes budget info only when over limit", async () => {
      process.env.FEATURE_REAL_AI = "1";
      process.env.ANTHROPIC_API_KEY = "sk-ant-key";

      vi.mocked(checkProviderBudget).mockResolvedValue({
        allowed: true,
        provider: "anthropic",
        reason: "within_limit",
      });

      const status = await getAiStatus();

      expect(status.realAiEligible).toBe(true);
      expect(status.limitUSD).toBeUndefined();
      expect(status.spendUSD).toBeUndefined();
    });
  });
});
