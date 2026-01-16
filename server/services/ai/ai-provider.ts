/**
 * AI Provider Service
 *
 * Provides unified interface for calling AI APIs (Anthropic, OpenAI)
 * Reads configuration from settings and encrypted key store
 */

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { db } from "@/server/db";
import { settings } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { getKey } from "../ai-keys-store";

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

/**
 * Get current AI settings from database
 */
export async function getAISettings(userId: string): Promise<AISettings> {
  const result = await db
    .select()
    .from(settings)
    .where(eq(settings.id, "global"))
    .get();

  const provider = (result?.provider || "demo") as AIProvider;
  const model = result?.model || "claude-sonnet-4-20250514";

  // Get API key from encrypted store if provider is not demo
  let apiKey: string | null = null;
  if (provider !== "demo") {
    apiKey = await getKey({ userId, provider: provider as "anthropic" | "openai" });
  }

  return { provider, model, apiKey };
}

/**
 * Check if AI is configured and ready to use
 */
export async function isAIConfigured(userId: string): Promise<boolean> {
  const settings = await getAISettings(userId);
  if (settings.provider === "demo") return false;
  return !!settings.apiKey;
}

/**
 * Get AI completion from configured provider
 */
export async function getAICompletion(
  userId: string,
  params: AICompletionParams
): Promise<AICompletionResult> {
  const aiSettings = await getAISettings(userId);

  // Demo mode returns mock response
  if (aiSettings.provider === "demo" || !aiSettings.apiKey) {
    return getDemoCompletion(params);
  }

  if (aiSettings.provider === "anthropic") {
    return getAnthropicCompletion(aiSettings, params);
  }

  if (aiSettings.provider === "openai") {
    return getOpenAICompletion(aiSettings, params);
  }

  // Fallback to demo
  return getDemoCompletion(params);
}

/**
 * Demo mode completion (mock response)
 */
function getDemoCompletion(params: AICompletionParams): AICompletionResult {
  const lastMessage = params.messages[params.messages.length - 1];
  const mockResponse = `[Demo Mode] This is a mock response to: "${lastMessage?.content?.substring(0, 50)}..."`;

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
