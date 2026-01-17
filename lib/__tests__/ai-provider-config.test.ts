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

    it("returns DEMO when PLAYWRIGHT=1", () => {
      process.env.PLAYWRIGHT = "1";
      const result = detectAiMode();
      expect(result.mode).toBe<AiMode>("demo");
      expect(result.reason).toContain("PLAYWRIGHT");
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

    it("PLAYWRIGHT=1 overrides even when keys exist", () => {
      process.env.PLAYWRIGHT = "1";
      process.env.ANTHROPIC_API_KEY = "sk-ant-test";
      const result = detectAiMode();
      expect(result.mode).toBe<AiMode>("demo");
    });
  });

  describe("display properties", () => {
    it("DEMO mode has correct banner text", () => {
      process.env.VIBE_DEMO_MODE = "1";
      const result = detectAiMode();
      expect(result.bannerText).toBe("Demo mode: responses are simulated");
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
