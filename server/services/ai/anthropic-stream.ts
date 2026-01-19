/**
 * Anthropic Streaming Adapter
 *
 * Provides async generator for streaming Anthropic responses.
 * Used by council dialogue for real-time AI responses.
 */

import Anthropic from "@anthropic-ai/sdk";

export interface AnthropicStreamParams {
  apiKey: string;
  model: string;
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  maxTokens?: number;
}

/**
 * Stream messages from Anthropic API
 *
 * Yields text chunks as they arrive from the API.
 * Filters non-text events (message_start, content_block_stop, etc.)
 *
 * @throws Error on API failure
 */
export async function* streamAnthropicMessage(
  params: AnthropicStreamParams
): AsyncGenerator<string, void, unknown> {
  const client = new Anthropic({ apiKey: params.apiKey });

  const stream = client.messages.stream({
    model: params.model,
    max_tokens: params.maxTokens ?? 1024,
    system: params.system,
    messages: params.messages,
  });

  for await (const event of stream) {
    // Only yield text deltas
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      yield event.delta.text;
    }
  }
}

/**
 * Collect full response from stream (non-streaming convenience)
 *
 * Useful when you want streaming internally but need full text at the end.
 */
export async function collectStreamResponse(
  params: AnthropicStreamParams
): Promise<string> {
  const chunks: string[] = [];
  for await (const chunk of streamAnthropicMessage(params)) {
    chunks.push(chunk);
  }
  return chunks.join("");
}
