/**
 * Council AI Router
 *
 * Routes council AI requests between real Anthropic and mock responses.
 * Handles mode selection based on FEATURE_REAL_AI flag and test mode.
 */

import { shouldUseRealAi, getRealAiConfig } from "../ai/real-ai-config";
import { collectStreamResponse } from "../ai/anthropic-stream";

export interface CouncilAiParams {
  systemPrompt: string;
  userPrompt: string;
  language: "en" | "ru";
  maxTokens?: number;
}

export interface CouncilAiResponse {
  content: string;
  isReal: boolean;
}

/**
 * Get mock response for council (used in test/demo mode)
 */
function getMockResponse(language: "en" | "ru"): string {
  if (language === "ru") {
    return "Понимаю задачу. Ключевые вопросы: объём, пользователи, сроки.";
  }
  return "I understand the task. Key questions: scope, users, timeline.";
}

/**
 * Get council AI response
 *
 * Routes to real AI or mock based on configuration:
 * - PLAYWRIGHT=1 or NODE_ENV=test → mock
 * - FEATURE_REAL_AI=1 + ANTHROPIC_API_KEY → real
 * - Otherwise → mock
 */
export async function getCouncilAiResponse(
  params: CouncilAiParams
): Promise<CouncilAiResponse> {
  // Check if we should use real AI
  if (!shouldUseRealAi()) {
    return {
      content: getMockResponse(params.language),
      isReal: false,
    };
  }

  // Get real AI config
  const config = getRealAiConfig();
  if (!config) {
    return {
      content: getMockResponse(params.language),
      isReal: false,
    };
  }

  // Call real AI
  try {
    const content = await collectStreamResponse({
      apiKey: config.apiKey,
      model: config.model,
      system: params.systemPrompt,
      messages: [{ role: "user", content: params.userPrompt }],
      maxTokens: params.maxTokens ?? 300,
    });

    return {
      content,
      isReal: true,
    };
  } catch {
    // Fallback to mock on error
    return {
      content: getMockResponse(params.language),
      isReal: false,
    };
  }
}
