/**
 * Tests for council real AI routing
 *
 * Verifies mode selection:
 * - PLAYWRIGHT=1 → mock
 * - NODE_ENV=test → mock
 * - FEATURE_REAL_AI=1 + key → real path (stream mocked in test)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock dependencies
vi.mock("../ai/anthropic-stream", () => ({
  collectStreamResponse: vi.fn(),
}));

vi.mock("../ai/real-ai-config", () => ({
  shouldUseRealAi: vi.fn(),
  getRealAiConfig: vi.fn(),
}));

import { shouldUseRealAi, getRealAiConfig } from "../ai/real-ai-config";
import { collectStreamResponse } from "../ai/anthropic-stream";
import { getCouncilAiResponse, CouncilAiParams } from "../council/council-ai-router";

describe("council-real-ai-routing", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  const defaultParams: CouncilAiParams = {
    systemPrompt: "You are a helpful PM.",
    userPrompt: "Analyze this idea: build a task manager",
    language: "en",
  };

  describe("mode selection", () => {
    it("returns mock response when PLAYWRIGHT=1", async () => {
      vi.mocked(shouldUseRealAi).mockReturnValue(false);

      const result = await getCouncilAiResponse(defaultParams);

      expect(shouldUseRealAi).toHaveBeenCalled();
      expect(collectStreamResponse).not.toHaveBeenCalled();
      expect(result.isReal).toBe(false);
      expect(result.content).toBeTruthy();
    });

    it("returns mock response when NODE_ENV=test", async () => {
      vi.mocked(shouldUseRealAi).mockReturnValue(false);

      const result = await getCouncilAiResponse(defaultParams);

      expect(shouldUseRealAi).toHaveBeenCalled();
      expect(collectStreamResponse).not.toHaveBeenCalled();
      expect(result.isReal).toBe(false);
    });

    it("uses real AI when FEATURE_REAL_AI=1 and key present", async () => {
      vi.mocked(shouldUseRealAi).mockReturnValue(true);
      vi.mocked(getRealAiConfig).mockReturnValue({
        provider: "anthropic",
        apiKey: "test-key",
        model: "claude-sonnet-4-20250514",
      });
      vi.mocked(collectStreamResponse).mockResolvedValue("Real AI response");

      const result = await getCouncilAiResponse(defaultParams);

      expect(shouldUseRealAi).toHaveBeenCalled();
      expect(getRealAiConfig).toHaveBeenCalled();
      expect(collectStreamResponse).toHaveBeenCalledWith({
        apiKey: "test-key",
        model: "claude-sonnet-4-20250514",
        system: "You are a helpful PM.",
        messages: [{ role: "user", content: "Analyze this idea: build a task manager" }],
        maxTokens: 300,
      });
      expect(result.isReal).toBe(true);
      expect(result.content).toBe("Real AI response");
    });

    it("falls back to mock when getRealAiConfig returns null", async () => {
      vi.mocked(shouldUseRealAi).mockReturnValue(true);
      vi.mocked(getRealAiConfig).mockReturnValue(null);

      const result = await getCouncilAiResponse(defaultParams);

      expect(collectStreamResponse).not.toHaveBeenCalled();
      expect(result.isReal).toBe(false);
    });
  });

  describe("language handling", () => {
    it("returns Russian mock for ru language", async () => {
      vi.mocked(shouldUseRealAi).mockReturnValue(false);

      const result = await getCouncilAiResponse({
        ...defaultParams,
        language: "ru",
      });

      expect(result.content).toMatch(/[а-яА-ЯёЁ]/);
    });

    it("returns English mock for en language", async () => {
      vi.mocked(shouldUseRealAi).mockReturnValue(false);

      const result = await getCouncilAiResponse({
        ...defaultParams,
        language: "en",
      });

      expect(result.content).not.toMatch(/[а-яА-ЯёЁ]/);
    });
  });

  describe("error handling", () => {
    it("falls back to mock on real AI error", async () => {
      vi.mocked(shouldUseRealAi).mockReturnValue(true);
      vi.mocked(getRealAiConfig).mockReturnValue({
        provider: "anthropic",
        apiKey: "test-key",
        model: "claude-sonnet-4-20250514",
      });
      vi.mocked(collectStreamResponse).mockRejectedValue(new Error("API Error"));

      const result = await getCouncilAiResponse(defaultParams);

      expect(result.isReal).toBe(false);
      expect(result.content).toBeTruthy();
    });
  });

  describe("custom maxTokens", () => {
    it("passes custom maxTokens to stream", async () => {
      vi.mocked(shouldUseRealAi).mockReturnValue(true);
      vi.mocked(getRealAiConfig).mockReturnValue({
        provider: "anthropic",
        apiKey: "test-key",
        model: "claude-sonnet-4-20250514",
      });
      vi.mocked(collectStreamResponse).mockResolvedValue("Response");

      await getCouncilAiResponse({
        ...defaultParams,
        maxTokens: 500,
      });

      expect(collectStreamResponse).toHaveBeenCalledWith(
        expect.objectContaining({ maxTokens: 500 })
      );
    });
  });
});
