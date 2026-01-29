/**
 * Council AI Router (PR-130: unified AI mode)
 *
 * Routes council AI requests through the same AI provider as Chat.
 * Uses getAICompletion() for consistent mock/real AI behavior.
 */

import { getAICompletion, isAIConfigured } from "../ai/ai-provider";
import { isMockModeEnabled } from "@/lib/mock-mode";

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
 * Routes to real AI or mock based on unified AI mode:
 * - isMockModeEnabled() → mock (CI/VK_TEST_MODE/E2E_PROFILE/NODE_ENV=test)
 * - AI configured (env or DB) → real
 * - Otherwise → error (not silently mock)
 */
export async function getCouncilAiResponse(
  params: CouncilAiParams
): Promise<CouncilAiResponse> {
  // Check mock mode first (PR-130 unified gating)
  if (isMockModeEnabled()) {
    return {
      content: getMockResponse(params.language),
      isReal: false,
    };
  }

  // Check if AI is configured (env or DB)
  const configured = await isAIConfigured();
  if (!configured) {
    // Not configured - return error message, not silent mock
    const errorMsg = params.language === "ru"
      ? "⚠️ AI не настроен. Добавьте API ключ в Настройках."
      : "⚠️ AI is not configured. Please add your API key in Settings.";
    return {
      content: errorMsg,
      isReal: false,
    };
  }

  // Call real AI through unified provider
  try {
    const result = await getAICompletion({
      systemPrompt: params.systemPrompt,
      messages: [{ role: "user", content: params.userPrompt }],
      maxTokens: params.maxTokens ?? 300,
      temperature: 0.7,
    });

    console.log(`[Council] Response from ${result.provider}/${result.model}`);

    return {
      content: result.content,
      isReal: result.provider !== "demo",
    };
  } catch (error: any) {
    console.error(`[Council] AI error: ${error.message}`);
    // Return error, not silent mock
    return {
      content: `⚠️ ${error.message}`,
      isReal: false,
    };
  }
}
