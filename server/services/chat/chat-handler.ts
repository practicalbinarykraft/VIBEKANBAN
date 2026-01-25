/**
 * Chat Handler (PR-127: Chat UX Fix)
 *
 * Handles user messages in Project Chat with conversational flow:
 * - Optimistic UI: user message appears instantly
 * - Language detection: auto-detect and persist
 * - Guardrails: short conversational responses only
 * - NO automatic council/planning triggers
 */

import { db } from "@/server/db";
import { projectMessages, projects } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { getAICompletion, isAIConfigured } from "../ai/ai-provider";

/**
 * Detect language from text (PR-127)
 * Returns "ru" for Cyrillic text, "en" otherwise
 */
export function detectLanguage(text: string): "ru" | "en" {
  const cyrillicPattern = /[\u0400-\u04FF]/;
  return cyrillicPattern.test(text) ? "ru" : "en";
}

/**
 * Get project's chat language from DB
 */
export async function getProjectLanguage(projectId: string): Promise<string | null> {
  const project = await db
    .select({ chatLanguage: projects.chatLanguage })
    .from(projects)
    .where(eq(projects.id, projectId))
    .get();
  return project?.chatLanguage ?? null;
}

/**
 * Set project's chat language in DB
 */
export async function setProjectLanguage(projectId: string, language: string): Promise<void> {
  await db
    .update(projects)
    .set({ chatLanguage: language })
    .where(eq(projects.id, projectId));
}

/**
 * Get chat mode system prompt with guardrails (PR-127)
 */
function getChatSystemPrompt(language: string): string {
  const langInstruction = language === "ru"
    ? "Отвечай ТОЛЬКО на русском языке."
    : "Respond ONLY in English.";

  return `You are a friendly assistant helping with project planning.

${langInstruction}

RULES:
1. Keep responses SHORT: 2-3 sentences maximum.
2. Be conversational and friendly.
3. Ask clarifying questions when needed.
4. Do NOT mention language detection or switching.

FORBIDDEN (never output these):
- JSON or code blocks
- Markdown headers (**, ##, etc.)
- Bullet lists or numbered lists
- Task specifications or technical details
- Words: "Proposal", "Summary", "Scope", "Tasks", "Implementation"
- Meta-statements about your capabilities

ALLOWED:
- Simple conversational responses
- Clarifying questions
- Brief acknowledgments
- Short explanations`;
}

export interface ChatMessage {
  id: string;
  projectId: string;
  role: "user" | "product" | "system";
  content: string;
  createdAt: Date;
}

/**
 * Check if running in test mode
 */
function isTestMode(): boolean {
  return process.env.PLAYWRIGHT === "1" || process.env.NODE_ENV === "test";
}

/**
 * Generate test mode response based on keywords and language (PR-127)
 */
function getTestModeResponse(userMessage: string, language: string): string {
  const keywords = userMessage.toLowerCase();

  if (language === "ru") {
    if (keywords.includes('привет') || keywords.includes('здравствуй')) {
      return "Привет! Чем могу помочь с твоим проектом?";
    }
    if (keywords.includes('авториз') || keywords.includes('логин') || keywords.includes('вход')) {
      return "Понял, нужна авторизация. Какой тип предпочитаешь — email/пароль или через соцсети?";
    }
    return "Понял! Расскажи подробнее, что именно ты хочешь сделать?";
  }

  // English responses
  if (keywords.includes('auth') || keywords.includes('login')) {
    return "Got it, you need authentication. What type are you thinking — email/password or social login?";
  }
  if (keywords.includes('ui') || keywords.includes('component') || keywords.includes('page')) {
    return "Understood! Can you describe what this page should look like or what it should do?";
  }
  if (keywords.includes('api') || keywords.includes('endpoint')) {
    return "Sure, an API endpoint. What data should it handle?";
  }
  return "Got it! Can you tell me more about what you're trying to build?";
}

/**
 * Generate AI chat response with guardrails (PR-127)
 */
async function generateAIChatResponse(userMessage: string, language: string): Promise<string> {
  if (isTestMode()) {
    return getTestModeResponse(userMessage, language);
  }

  const configured = await isAIConfigured();
  if (!configured) {
    return language === "ru"
      ? "⚠️ AI не настроен. Добавь API ключ в Настройках."
      : "⚠️ AI is not configured. Please add your API key in Settings.";
  }

  try {
    const result = await getAICompletion({
      systemPrompt: getChatSystemPrompt(language),
      messages: [{ role: "user", content: userMessage }],
      maxTokens: 150,
      temperature: 0.7,
    });
    return result.content;
  } catch (error: any) {
    return `⚠️ ${error.message}`;
  }
}

/**
 * Save message to database
 */
export async function saveMessage(
  projectId: string,
  role: "user" | "product" | "system",
  content: string
): Promise<ChatMessage> {
  const id = randomUUID();
  const now = new Date();

  await db.insert(projectMessages).values({
    id,
    projectId,
    role,
    content,
    createdAt: now,
  });

  return {
    id,
    projectId,
    role,
    content,
    createdAt: now,
  };
}

/**
 * Get chat history for project
 */
export async function getChatHistory(projectId: string): Promise<ChatMessage[]> {
  const messages = await db
    .select()
    .from(projectMessages)
    .where(eq(projectMessages.projectId, projectId))
    .orderBy(projectMessages.createdAt)
    .all();

  return messages.map((msg) => ({
    ...msg,
    role: msg.role as ChatMessage["role"],
    createdAt: new Date(msg.createdAt),
  }));
}

/**
 * Handle user message (PR-127: Chat UX Fix)
 * Returns conversational AI response WITHOUT triggering council
 */
export async function handleUserMessage(
  projectId: string,
  userMessage: string
): Promise<{ userMsg: ChatMessage; productMsg: ChatMessage }> {
  // Save user message first
  const userMsg = await saveMessage(projectId, "user", userMessage);

  // Get or detect language
  let language = await getProjectLanguage(projectId);
  if (!language) {
    // First message - detect and save language
    language = detectLanguage(userMessage);
    await setProjectLanguage(projectId, language);
  }

  // Generate conversational AI response (no council, no proposal)
  const productResponse = await generateAIChatResponse(userMessage, language);
  const productMsg = await saveMessage(projectId, "product", productResponse);

  return { userMsg, productMsg };
}

/**
 * Estimate effort based on task count
 */
function estimateEffort(taskCount: number): "S" | "M" | "L" {
  if (taskCount <= 3) return "S";
  if (taskCount <= 7) return "M";
  return "L";
}

export interface ProposalData {
  summary: string;
  scope: string;
  taskCount: number;
  estimate: "S" | "M" | "L";
}

/**
 * Generate proposal message from iteration plan
 */
export function formatProposalMessage(plan: {
  summary: string;
  tasks: Array<{ title: string; type: string }>;
}): { text: string; data: ProposalData } {
  const taskCount = plan.tasks.length;
  const estimate = estimateEffort(taskCount);

  // Group tasks by type for scope
  const types = plan.tasks.reduce((acc, t) => {
    acc[t.type] = (acc[t.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const scopeParts = Object.entries(types)
    .map(([type, count]) => `${count} ${type}`)
    .join(", ");

  const text = `📋 **Proposal**

**Summary:** ${plan.summary}

**Scope:** ${scopeParts} task${taskCount !== 1 ? "s" : ""}

**Tasks to create:** ${taskCount}
**Estimated effort:** ${estimate}

_Ready to create these tasks?_`;

  return {
    text,
    data: {
      summary: plan.summary,
      scope: scopeParts,
      taskCount,
      estimate,
    },
  };
}

/**
 * Save proposal message to chat
 */
export async function saveProposalMessage(
  projectId: string,
  plan: { summary: string; tasks: Array<{ title: string; type: string }> }
): Promise<ChatMessage> {
  const { text } = formatProposalMessage(plan);
  return saveMessage(projectId, "product", text);
}
