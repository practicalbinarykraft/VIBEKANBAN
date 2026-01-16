/**
 * AI Provider Service
 *
 * Provides unified interface for calling AI APIs (Anthropic, OpenAI)
 * Reads configuration from global settings table
 *
 * IMPORTANT: Does NOT silently fallback to demo mode.
 * Will throw error if AI is not configured.
 */

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { db } from "@/server/db";
import { settings } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export type AIProvider = "demo" | "anthropic" | "openai";

export interface AIMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AICompletionParams {
  messages: AIMessage[];
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AICompletionResult {
  content: string;
  provider: AIProvider;
  model: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface AISettings {
  provider: AIProvider;
  model: string;
  apiKey: string | null;
}

export class AINotConfiguredError extends Error {
  constructor(message: string = "AI is not configured") {
    super(message);
    this.name = "AINotConfiguredError";
  }
}

export class AIAPIError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = "AIAPIError";
  }
}

/**
 * Check if demo mode is enabled via environment variable
 */
function isDemoModeEnabled(): boolean {
  return process.env.VIBE_DEMO_MODE === "1";
}

/**
 * Check if test mode is enabled
 */
function isTestMode(): boolean {
  return process.env.PLAYWRIGHT === "1" || process.env.NODE_ENV === "test";
}

/**
 * Get current AI settings from database
 * Reads directly from global settings table
 */
export async function getAISettings(): Promise<AISettings> {
  const result = await db
    .select()
    .from(settings)
    .where(eq(settings.id, "global"))
    .get();

  const provider = (result?.provider || "demo") as AIProvider;
  const model = result?.model || "claude-sonnet-4-20250514";

  // Get API key directly from settings table
  let apiKey: string | null = null;
  if (provider === "anthropic") {
    apiKey = result?.anthropicApiKey || null;
  } else if (provider === "openai") {
    apiKey = result?.openaiApiKey || null;
  }

  return { provider, model, apiKey };
}

/**
 * Check if AI is configured and ready to use
 */
export async function isAIConfigured(): Promise<boolean> {
  // Test mode and demo mode always return "configured" for mock
  if (isTestMode() || isDemoModeEnabled()) {
    return true;
  }

  const aiSettings = await getAISettings();
  if (aiSettings.provider === "demo") {
    return false;
  }
  return !!aiSettings.apiKey;
}

/**
 * Get AI completion from configured provider
 * THROWS error if not configured (does not silently fallback)
 */
export async function getAICompletion(
  params: AICompletionParams
): Promise<AICompletionResult> {
  // Test mode always uses mock
  if (isTestMode()) {
    return getDemoCompletion(params);
  }

  // Demo mode enabled via env var
  if (isDemoModeEnabled()) {
    return getDemoCompletion(params);
  }

  const aiSettings = await getAISettings();

  // If provider is demo, return demo response
  if (aiSettings.provider === "demo") {
    return getDemoCompletion(params);
  }

  // FAIL LOUDLY: If provider is set but no API key, throw error
  if (!aiSettings.apiKey) {
    throw new AINotConfiguredError(
      `${aiSettings.provider} API key is not configured. Go to Settings to add your API key.`
    );
  }

  try {
    if (aiSettings.provider === "anthropic") {
      return await getAnthropicCompletion(aiSettings, params);
    }

    if (aiSettings.provider === "openai") {
      return await getOpenAICompletion(aiSettings, params);
    }
  } catch (error: any) {
    // Wrap API errors with more context
    if (error instanceof AINotConfiguredError || error instanceof AIAPIError) {
      throw error;
    }

    // Handle specific API errors
    if (error.status === 401 || error.code === "invalid_api_key") {
      throw new AIAPIError(
        `Invalid ${aiSettings.provider} API key. Please check your key in Settings.`,
        401
      );
    }

    if (error.status === 429) {
      throw new AIAPIError(
        `${aiSettings.provider} rate limit exceeded. Please try again later.`,
        429
      );
    }

    if (error.status === 500 || error.status === 503) {
      throw new AIAPIError(
        `${aiSettings.provider} service is temporarily unavailable. Please try again later.`,
        error.status
      );
    }

    // Re-throw with context
    throw new AIAPIError(
      `${aiSettings.provider} API error: ${error.message}`,
      error.status
    );
  }

  // Should not reach here
  throw new AINotConfiguredError("Unknown AI provider");
}

/**
 * Demo mode completion (mock response)
 */
function getDemoCompletion(params: AICompletionParams): AICompletionResult {
  const lastMessage = params.messages[params.messages.length - 1];
  const mockResponse = `[Demo Mode] This is a simulated AI response. To use real AI, configure your API key in Settings.\n\nYour request: "${lastMessage?.content?.substring(0, 100)}..."`;

  return {
    content: mockResponse,
    provider: "demo",
    model: "mock",
    usage: { inputTokens: 0, outputTokens: 0 },
  };
}

/**
 * Get completion from Anthropic Claude
 */
async function getAnthropicCompletion(
  aiSettings: AISettings,
  params: AICompletionParams
): Promise<AICompletionResult> {
  const client = new Anthropic({
    apiKey: aiSettings.apiKey!,
  });

  // Convert messages to Anthropic format
  const messages: Anthropic.MessageParam[] = params.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  // Build system prompt from systemPrompt param and any system messages
  const systemMessages = params.messages.filter((m) => m.role === "system");
  const systemPrompt = [
    params.systemPrompt,
    ...systemMessages.map((m) => m.content),
  ]
    .filter(Boolean)
    .join("\n\n");

  const response = await client.messages.create({
    model: aiSettings.model || "claude-sonnet-4-20250514",
    max_tokens: params.maxTokens || 4096,
    system: systemPrompt || undefined,
    messages,
  });

  const textContent = response.content.find((c) => c.type === "text");

  return {
    content: textContent?.text || "",
    provider: "anthropic",
    model: response.model,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}

/**
 * Get completion from OpenAI
 */
async function getOpenAICompletion(
  aiSettings: AISettings,
  params: AICompletionParams
): Promise<AICompletionResult> {
  const client = new OpenAI({
    apiKey: aiSettings.apiKey!,
  });

  // Convert messages to OpenAI format
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

  // Add system prompt first
  if (params.systemPrompt) {
    messages.push({ role: "system", content: params.systemPrompt });
  }

  // Add conversation messages
  for (const m of params.messages) {
    messages.push({
      role: m.role,
      content: m.content,
    } as OpenAI.Chat.ChatCompletionMessageParam);
  }

  // Map Anthropic model names to OpenAI equivalents
  let model = aiSettings.model;
  if (model.includes("claude")) {
    model = "gpt-4o"; // Default to GPT-4o if Claude model specified
  }

  const response = await client.chat.completions.create({
    model,
    max_tokens: params.maxTokens || 4096,
    temperature: params.temperature || 0.7,
    messages,
  });

  return {
    content: response.choices[0]?.message?.content || "",
    provider: "openai",
    model: response.model,
    usage: {
      inputTokens: response.usage?.prompt_tokens || 0,
      outputTokens: response.usage?.completion_tokens || 0,
    },
  };
}
