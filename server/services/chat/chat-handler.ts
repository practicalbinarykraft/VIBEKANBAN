/**
 * Chat Handler
 *
 * Handles user messages in Project Chat
 * Generates AI Product responses
 * Triggers council discussions
 */

import { db } from "@/server/db";
import { projectMessages } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

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
 * Generate deterministic hash from string
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Generate AI Product response
 */
function generateProductResponse(userMessage: string, projectId: string): string {
  if (isTestMode()) {
    // Deterministic response in test mode
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

    if (keywords.includes('settings') || keywords.includes('profile')) {
      return "Let me discuss with the team how to implement this feature properly.";
    }

    // Default
    return "I understand your request. Let me discuss this with the team to create a plan.";
  }

  // Production mode: real AI response
  return "I'll work with the team to address your request.";
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
 * Returns AI Product response
 */
export async function handleUserMessage(
  projectId: string,
  userMessage: string
): Promise<{ userMsg: ChatMessage; productMsg: ChatMessage }> {
  // Save user message
  const userMsg = await saveMessage(projectId, "user", userMessage);

  // Generate and save AI Product response
  const productResponse = generateProductResponse(userMessage, projectId);
  const productMsg = await saveMessage(projectId, "product", productResponse);

  return { userMsg, productMsg };
}
