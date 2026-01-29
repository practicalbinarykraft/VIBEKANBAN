/**
 * Unit tests for AI Status service
 *
 * PR-130 NEW CONTRACT:
 * - Mock mode is ONLY triggered by explicit flags: VK_TEST_MODE=1, E2E_PROFILE
 * - NODE_ENV=test and CI do NOT trigger mock mode
 * - This allows unit tests to validate both mock and real AI logic
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

// Mock the BYOK service for DB access
vi.mock("../ai/ai-byok", async (importOriginal) => {
  const original = await importOriginal<typeof import("../ai/ai-byok")>();
  return {
    ...original,
    getByokSettings: vi.fn(),
  };
});

import { checkProviderBudget } from "../ai/ai-budget-guard";
import { getByokSettings } from "../ai/ai-byok";
import { getAiStatus, type AiStatusResponse } from "../ai/ai-status";

describe("ai-status", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear relevant env vars
    delete process.env.FEATURE_REAL_AI;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.PLAYWRIGHT;
    delete process.env.VK_TEST_MODE;
    delete process.env.E2E_PROFILE;
    delete process.env.CI;
    // Set NODE_ENV to development (tests can override)
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";

    // Default mock: budget allowed
    vi.mocked(checkProviderBudget).mockResolvedValue({
      allowed: true,
      provider: "anthropic",
      reason: "no_limit",
    });

    // Default mock: no BYOK settings (tests env vars by default)
    vi.mocked(getByokSettings).mockResolvedValue(null);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("getAiStatus", () => {
    // PR-130: Mock mode only via VK_TEST_MODE, not PLAYWRIGHT alone
    it("returns mock provider when VK_TEST_MODE=1 is set", async () => {
      process.env.VK_TEST_MODE = "1";
      process.env.FEATURE_REAL_AI = "1";
      process.env.ANTHROPIC_API_KEY = "sk-ant-test";

      const status = await getAiStatus();

      expect(status.realAiEligible).toBe(false);
      expect(status.provider).toBe("mock");
      expect(status.reason).toBe("TEST_MODE_FORCED_MOCK");
    });

    // PR-130: Mock mode via E2E_PROFILE=ci
    it("returns mock provider when E2E_PROFILE=ci is set", async () => {
      process.env.E2E_PROFILE = "ci";
      process.env.FEATURE_REAL_AI = "1";
      process.env.ANTHROPIC_API_KEY = "sk-ant-test";

      const status = await getAiStatus();

      expect(status.realAiEligible).toBe(false);
      expect(status.provider).toBe("mock");
      expect(status.reason).toBe("TEST_MODE_FORCED_MOCK");
    });

    // PR-130: PLAYWRIGHT alone does NOT trigger mock
    it("does NOT trigger mock when only PLAYWRIGHT=1 is set", async () => {
      process.env.PLAYWRIGHT = "1";
      process.env.FEATURE_REAL_AI = "1";
      process.env.ANTHROPIC_API_KEY = "sk-ant-test";

      const status = await getAiStatus();

      // Should be real AI, not mock
      expect(status.realAiEligible).toBe(true);
      expect(status.provider).toBe("anthropic");
      expect(status.mode).toBe("real");
    });

    // PR-130: NODE_ENV=test does NOT trigger mock (allows testing real AI branches)
    it("does NOT trigger mock when NODE_ENV=test (allows testing real AI logic)", async () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = "test";
      process.env.FEATURE_REAL_AI = "1";
      process.env.ANTHROPIC_API_KEY = "sk-ant-test";

      const status = await getAiStatus();

      // Should be real AI, not mock - so we can test real AI branches
      expect(status.realAiEligible).toBe(true);
      expect(status.provider).toBe("anthropic");
      expect(status.mode).toBe("real");
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

    it("does not expose full API key in response", async () => {
      process.env.FEATURE_REAL_AI = "1";
      process.env.ANTHROPIC_API_KEY = "sk-ant-api03-secretlongkey123";

      const status = await getAiStatus();
      const statusString = JSON.stringify(status);

      // Full key should not appear
      expect(statusString).not.toContain("sk-ant-api03-secretlongkey123");
      // Middle portion should not appear
      expect(statusString).not.toContain("secretlong");
      // Masked key is ok (shows prefix + last chars)
      expect(status.configuredProviders[0].keyMasked).toContain("****");
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

    // PR-121: Extended status info tests
    describe("configuredProviders (PR-121)", () => {
      it("returns configuredProviders with masked key when Anthropic configured", async () => {
        process.env.FEATURE_REAL_AI = "1";
        process.env.ANTHROPIC_API_KEY = "sk-ant-api03-verylongkeyhere";

        const status = await getAiStatus();

        expect(status.configuredProviders).toBeDefined();
        expect(status.configuredProviders).toHaveLength(1);
        expect(status.configuredProviders![0].provider).toBe("anthropic");
        expect(status.configuredProviders![0].keyPresent).toBe(true);
        // First 6 chars + **** + last 4 chars
        expect(status.configuredProviders![0].keyMasked).toBe("sk-ant****here");
      });

      it("returns empty configuredProviders when no key set", async () => {
        process.env.FEATURE_REAL_AI = "1";
        delete process.env.ANTHROPIC_API_KEY;

        const status = await getAiStatus();

        expect(status.configuredProviders).toEqual([]);
      });

      it("masks short keys correctly", async () => {
        process.env.FEATURE_REAL_AI = "1";
        process.env.ANTHROPIC_API_KEY = "sk-short";

        const status = await getAiStatus();

        expect(status.configuredProviders![0].keyMasked).toBe("sk-****ort");
      });
    });

    describe("mode field (PR-121, PR-130 updated)", () => {
      // PR-130: VK_TEST_MODE triggers forced_mock, not PLAYWRIGHT alone
      it("returns mode=forced_mock when VK_TEST_MODE=1", async () => {
        process.env.VK_TEST_MODE = "1";
        process.env.FEATURE_REAL_AI = "1";
        process.env.ANTHROPIC_API_KEY = "sk-ant-key";

        const status = await getAiStatus();

        expect(status.mode).toBe("forced_mock");
      });

      // PR-130: E2E_PROFILE triggers forced_mock
      it("returns mode=forced_mock when E2E_PROFILE=ci", async () => {
        process.env.E2E_PROFILE = "ci";
        process.env.FEATURE_REAL_AI = "1";
        process.env.ANTHROPIC_API_KEY = "sk-ant-key";

        const status = await getAiStatus();

        expect(status.mode).toBe("forced_mock");
      });

      // PR-130: NODE_ENV=test does NOT trigger forced_mock
      it("returns mode=real when NODE_ENV=test (not a mock trigger)", async () => {
        (process.env as Record<string, string | undefined>).NODE_ENV = "test";
        process.env.FEATURE_REAL_AI = "1";
        process.env.ANTHROPIC_API_KEY = "sk-ant-key";

        const status = await getAiStatus();

        expect(status.mode).toBe("real");
      });

      it("returns mode=real when all configured correctly", async () => {
        process.env.FEATURE_REAL_AI = "1";
        process.env.ANTHROPIC_API_KEY = "sk-ant-key";

        const status = await getAiStatus();

        expect(status.mode).toBe("real");
      });

      it("returns mode=mock when feature disabled", async () => {
        delete process.env.FEATURE_REAL_AI;

        const status = await getAiStatus();

        expect(status.mode).toBe("mock");
      });
    });

    describe("testModeTriggers (PR-121, PR-130 updated)", () => {
      // PR-130: VK_TEST_MODE is a trigger
      it("includes VK_TEST_MODE in triggers when set", async () => {
        process.env.VK_TEST_MODE = "1";

        const status = await getAiStatus();

        expect(status.testModeTriggers).toContain("VK_TEST_MODE");
      });

      // PR-130: E2E_PROFILE is a trigger
      it("includes E2E_PROFILE in triggers when E2E_PROFILE=ci", async () => {
        process.env.E2E_PROFILE = "ci";

        const status = await getAiStatus();

        expect(status.testModeTriggers).toContain("E2E_PROFILE");
      });

      // PR-130: PLAYWRIGHT is NOT a trigger
      it("does NOT include PLAYWRIGHT in triggers (not a mock trigger)", async () => {
        process.env.PLAYWRIGHT = "1";

        const status = await getAiStatus();

        expect(status.testModeTriggers).not.toContain("PLAYWRIGHT");
        expect(status.testModeTriggers).not.toContain("PLAYWRIGHT=1");
      });

      // PR-130: NODE_ENV=test is NOT a trigger
      it("does NOT include NODE_ENV in triggers (not a mock trigger)", async () => {
        (process.env as Record<string, string | undefined>).NODE_ENV = "test";

        const status = await getAiStatus();

        expect(status.testModeTriggers).not.toContain("NODE_ENV");
        expect(status.testModeTriggers).not.toContain("NODE_ENV=test");
        expect(status.testModeTriggers).not.toContain("NODE_ENV_TEST");
      });

      it("returns empty triggers when not in mock mode", async () => {
        process.env.FEATURE_REAL_AI = "1";
        process.env.ANTHROPIC_API_KEY = "sk-ant-key";

        const status = await getAiStatus();

        expect(status.testModeTriggers).toEqual([]);
      });
    });

    // PR-122: BYOK (Bring Your Own Key) - keys from DB, not env
    describe("BYOK - keys from database (PR-122)", () => {
      beforeEach(() => {
        // Clear env keys to test BYOK only
        delete process.env.ANTHROPIC_API_KEY;
        delete process.env.OPENAI_API_KEY;
        process.env.FEATURE_REAL_AI = "1";
      });

      it("returns mode=real when BYOK key exists in DB settings", async () => {
        vi.mocked(getByokSettings).mockResolvedValue({
          provider: "anthropic",
          anthropicApiKey: "sk-ant-byok-key-from-db",
          openaiApiKey: null,
          model: "claude-sonnet-4-20250514",
        });

        const status = await getAiStatus();

        expect(status.realAiEligible).toBe(true);
        expect(status.mode).toBe("real");
        expect(status.provider).toBe("anthropic");
      });

      it("returns MISSING_API_KEY when no BYOK key in DB", async () => {
        vi.mocked(getByokSettings).mockResolvedValue({
          provider: "anthropic",
          anthropicApiKey: null,
          openaiApiKey: null,
          model: "claude-sonnet-4-20250514",
        });

        const status = await getAiStatus();

        expect(status.realAiEligible).toBe(false);
        expect(status.reason).toBe("MISSING_API_KEY");
        expect(status.mode).toBe("mock");
      });

      it("configuredProviders includes BYOK keys from DB with masked value", async () => {
        vi.mocked(getByokSettings).mockResolvedValue({
          provider: "anthropic",
          anthropicApiKey: "sk-ant-api03-byokkeyvalue",
          openaiApiKey: null,
          model: "claude-sonnet-4-20250514",
        });

        const status = await getAiStatus();

        expect(status.configuredProviders).toHaveLength(1);
        expect(status.configuredProviders[0].provider).toBe("anthropic");
        expect(status.configuredProviders[0].keyPresent).toBe(true);
        expect(status.configuredProviders[0].keyMasked).toBe("sk-ant****alue");
      });

      it("includes both providers when both BYOK keys exist in DB", async () => {
        vi.mocked(getByokSettings).mockResolvedValue({
          provider: "anthropic",
          anthropicApiKey: "sk-ant-byok-anthropic",
          openaiApiKey: "sk-openai-byok-key",
          model: "claude-sonnet-4-20250514",
        });

        const status = await getAiStatus();

        expect(status.configuredProviders).toHaveLength(2);
        expect(status.configuredProviders.map(p => p.provider)).toContain("anthropic");
        expect(status.configuredProviders.map(p => p.provider)).toContain("openai");
      });

      it("does NOT show provider without BYOK key (OpenAI not configured)", async () => {
        vi.mocked(getByokSettings).mockResolvedValue({
          provider: "anthropic",
          anthropicApiKey: "sk-ant-only-this",
          openaiApiKey: null,
          model: "claude-sonnet-4-20250514",
        });

        const status = await getAiStatus();

        expect(status.configuredProviders).toHaveLength(1);
        expect(status.configuredProviders[0].provider).toBe("anthropic");
        // OpenAI should NOT appear
        expect(status.configuredProviders.map(p => p.provider)).not.toContain("openai");
      });

      it("uses DB key over env key when both exist (BYOK priority)", async () => {
        // Set env key (lower priority)
        process.env.ANTHROPIC_API_KEY = "sk-ant-from-env";

        // DB has different key (higher priority)
        vi.mocked(getByokSettings).mockResolvedValue({
          provider: "anthropic",
          anthropicApiKey: "sk-ant-from-byok-db",
          openaiApiKey: null,
          model: "claude-sonnet-4-20250514",
        });

        const status = await getAiStatus();

        // Should show BYOK key, not env key
        expect(status.configuredProviders[0].keyMasked).toBe("sk-ant****k-db");
      });

      it("falls back to env key when no DB settings exist", async () => {
        process.env.ANTHROPIC_API_KEY = "sk-ant-env-fallback";

        // No DB settings
        vi.mocked(getByokSettings).mockResolvedValue(null);

        const status = await getAiStatus();

        expect(status.realAiEligible).toBe(true);
        expect(status.configuredProviders[0].keyMasked).toBe("sk-ant****back");
      });

      it("returns correct model from DB settings", async () => {
        vi.mocked(getByokSettings).mockResolvedValue({
          provider: "anthropic",
          anthropicApiKey: "sk-ant-key",
          openaiApiKey: null,
          model: "claude-opus-4-20250514",
        });

        const status = await getAiStatus();

        expect(status.model).toBe("claude-opus-4-20250514");
      });
    });
  });
});
