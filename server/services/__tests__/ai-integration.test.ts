/**
 * Integration tests for AI Provider
 *
 * Tests:
 * - Demo mode fallback (without real API key)
 * - Settings configuration
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getAICompletion,
  isAIConfigured,
  getAISettings,
  AINotConfiguredError,
} from "../ai/ai-provider";

// Mock the database
vi.mock("@/server/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          get: vi.fn(() => null), // No settings = demo mode
        })),
      })),
    })),
  },
}));

describe("AI Provider Integration", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  describe("Test Mode (PLAYWRIGHT=1)", () => {
    beforeEach(() => {
      process.env.PLAYWRIGHT = "1";
    });

    it("returns demo completion in test mode", async () => {
      const result = await getAICompletion({
        messages: [{ role: "user", content: "Hello" }],
      });

      expect(result.provider).toBe("demo");
      expect(result.model).toBe("mock");
      expect(result.content).toContain("Demo Mode");
    });

    it("isAIConfigured returns true in test mode", async () => {
      const configured = await isAIConfigured();
      expect(configured).toBe(true);
    });
  });

  describe("Demo Mode (VIBE_DEMO_MODE=1)", () => {
    beforeEach(() => {
      process.env.VIBE_DEMO_MODE = "1";
      delete process.env.PLAYWRIGHT;
    });

    it("returns demo completion when demo mode enabled", async () => {
      const result = await getAICompletion({
        messages: [{ role: "user", content: "Test message" }],
      });

      expect(result.provider).toBe("demo");
      expect(result.content).toContain("Demo Mode");
    });
  });

  describe("No Configuration (fallback)", () => {
    beforeEach(() => {
      delete process.env.PLAYWRIGHT;
      delete process.env.VIBE_DEMO_MODE;
      // Set NODE_ENV to something other than 'test' to bypass test mode check
      process.env.NODE_ENV = "development";
    });

    it("getAISettings returns demo provider when no settings", async () => {
      const settings = await getAISettings();
      expect(settings.provider).toBe("demo");
      expect(settings.apiKey).toBeNull();
    });

    it("isAIConfigured returns false when no API key and not in test mode", async () => {
      const configured = await isAIConfigured();
      expect(configured).toBe(false);
    });

    it("getAICompletion returns demo response for demo provider", async () => {
      const result = await getAICompletion({
        messages: [{ role: "user", content: "Hello" }],
      });

      expect(result.provider).toBe("demo");
    });
  });

  describe("Completion Parameters", () => {
    beforeEach(() => {
      process.env.PLAYWRIGHT = "1";
    });

    it("includes last message content in demo response", async () => {
      const testContent = "This is a unique test message";
      const result = await getAICompletion({
        messages: [{ role: "user", content: testContent }],
      });

      expect(result.content).toContain(testContent.substring(0, 50));
    });

    it("handles system prompt parameter", async () => {
      const result = await getAICompletion({
        messages: [{ role: "user", content: "Hello" }],
        systemPrompt: "You are a helpful assistant",
      });

      expect(result.provider).toBe("demo");
    });

    it("handles multiple messages", async () => {
      const result = await getAICompletion({
        messages: [
          { role: "user", content: "First message" },
          { role: "assistant", content: "First response" },
          { role: "user", content: "Second message" },
        ],
      });

      expect(result.provider).toBe("demo");
      expect(result.content).toContain("Second message");
    });
  });

  describe("Usage Tracking", () => {
    beforeEach(() => {
      process.env.PLAYWRIGHT = "1";
    });

    it("returns zero usage for demo mode", async () => {
      const result = await getAICompletion({
        messages: [{ role: "user", content: "Hello" }],
      });

      expect(result.usage).toBeDefined();
      expect(result.usage?.inputTokens).toBe(0);
      expect(result.usage?.outputTokens).toBe(0);
    });
  });
});

describe("AI Provider Error Handling", () => {
  it("AINotConfiguredError has correct properties", () => {
    const error = new AINotConfiguredError("Test error");
    expect(error.name).toBe("AINotConfiguredError");
    expect(error.message).toBe("Test error");
  });

  it("AINotConfiguredError uses default message", () => {
    const error = new AINotConfiguredError();
    expect(error.message).toBe("AI is not configured");
  });
});
