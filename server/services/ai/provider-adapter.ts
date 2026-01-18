/**
 * AI Provider Adapter
 *
 * Wraps AI API calls with:
 * - Timeout handling (AbortController)
 * - Retry logic with exponential backoff
 * - Token limit estimation and truncation
 *
 * Used by ai-provider.ts for real AI calls.
 */

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

// Configuration
export const AI_CONFIG = {
  // Timeout in milliseconds (30 seconds default)
  timeout: parseInt(process.env.AI_TIMEOUT_MS || "30000", 10),
  // Max retries for transient errors
  maxRetries: parseInt(process.env.AI_MAX_RETRIES || "3", 10),
  // Base delay for exponential backoff (ms)
  retryBaseDelay: 1000,
  // Max tokens to estimate for input (rough limit)
  maxInputTokens: 100000,
  // Characters per token estimate (rough average)
  charsPerToken: 4,
} as const;

// Errors that should trigger a retry
const RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 504];

export interface AdapterParams {
  messages: Array<{ role: string; content: string }>;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AdapterResult {
  content: string;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Estimate token count from text (rough approximation)
 * Uses ~4 chars per token as average
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / AI_CONFIG.charsPerToken);
}

/**
 * Truncate messages to fit within token limit
 * Preserves system prompt and recent messages, truncates older ones
 */
export function truncateMessages(
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string | undefined,
  maxTokens: number
): Array<{ role: string; content: string }> {
  const systemTokens = systemPrompt ? estimateTokens(systemPrompt) : 0;
  const availableTokens = maxTokens - systemTokens;

  if (availableTokens <= 0) {
    // System prompt alone exceeds limit, truncate it
    console.warn("[AI Adapter] System prompt exceeds token limit, truncating");
    return messages.slice(-1); // Keep only last message
  }

  // Calculate total tokens in messages
  let totalTokens = 0;
  const messageTokens = messages.map((m) => {
    const tokens = estimateTokens(m.content);
    totalTokens += tokens;
    return { message: m, tokens };
  });

  if (totalTokens <= availableTokens) {
    return messages; // No truncation needed
  }

  // Truncate from the beginning, keeping recent messages
  console.warn(
    `[AI Adapter] Truncating messages: ${totalTokens} tokens > ${availableTokens} available`
  );

  const result: Array<{ role: string; content: string }> = [];
  let usedTokens = 0;

  // Process messages from newest to oldest
  for (let i = messageTokens.length - 1; i >= 0; i--) {
    const { message, tokens } = messageTokens[i];
    if (usedTokens + tokens <= availableTokens) {
      result.unshift(message);
      usedTokens += tokens;
    } else {
      break;
    }
  }

  return result;
}

/**
 * Call Anthropic API with timeout and retry
 */
export async function callAnthropicWithRetry(
  client: Anthropic,
  model: string,
  params: AdapterParams
): Promise<AdapterResult> {
  // Truncate messages if needed
  const truncatedMessages = truncateMessages(
    params.messages,
    params.systemPrompt,
    AI_CONFIG.maxInputTokens
  );

  // Convert to Anthropic format
  const messages: Anthropic.MessageParam[] = truncatedMessages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  // Build system prompt
  const systemMessages = truncatedMessages.filter((m) => m.role === "system");
  const systemPrompt = [params.systemPrompt, ...systemMessages.map((m) => m.content)]
    .filter(Boolean)
    .join("\n\n");

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= AI_CONFIG.maxRetries; attempt++) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), AI_CONFIG.timeout);

      try {
        const response = await client.messages.create(
          {
            model,
            max_tokens: params.maxTokens || 4096,
            system: systemPrompt || undefined,
            messages,
          },
          { signal: controller.signal }
        );

        clearTimeout(timeoutId);

        const textContent = response.content.find((c) => c.type === "text");

        return {
          content: textContent?.text || "",
          model: response.model,
          usage: {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
          },
        };
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error: any) {
      lastError = error;

      // Check if it's a timeout
      if (error.name === "AbortError") {
        console.warn(
          `[AI Adapter] Anthropic timeout (attempt ${attempt + 1}/${AI_CONFIG.maxRetries + 1})`
        );
        if (attempt < AI_CONFIG.maxRetries) {
          await sleep(AI_CONFIG.retryBaseDelay * Math.pow(2, attempt));
          continue;
        }
        throw new Error(`Anthropic API timeout after ${AI_CONFIG.timeout}ms`);
      }

      // Check if retryable error
      const statusCode = error.status || error.statusCode;
      if (RETRYABLE_STATUS_CODES.includes(statusCode) && attempt < AI_CONFIG.maxRetries) {
        console.warn(
          `[AI Adapter] Anthropic error ${statusCode} (attempt ${attempt + 1}/${AI_CONFIG.maxRetries + 1}), retrying...`
        );
        await sleep(AI_CONFIG.retryBaseDelay * Math.pow(2, attempt));
        continue;
      }

      // Non-retryable error, throw immediately
      throw error;
    }
  }

  throw lastError || new Error("Anthropic API call failed after retries");
}

/**
 * Call OpenAI API with timeout and retry
 */
export async function callOpenAIWithRetry(
  client: OpenAI,
  model: string,
  params: AdapterParams
): Promise<AdapterResult> {
  // Truncate messages if needed
  const truncatedMessages = truncateMessages(
    params.messages,
    params.systemPrompt,
    AI_CONFIG.maxInputTokens
  );

  // Convert to OpenAI format
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

  if (params.systemPrompt) {
    messages.push({ role: "system", content: params.systemPrompt });
  }

  for (const m of truncatedMessages) {
    messages.push({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    });
  }

  // Map Claude model names to OpenAI equivalents
  let effectiveModel = model;
  if (model.includes("claude")) {
    effectiveModel = "gpt-4o";
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= AI_CONFIG.maxRetries; attempt++) {
    try {
      // OpenAI SDK has built-in timeout support
      const response = await client.chat.completions.create(
        {
          model: effectiveModel,
          max_tokens: params.maxTokens || 4096,
          temperature: params.temperature || 0.7,
          messages,
        },
        { timeout: AI_CONFIG.timeout }
      );

      return {
        content: response.choices[0]?.message?.content || "",
        model: response.model,
        usage: {
          inputTokens: response.usage?.prompt_tokens || 0,
          outputTokens: response.usage?.completion_tokens || 0,
        },
      };
    } catch (error: any) {
      lastError = error;

      // Check if it's a timeout
      if (error.code === "ETIMEDOUT" || error.code === "ECONNABORTED") {
        console.warn(
          `[AI Adapter] OpenAI timeout (attempt ${attempt + 1}/${AI_CONFIG.maxRetries + 1})`
        );
        if (attempt < AI_CONFIG.maxRetries) {
          await sleep(AI_CONFIG.retryBaseDelay * Math.pow(2, attempt));
          continue;
        }
        throw new Error(`OpenAI API timeout after ${AI_CONFIG.timeout}ms`);
      }

      // Check if retryable error
      const statusCode = error.status || error.statusCode;
      if (RETRYABLE_STATUS_CODES.includes(statusCode) && attempt < AI_CONFIG.maxRetries) {
        console.warn(
          `[AI Adapter] OpenAI error ${statusCode} (attempt ${attempt + 1}/${AI_CONFIG.maxRetries + 1}), retrying...`
        );
        await sleep(AI_CONFIG.retryBaseDelay * Math.pow(2, attempt));
        continue;
      }

      // Non-retryable error, throw immediately
      throw error;
    }
  }

  throw lastError || new Error("OpenAI API call failed after retries");
}
