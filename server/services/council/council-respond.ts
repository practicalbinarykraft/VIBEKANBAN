/**
 * Council Response Service
 *
 * Handles Phase 2: Follow-up responses after user answers
 * Agents discuss and reach consensus based on user input
 */

import { db } from "@/server/db";
import { councilThreads, councilThreadMessages } from "@/server/db/schema";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { getAICompletion, isAIConfigured } from "../ai/ai-provider";
import { CouncilRole, CouncilMessage, MessageKind, getCouncilDialogue } from "./council-dialogue";
import { isMockModeEnabled } from "@/lib/mock-mode";

const ROLE_PROMPTS: Record<CouncilRole, { name: string; focus: string }> = {
  product: { name: "Product Manager", focus: "user needs, MVP scope, priorities" },
  architect: { name: "Architect", focus: "system design, tech stack, scalability" },
  backend: { name: "Backend Developer", focus: "API design, data models, performance" },
  frontend: { name: "Frontend Developer", focus: "UI/UX, components, state management" },
  qa: { name: "QA Engineer", focus: "testing strategy, edge cases, quality" },
};

const DISCUSSION_ORDER: CouncilRole[] = ["architect", "backend", "frontend", "qa", "product"];

// isTestMode removed - use isMockModeEnabled() from @/lib/mock-mode

/**
 * Generate follow-up messages based on user response
 */
async function generateFollowUpMessages(
  userResponse: string,
  thread: NonNullable<Awaited<ReturnType<typeof getCouncilDialogue>>>
): Promise<Omit<CouncilMessage, "id" | "createdAt">[]> {
  const messages: Omit<CouncilMessage, "id" | "createdAt">[] = [];
  const language = thread.language;
  const langInstruction = language === "ru" ? "Respond in Russian." : "Respond in English.";
  const newTurn = thread.currentTurn + 1;

  // Build context from previous messages
  const previousContext = thread.messages.map(m => `[${m.role}]: ${m.content}`).join("\n");

  for (const role of DISCUSSION_ORDER) {
    if (isMockModeEnabled() || !(await isAIConfigured())) {
      messages.push({
        role,
        kind: role === "product" ? "consensus" : "message",
        content: getMockFollowUpMessage(role, userResponse, language),
        turnIndex: newTurn,
      });
      continue;
    }

    const roleInfo = ROLE_PROMPTS[role];
    const isLastRole = role === "product";

    const systemPrompt = `You are ${roleInfo.name} in a software development council.
Your focus: ${roleInfo.focus}.
${langInstruction}

The user has provided answers to the team's questions.
${isLastRole
  ? "As PM, summarize the consensus and confirm we're ready to generate a plan."
  : "React to the user's answers from your perspective. Note any concerns or agreements."}

Keep response concise (2-3 sentences). Be specific.`;

    const userPrompt = `Previous discussion:\n${previousContext}

User response: "${userResponse}"

${isLastRole
  ? "Summarize the team's consensus and confirm readiness for plan generation."
  : "Share your reaction to the user's response."}`;

    try {
      const result = await getAICompletion({
        systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
        maxTokens: 250,
        temperature: 0.7,
      });

      messages.push({
        role,
        kind: isLastRole ? "consensus" : detectKind(result.content),
        content: result.content.trim(),
        turnIndex: newTurn,
      });
    } catch {
      messages.push({
        role,
        kind: isLastRole ? "consensus" : "message",
        content: getMockFollowUpMessage(role, userResponse, language),
        turnIndex: newTurn,
      });
    }
  }

  return messages;
}

function detectKind(content: string): MessageKind {
  const lower = content.toLowerCase();
  if (lower.includes("agree") || lower.includes("consensus") || lower.includes("ready")) return "consensus";
  if (lower.includes("concern") || lower.includes("risk") || lower.includes("but")) return "concern";
  if (lower.includes("suggest") || lower.includes("propose")) return "proposal";
  return "message";
}

function getMockFollowUpMessage(role: CouncilRole, userResponse: string, language: string): string {
  const msgs: Record<CouncilRole, { en: string; ru: string }> = {
    architect: {
      en: "Good clarification. The architecture approach is clearer now. I can proceed with the design.",
      ru: "Хорошее уточнение. Архитектурный подход теперь яснее. Могу приступить к проектированию.",
    },
    backend: {
      en: "Understood. Backend requirements are now clearer. Ready to define the API structure.",
      ru: "Понял. Требования к бэкенду теперь яснее. Готов определить структуру API.",
    },
    frontend: {
      en: "Thanks for the details. UI/UX direction is clear. Can start component planning.",
      ru: "Спасибо за детали. Направление UI/UX понятно. Могу начать планирование компонентов.",
    },
    qa: {
      en: "Clear. Testing scope is defined. Will prepare test scenarios based on this.",
      ru: "Ясно. Объём тестирования определён. Подготовлю тест-кейсы на основе этого.",
    },
    product: {
      en: "Team consensus reached. We have enough clarity to generate a draft plan. Ready to proceed.",
      ru: "Команда пришла к согласию. У нас достаточно ясности для генерации плана. Готовы продолжить.",
    },
  };
  return msgs[role][language === "ru" ? "ru" : "en"];
}

/**
 * Process user response and generate follow-up discussion (Phase 2)
 */
export async function respondToCouncil(
  threadId: string,
  userResponse: string
): Promise<{ thread: NonNullable<Awaited<ReturnType<typeof getCouncilDialogue>>>; newMessages: CouncilMessage[] }> {
  const thread = await getCouncilDialogue(threadId);
  if (!thread) {
    throw new Error("Council thread not found");
  }

  if (thread.status !== "awaiting_response") {
    throw new Error(`Cannot respond: thread status is ${thread.status}`);
  }

  const newTurn = thread.currentTurn + 1;

  // Generate follow-up messages
  const followUpMessages = await generateFollowUpMessages(userResponse, thread);

  // Save messages
  const savedMessages: CouncilMessage[] = [];
  for (const msg of followUpMessages) {
    const id = randomUUID();
    const createdAt = new Date();
    await db.insert(councilThreadMessages).values({
      id,
      threadId,
      role: msg.role,
      content: msg.content,
      kind: msg.kind,
      turnIndex: msg.turnIndex,
      createdAt,
    });
    savedMessages.push({ id, ...msg, createdAt });
  }

  // Update thread status to plan_ready and increment turn
  await db.update(councilThreads)
    .set({ status: "plan_ready", currentTurn: newTurn })
    .where(eq(councilThreads.id, threadId));

  // Fetch updated thread
  const updatedThread = await getCouncilDialogue(threadId);
  if (!updatedThread) throw new Error("Failed to fetch updated thread");

  return { thread: updatedThread, newMessages: savedMessages };
}
