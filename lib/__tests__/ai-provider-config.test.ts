/**
 * AI Provider Config Tests
 *
 * PR-130 NEW CONTRACT:
 * - Mock mode (demo) is ONLY triggered by:
 *   - VIBE_DEMO_MODE=1
 *   - VK_TEST_MODE=1
 *   - E2E_PROFILE=ci or E2E_PROFILE=local
 * - PLAYWRIGHT=1 alone does NOT trigger demo mode
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  detectAiMode,
  AiMode,
  AiProviderConfig,
} from "../ai-provider-config";

describe("ai-provider-config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env.VIBE_DEMO_MODE;
    delete process.env.PLAYWRIGHT;
    delete process.env.VK_TEST_MODE;
    delete process.env.E2E_PROFILE;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("detectAiMode", () => {
    it("returns DEMO when VIBE_DEMO_MODE=1", () => {
      process.env.VIBE_DEMO_MODE = "1";
      const result = detectAiMode();
      expect(result.mode).toBe<AiMode>("demo");
      expect(result.reason).toContain("VIBE_DEMO_MODE");
    });

    // PR-130: PLAYWRIGHT alone does NOT trigger demo mode
    it("returns DISABLED when only PLAYWRIGHT=1 (not a mock trigger)", () => {
      process.env.PLAYWRIGHT = "1";
      const result = detectAiMode();
      // PLAYWRIGHT alone doesn't trigger demo, and no keys = disabled
      expect(result.mode).toBe<AiMode>("disabled");
    });

    // PR-130: VK_TEST_MODE is an explicit mock trigger
    it("returns DEMO when VK_TEST_MODE=1", () => {
      process.env.VK_TEST_MODE = "1";
      const result = detectAiMode();
      expect(result.mode).toBe<AiMode>("demo");
      expect(result.reason).toContain("VK_TEST_MODE");
    });

    // PR-130: E2E_PROFILE is an explicit mock trigger
    it("returns DEMO when E2E_PROFILE=ci", () => {
      process.env.E2E_PROFILE = "ci";
      const result = detectAiMode();
      expect(result.mode).toBe<AiMode>("demo");
      expect(result.reason).toContain("E2E_PROFILE");
    });

    it("returns DISABLED when no keys and not demo", () => {
      const result = detectAiMode();
      expect(result.mode).toBe<AiMode>("disabled");
      expect(result.reason).toContain("No API keys");
    });

    it("returns REAL with anthropic when ANTHROPIC_API_KEY set", () => {
      process.env.ANTHROPIC_API_KEY = "sk-ant-test";
      const result = detectAiMode();
      expect(result.mode).toBe<AiMode>("real");
      expect(result.primaryProvider).toBe("anthropic");
      expect(result.availableProviders).toContain("anthropic");
    });

    it("returns REAL with openai when OPENAI_API_KEY set", () => {
      process.env.OPENAI_API_KEY = "sk-test";
      const result = detectAiMode();
      expect(result.mode).toBe<AiMode>("real");
      expect(result.primaryProvider).toBe("openai");
      expect(result.availableProviders).toContain("openai");
    });

    it("returns REAL with anthropic primary when both keys set", () => {
      process.env.ANTHROPIC_API_KEY = "sk-ant-test";
      process.env.OPENAI_API_KEY = "sk-test";
      const result = detectAiMode();
      expect(result.mode).toBe<AiMode>("real");
      expect(result.primaryProvider).toBe("anthropic");
      expect(result.availableProviders).toContain("anthropic");
      expect(result.availableProviders).toContain("openai");
    });

    it("DEMO mode overrides even when keys exist", () => {
      process.env.VIBE_DEMO_MODE = "1";
      process.env.ANTHROPIC_API_KEY = "sk-ant-test";
      const result = detectAiMode();
      expect(result.mode).toBe<AiMode>("demo");
    });

    // PR-130: PLAYWRIGHT alone does NOT override real mode
    it("PLAYWRIGHT=1 does NOT override when keys exist", () => {
      process.env.PLAYWRIGHT = "1";
      process.env.ANTHROPIC_API_KEY = "sk-ant-test";
      const result = detectAiMode();
      // PLAYWRIGHT alone is not a mock trigger, so should be real
      expect(result.mode).toBe<AiMode>("real");
    });

    // PR-130: VK_TEST_MODE overrides real mode
    it("VK_TEST_MODE=1 overrides even when keys exist", () => {
      process.env.VK_TEST_MODE = "1";
      process.env.ANTHROPIC_API_KEY = "sk-ant-test";
      const result = detectAiMode();
      expect(result.mode).toBe<AiMode>("demo");
    });
  });

  describe("display properties", () => {
    it("VIBE_DEMO_MODE has correct banner text", () => {
      process.env.VIBE_DEMO_MODE = "1";
      const result = detectAiMode();
      expect(result.bannerText).toContain("Mock mode");
      expect(result.bannerText).toContain("VIBE_DEMO_MODE");
      expect(result.bannerVariant).toBe("warning");
    });

    it("VK_TEST_MODE has correct banner text", () => {
      process.env.VK_TEST_MODE = "1";
      const result = detectAiMode();
      expect(result.bannerText).toContain("Mock mode");
      expect(result.bannerText).toContain("VK_TEST_MODE");
      expect(result.bannerVariant).toBe("warning");
    });

    it("DISABLED mode has correct banner text", () => {
      const result = detectAiMode();
      expect(result.bannerText).toContain("AI disabled");
      expect(result.bannerText).toContain("configure API keys");
      expect(result.bannerVariant).toBe("destructive");
    });

    it("REAL mode shows provider info", () => {
      process.env.ANTHROPIC_API_KEY = "sk-ant-test";
      const result = detectAiMode();
      expect(result.bannerText).toContain("Real AI");
      expect(result.bannerText).toContain("Anthropic");
      expect(result.bannerVariant).toBe("default");
    });

    it("REAL mode with both providers shows both", () => {
      process.env.ANTHROPIC_API_KEY = "sk-ant-test";
      process.env.OPENAI_API_KEY = "sk-test";
      const result = detectAiMode();
      expect(result.bannerText).toContain("Anthropic");
      expect(result.bannerText).toContain("OpenAI");
    });
  });

  describe("canRunAi flag", () => {
    it("DEMO allows AI", () => {
      process.env.VIBE_DEMO_MODE = "1";
      const result = detectAiMode();
      expect(result.canRunAi).toBe(true);
    });

    it("REAL allows AI", () => {
      process.env.ANTHROPIC_API_KEY = "sk-ant-test";
      const result = detectAiMode();
      expect(result.canRunAi).toBe(true);
    });

    it("DISABLED blocks AI", () => {
      const result = detectAiMode();
      expect(result.canRunAi).toBe(false);
    });
  });
});
