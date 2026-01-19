/**
 * Council Dialogue Service
 *
 * Handles phased council discussions (EPIC-9):
 * - Phase 1: Kickoff - each agent shares understanding, risks, questions
 * - Phase 2: Follow-up - agents respond to user answers
 * - Phase 3: Consensus - agents agree on plan
 */

import { db } from "@/server/db";
import { councilThreads, councilThreadMessages, planArtifacts } from "@/server/db/schema";
import { randomUUID } from "crypto";
import { eq, and, desc } from "drizzle-orm";
import { getCouncilAiResponse } from "./council-ai-router";

export type CouncilRole = "product" | "architect" | "backend" | "frontend" | "qa";
export type MessageKind = "message" | "question" | "concern" | "proposal" | "consensus";

export interface CouncilMessage {
  id: string;
  role: CouncilRole;
  content: string;
  kind: MessageKind;
  turnIndex: number;
  createdAt: Date;
}

export interface CouncilThread {
  id: string;
  projectId: string;
  iterationNumber: number;
  status: string;
  ideaText: string | null;
  language: string;
  currentTurn: number;
  messages: CouncilMessage[];
}

// Language detection (simple heuristic)
function detectLanguage(text: string): string {
  const cyrillicPattern = /[\u0400-\u04FF]/;
  return cyrillicPattern.test(text) ? "ru" : "en";
}

// Test mode check
function isTestMode(): boolean {
  return process.env.PLAYWRIGHT === "1" || process.env.NODE_ENV === "test";
}

// Role prompts for each council member
const ROLE_PROMPTS: Record<CouncilRole, { name: string; focus: string }> = {
  product: {
    name: "Product Manager",
    focus: "user needs, MVP scope, priorities, what to include/exclude",
  },
  architect: {
    name: "Architect",
    focus: "system design, tech stack, scalability, integration points",
  },
  backend: {
    name: "Backend Developer",
    focus: "API design, data models, business logic, performance",
  },
  frontend: {
    name: "Frontend Developer",
    focus: "UI/UX, components, state management, user interactions",
  },
  qa: {
    name: "QA Engineer",
    focus: "testing strategy, edge cases, quality risks, acceptance criteria",
  },
};

const DISCUSSION_ORDER: CouncilRole[] = ["product", "architect", "backend", "frontend", "qa"];

/**
 * Generate kickoff messages for Phase 1
 */
async function generateKickoffMessages(
  idea: string,
  language: string
): Promise<Omit<CouncilMessage, "id" | "createdAt">[]> {
  const messages: Omit<CouncilMessage, "id" | "createdAt">[] = [];
  const langInstruction = language === "ru" ? "Respond in Russian." : "Respond in English.";

  for (let i = 0; i < DISCUSSION_ORDER.length; i++) {
    const role = DISCUSSION_ORDER[i];
    const roleInfo = ROLE_PROMPTS[role];

    const systemPrompt = `You are ${roleInfo.name} in a software development council.
Your focus: ${roleInfo.focus}.
${langInstruction}

You MUST:
1. Share your understanding of the request (1-2 sentences)
2. Identify 1-2 risks or concerns from your perspective
3. Ask 1-2 clarifying questions OR suggest 1 idea/compromise

Keep response concise (3-5 sentences max). Be specific and actionable.`;

    const userPrompt = `Project idea: "${idea}"

Share your initial thoughts, risks, and questions.`;

    // getCouncilAiResponse handles mode selection (test/demo/real)
    const result = await getCouncilAiResponse({
      systemPrompt,
      userPrompt,
      language: language as "en" | "ru",
      maxTokens: 300,
    });

    const kind = detectMessageKind(result.content);
    messages.push({
      role,
      kind,
      content: result.content.trim(),
      turnIndex: 0,
    });
  }

  // Product manager summarizes questions at the end
  const productSummary = await generateProductSummary(idea, messages, language);
  messages.push(productSummary);

  return messages;
}

/**
 * Generate Product Manager summary with questions for user
 */
async function generateProductSummary(
  idea: string,
  previousMessages: Omit<CouncilMessage, "id" | "createdAt">[],
  language: string
): Promise<Omit<CouncilMessage, "id" | "createdAt">> {
  const langInstruction = language === "ru" ? "Respond in Russian." : "Respond in English.";
  const discussionSummary = previousMessages.map(m => `[${m.role}]: ${m.content}`).join("\n");

  const systemPrompt = `You are the Product Manager summarizing the council discussion.
${langInstruction}

Your response MUST include exactly these sections:
1. **Questions for user:** - consolidated list of questions from the team
2. **Initial hypothesis:** - brief summary of what we'll build
3. **In MVP:** - what will be included
4. **NOT in MVP:** - what will be excluded for now`;

  const userPrompt = `Idea: "${idea}"\n\nDiscussion:\n${discussionSummary}`;

  // getCouncilAiResponse handles mode selection (test/demo/real)
  const result = await getCouncilAiResponse({
    systemPrompt,
    userPrompt,
    language: language as "en" | "ru",
    maxTokens: 400,
  });

  return {
    role: "product",
    kind: "question",
    content: result.content.trim(),
    turnIndex: 0,
  };
}

/**
 * Detect message kind from content
 */
function detectMessageKind(content: string): MessageKind {
  const lower = content.toLowerCase();
  if (lower.includes("?") || lower.includes("question")) return "question";
  if (lower.includes("risk") || lower.includes("concern") || lower.includes("worry")) return "concern";
  if (lower.includes("propose") || lower.includes("suggest") || lower.includes("recommend")) return "proposal";
  if (lower.includes("agree") || lower.includes("consensus")) return "consensus";
  return "message";
}

/**
 * Mock kickoff message for test/demo mode
 */
function getMockKickoffMessage(role: CouncilRole, idea: string, language: string): string {
  const messages: Record<CouncilRole, { en: string; ru: string }> = {
    product: {
      en: `I understand we're building: "${idea}". Key questions: scope, target users, MVP features.`,
      ru: `Понимаю, создаём: "${idea}". Ключевые вопросы: объём, целевые пользователи, MVP функции.`,
    },
    architect: {
      en: `Architecture considerations: need to define tech stack, data flow, and integration points.`,
      ru: `Архитектурные соображения: нужно определить стек, потоки данных, точки интеграции.`,
    },
    backend: {
      en: `Backend perspective: API structure, data models, and performance requirements need clarification.`,
      ru: `С точки зрения бэкенда: нужно уточнить структуру API, модели данных, требования к производительности.`,
    },
    frontend: {
      en: `UI/UX thoughts: component structure, state management approach, and user interactions to define.`,
      ru: `Мысли по UI/UX: структура компонентов, подход к состоянию, взаимодействия пользователя.`,
    },
    qa: {
      en: `Testing strategy: need to define acceptance criteria, edge cases, and quality metrics.`,
      ru: `Стратегия тестирования: нужно определить критерии приёмки, граничные случаи, метрики качества.`,
    },
  };
  return messages[role][language === "ru" ? "ru" : "en"];
}

/**
 * Start a new council discussion (Phase 1 - Kickoff)
 */
export async function startCouncilDialogue(
  projectId: string,
  idea: string
): Promise<CouncilThread> {
  const language = detectLanguage(idea);

  // Get iteration number
  const existingThreads = await db.select().from(councilThreads).where(eq(councilThreads.projectId, projectId)).all();
  const iterationNumber = existingThreads.length + 1;
  const threadId = randomUUID();

  // Create thread
  await db.insert(councilThreads).values({
    id: threadId,
    projectId,
    iterationNumber,
    status: "discussing",
    ideaText: idea,
    language,
    currentTurn: 0,
  });

  // Generate kickoff messages
  const kickoffMessages = await generateKickoffMessages(idea, language);

  // Save messages
  const savedMessages: CouncilMessage[] = [];
  for (const msg of kickoffMessages) {
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

  // Update status to awaiting response
  await db.update(councilThreads).set({ status: "awaiting_response" }).where(eq(councilThreads.id, threadId));

  return {
    id: threadId,
    projectId,
    iterationNumber,
    status: "awaiting_response",
    ideaText: idea,
    language,
    currentTurn: 0,
    messages: savedMessages,
  };
}

/**
 * Get council thread with messages
 */
export async function getCouncilDialogue(threadId: string): Promise<CouncilThread | null> {
  const thread = await db.select().from(councilThreads).where(eq(councilThreads.id, threadId)).get();
  if (!thread) return null;

  const messages = await db
    .select()
    .from(councilThreadMessages)
    .where(eq(councilThreadMessages.threadId, threadId))
    .orderBy(councilThreadMessages.turnIndex, councilThreadMessages.createdAt)
    .all();

  return {
    id: thread.id,
    projectId: thread.projectId,
    iterationNumber: thread.iterationNumber,
    status: thread.status,
    ideaText: thread.ideaText,
    language: thread.language,
    currentTurn: thread.currentTurn,
    messages: messages.map(m => ({
      id: m.id,
      role: m.role as CouncilRole,
      content: m.content,
      kind: (m.kind || "message") as MessageKind,
      turnIndex: m.turnIndex || 0,
      createdAt: new Date(m.createdAt),
    })),
  };
}

/**
 * Get latest council thread for project
 */
export async function getLatestCouncilDialogue(projectId: string): Promise<CouncilThread | null> {
  const thread = await db
    .select()
    .from(councilThreads)
    .where(eq(councilThreads.projectId, projectId))
    .orderBy(desc(councilThreads.createdAt))
    .get();

  if (!thread) return null;
  return getCouncilDialogue(thread.id);
}
