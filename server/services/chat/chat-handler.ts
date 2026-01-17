/**
 * Chat Handler
 *
 * Handles user messages in Project Chat with interactive flow:
 * 1. User sends idea → AI acknowledges and starts processing
 * 2. Council discusses → generates plan
 * 3. Shows proposal with task count
 */

import { db } from "@/server/db";
import { projectMessages } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { getAICompletion, isAIConfigured } from "../ai/ai-provider";

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
 * Generate test mode response based on keywords
 */
function getTestModeResponse(userMessage: string): string {
  const keywords = userMessage.toLowerCase();

  if (keywords.includes('auth') || keywords.includes('login')) {
    return "I understand you want to add authentication. Let me discuss this with the team to plan the implementation.";
  }
  if (keywords.includes('ui') || keywords.includes('component') || keywords.includes('page')) {
    return "Got it! I'll work with the team to design and implement this UI component.";
  }
  if (keywords.includes('api') || keywords.includes('endpoint')) {
    return "I'll coordinate with the backend team to create this API endpoint.";
  }
  return "I understand your request. Let me discuss this with the team to create a plan.";
}

/**
 * Generate AI acknowledgment response
 */
async function generateAIAcknowledgment(userMessage: string): Promise<string> {
  if (isTestMode()) {
    return getTestModeResponse(userMessage);
  }

  const configured = await isAIConfigured();
  if (!configured) {
    return "⚠️ AI is not configured. Please add your API key in Settings to get intelligent responses.";
  }

  try {
    const result = await getAICompletion({
      systemPrompt: `You are a helpful product manager assistant.
Acknowledge the user's request briefly and let them know you're analyzing it.
Keep response under 2 sentences. Be conversational and friendly.`,
      messages: [{ role: "user", content: userMessage }],
      maxTokens: 100,
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
 * Handle user message
 * Returns AI acknowledgment while council processes
 */
export async function handleUserMessage(
  projectId: string,
  userMessage: string
): Promise<{ userMsg: ChatMessage; productMsg: ChatMessage }> {
  // Save user message
  const userMsg = await saveMessage(projectId, "user", userMessage);

  // Generate AI acknowledgment (real AI or test mode)
  const productResponse = await generateAIAcknowledgment(userMessage);
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
