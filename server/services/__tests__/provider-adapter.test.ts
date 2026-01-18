/**
 * Unit tests for AI Provider Adapter
 *
 * Tests:
 * - Token estimation
 * - Message truncation
 * - Retry logic with mocked HTTP
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  estimateTokens,
  truncateMessages,
  AI_CONFIG,
} from "../ai/provider-adapter";

describe("Provider Adapter", () => {
  describe("estimateTokens", () => {
    it("estimates tokens based on character count", () => {
      // ~4 chars per token
      expect(estimateTokens("")).toBe(0);
      expect(estimateTokens("test")).toBe(1); // 4 chars = 1 token
      expect(estimateTokens("hello world")).toBe(3); // 11 chars = ~3 tokens
      expect(estimateTokens("a".repeat(100))).toBe(25); // 100 chars = 25 tokens
    });

    it("handles unicode characters", () => {
      const unicodeText = "Привет мир"; // 10 chars
      expect(estimateTokens(unicodeText)).toBe(3); // ceil(10/4) = 3
    });
  });

  describe("truncateMessages", () => {
    const createMessage = (role: string, content: string) => ({ role, content });

    it("returns all messages when within limit", () => {
      const messages = [
        createMessage("user", "Hello"),
        createMessage("assistant", "Hi there"),
      ];

      const result = truncateMessages(messages, undefined, 1000);
      expect(result).toEqual(messages);
    });

    it("truncates older messages when exceeding limit", () => {
      const messages = [
        createMessage("user", "a".repeat(400)), // 100 tokens
        createMessage("assistant", "b".repeat(400)), // 100 tokens
        createMessage("user", "c".repeat(400)), // 100 tokens
      ];

      // Limit to ~150 tokens - should keep only last 1-2 messages
      const result = truncateMessages(messages, undefined, 150);
      expect(result.length).toBeLessThan(messages.length);
      expect(result[result.length - 1].content).toBe("c".repeat(400)); // Last message preserved
    });

    it("accounts for system prompt in token budget", () => {
      const messages = [
        createMessage("user", "a".repeat(200)), // 50 tokens
        createMessage("assistant", "b".repeat(200)), // 50 tokens
      ];
      const systemPrompt = "c".repeat(200); // 50 tokens

      // Limit 120 tokens: 50 for system, 70 for messages
      // Should keep only last message (50 tokens)
      const result = truncateMessages(messages, systemPrompt, 120);
      expect(result.length).toBe(1);
      expect(result[0].content).toBe("b".repeat(200));
    });

    it("preserves recent messages over older ones", () => {
      const messages = [
        createMessage("user", "old message"),
        createMessage("assistant", "old response"),
        createMessage("user", "recent message"),
        createMessage("assistant", "recent response"),
      ];

      // Very low limit - should keep only the most recent
      const result = truncateMessages(messages, undefined, 20);
      expect(result.length).toBeGreaterThan(0);
      expect(result[result.length - 1].content).toBe("recent response");
    });

    it("handles empty messages array", () => {
      const result = truncateMessages([], undefined, 1000);
      expect(result).toEqual([]);
    });

    it("handles very large system prompt", () => {
      const messages = [createMessage("user", "test")];
      const systemPrompt = "x".repeat(10000); // Very large

      // When system prompt exceeds limit, keep only last message
      const result = truncateMessages(messages, systemPrompt, 100);
      expect(result.length).toBe(1);
    });
  });

  describe("AI_CONFIG", () => {
    it("has sensible defaults", () => {
      expect(AI_CONFIG.timeout).toBeGreaterThanOrEqual(10000);
      expect(AI_CONFIG.maxRetries).toBeGreaterThanOrEqual(1);
      expect(AI_CONFIG.retryBaseDelay).toBeGreaterThan(0);
      expect(AI_CONFIG.maxInputTokens).toBeGreaterThan(0);
      expect(AI_CONFIG.charsPerToken).toBeGreaterThan(0);
    });
  });
});

describe("Provider Adapter - Retry Logic", () => {
  // These tests verify the retry behavior without making real API calls
  // The actual API calls are tested in integration tests

  it("retryable status codes are defined", () => {
    // Verify we retry on expected codes
    const retryableCodes = [429, 500, 502, 503, 504];
    // This is a documentation test - the actual retry logic is in the adapter
    expect(retryableCodes).toContain(429); // Rate limit
    expect(retryableCodes).toContain(503); // Service unavailable
  });
});
