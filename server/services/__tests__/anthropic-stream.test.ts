/**
 * Unit tests for Anthropic streaming adapter
 *
 * Tests streaming functionality with mocked SDK.
 * No real API calls are made.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Create mock stream function at module scope
const mockStreamFn = vi.fn();

// Mock the Anthropic SDK with a class
vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = { stream: mockStreamFn };
  },
}));

import { streamAnthropicMessage, AnthropicStreamParams } from "../ai/anthropic-stream";

describe("anthropic-stream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** Helper: create mock async iterator from events */
  function createMockStream(events: Array<{ type: string; delta?: any }>) {
    let index = 0;
    return {
      [Symbol.asyncIterator]: () => ({
        next: async () => {
          if (index < events.length) {
            return { done: false, value: events[index++] };
          }
          return { done: true, value: undefined };
        },
      }),
    };
  }

  describe("streamAnthropicMessage", () => {
    const defaultParams: AnthropicStreamParams = {
      apiKey: "test-api-key",
      model: "claude-sonnet-4-20250514",
      system: "You are a helpful assistant.",
      messages: [{ role: "user", content: "Hello" }],
    };

    it("yields chunks in correct order", async () => {
      const events = [
        { type: "content_block_delta", delta: { type: "text_delta", text: "Hello" } },
        { type: "content_block_delta", delta: { type: "text_delta", text: ", " } },
        { type: "content_block_delta", delta: { type: "text_delta", text: "world" } },
        { type: "content_block_delta", delta: { type: "text_delta", text: "!" } },
      ];
      mockStreamFn.mockReturnValue(createMockStream(events));

      const result: string[] = [];
      for await (const chunk of streamAnthropicMessage(defaultParams)) {
        result.push(chunk);
      }

      expect(result).toEqual(["Hello", ", ", "world", "!"]);
    });

    it("handles empty stream gracefully", async () => {
      mockStreamFn.mockReturnValue(createMockStream([]));

      const result: string[] = [];
      for await (const chunk of streamAnthropicMessage(defaultParams)) {
        result.push(chunk);
      }

      expect(result).toEqual([]);
    });

    it("throws error on API failure", async () => {
      const error = new Error("API rate limit exceeded");
      mockStreamFn.mockReturnValue({
        [Symbol.asyncIterator]: () => ({
          next: async () => { throw error; },
        }),
      });

      const generator = streamAnthropicMessage(defaultParams);
      await expect(generator.next()).rejects.toThrow("API rate limit exceeded");
    });

    it("filters non-text events", async () => {
      const events = [
        { type: "message_start", message: {} },
        { type: "content_block_delta", delta: { type: "text_delta", text: "Hello" } },
        { type: "content_block_stop" },
        { type: "content_block_delta", delta: { type: "text_delta", text: " World" } },
        { type: "message_stop" },
      ];
      mockStreamFn.mockReturnValue(createMockStream(events));

      const result: string[] = [];
      for await (const chunk of streamAnthropicMessage(defaultParams)) {
        result.push(chunk);
      }

      expect(result).toEqual(["Hello", " World"]);
    });

    it("passes correct parameters to Anthropic SDK", async () => {
      mockStreamFn.mockReturnValue(createMockStream([]));

      const params: AnthropicStreamParams = {
        apiKey: "my-api-key",
        model: "claude-sonnet-4-20250514",
        system: "Be concise.",
        messages: [
          { role: "user", content: "Hi" },
          { role: "assistant", content: "Hello!" },
          { role: "user", content: "How are you?" },
        ],
        maxTokens: 500,
      };

      for await (const _ of streamAnthropicMessage(params)) {
        // consume
      }

      expect(mockStreamFn).toHaveBeenCalledWith({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        system: "Be concise.",
        messages: [
          { role: "user", content: "Hi" },
          { role: "assistant", content: "Hello!" },
          { role: "user", content: "How are you?" },
        ],
      });
    });

    it("uses default maxTokens when not provided", async () => {
      mockStreamFn.mockReturnValue(createMockStream([]));

      for await (const _ of streamAnthropicMessage(defaultParams)) {
        // consume
      }

      expect(mockStreamFn).toHaveBeenCalledWith(
        expect.objectContaining({ max_tokens: 1024 })
      );
    });
  });
});
