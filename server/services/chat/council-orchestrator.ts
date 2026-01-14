/**
 * Council Orchestrator
 *
 * Orchestrates AI Council discussions
 * Generates discussion between PM, Architect, Backend, Frontend, QA
 * Creates iteration plans
 */

import { db } from "@/server/db";
import { councilThreads, councilThreadMessages } from "@/server/db/schema";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";

export interface CouncilMessage {
  id: string;
  threadId: string;
  role: "product" | "architect" | "backend" | "frontend" | "qa";
  content: string;
  createdAt: Date;
}

export interface CouncilThread {
  id: string;
  projectId: string;
  iterationNumber: number;
  status: "discussing" | "completed";
  messages: CouncilMessage[];
}

export interface IterationPlan {
  summary: string;
  tasks: Array<{
    title: string;
    description: string;
    type: "backend" | "frontend" | "qa";
  }>;
}

/**
 * Check if running in test mode
 */
function isTestMode(): boolean {
  return process.env.PLAYWRIGHT === "1" || process.env.NODE_ENV === "test";
}

/**
 * Generate council discussion based on user message
 */
function generateCouncilDiscussion(userMessage: string): Omit<CouncilMessage, "id" | "threadId" | "createdAt">[] {
  const kw = userMessage.toLowerCase();
  const msgs: Omit<CouncilMessage, "id" | "threadId" | "createdAt">[] = [
    { role: "product", content: `Let's break down: "${userMessage}". What's our approach?` },
  ];

  if (kw.includes('auth') || kw.includes('login')) {
    msgs.push(
      { role: "architect", content: "Need: Auth API, session mgmt, login UI, protected routes" },
      { role: "backend", content: "I'll create /api/auth endpoints with JWT" },
      { role: "frontend", content: "I'll build LoginForm with validation" }
    );
  } else if (kw.includes('ui') || kw.includes('component') || kw.includes('page')) {
    msgs.push(
      { role: "architect", content: "UI-focused task. New component per design system." },
      { role: "frontend", content: "I'll create component with styling and state mgmt" },
      { role: "qa", content: "I'll add E2E tests for component behavior" }
    );
  } else if (kw.includes('api') || kw.includes('endpoint')) {
    msgs.push(
      { role: "architect", content: "Backend API work. Design endpoint contract first." },
      { role: "backend", content: "I'll implement API with validation and error handling" },
      { role: "qa", content: "I'll add API tests for request/response contracts" }
    );
  } else {
    msgs.push(
      { role: "architect", content: "Split into frontend and backend work" },
      { role: "backend", content: "I'll handle server-side logic" },
      { role: "frontend", content: "I'll implement UI components" }
    );
  }

  msgs.push({ role: "qa", content: "I'll create comprehensive tests to verify everything" });
  return msgs;
}

/**
 * Generate iteration plan from discussion
 */
function generateIterationPlan(userMessage: string): IterationPlan {
  const kw = userMessage.toLowerCase();
  const tasks: IterationPlan["tasks"] = [];

  if (kw.includes('auth') || kw.includes('login')) {
    tasks.push(
      { title: "Create authentication API endpoints", description: "Implement /api/auth with JWT", type: "backend" },
      { title: "Build login UI component", description: "LoginForm with validation", type: "frontend" },
      { title: "Add authentication E2E tests", description: "Test login/logout flow", type: "qa" }
    );
  } else if (kw.includes('ui') || kw.includes('component')) {
    tasks.push({ title: `Build UI component`, description: userMessage, type: "frontend" });
  } else if (kw.includes('api') || kw.includes('endpoint')) {
    tasks.push({ title: "Create API endpoint", description: userMessage, type: "backend" });
  } else if (kw.includes('settings') || kw.includes('profile')) {
    tasks.push(
      { title: "Create settings page", description: "Settings page with user profile", type: "frontend" },
      { title: "Add settings API", description: "GET/PATCH /api/user/settings", type: "backend" }
    );
  } else {
    tasks.push({ title: userMessage, description: "Implementation as requested", type: "backend" });
  }

  return { summary: `Plan: ${userMessage}. ${tasks.length} tasks created.`, tasks };
}

/**
 * Start council discussion
 */
export async function startCouncilDiscussion(
  projectId: string,
  userMessage: string
): Promise<{ thread: CouncilThread; plan: IterationPlan }> {
  const existingThreads = await db.select().from(councilThreads).where(eq(councilThreads.projectId, projectId)).all();
  const iterationNumber = existingThreads.length + 1;
  const threadId = randomUUID();

  await db.insert(councilThreads).values({ id: threadId, projectId, iterationNumber, status: "discussing", createdAt: new Date() });

  const discussion = generateCouncilDiscussion(userMessage);
  const messages: CouncilMessage[] = [];

  for (const msg of discussion) {
    const id = randomUUID();
    const createdAt = new Date();
    await db.insert(councilThreadMessages).values({ id, threadId, role: msg.role, content: msg.content, createdAt });
    messages.push({ id, threadId, role: msg.role, content: msg.content, createdAt });
  }

  await db.update(councilThreads).set({ status: "completed" }).where(eq(councilThreads.id, threadId));

  return {
    thread: { id: threadId, projectId, iterationNumber, status: "completed", messages },
    plan: generateIterationPlan(userMessage),
  };
}

/**
 * Get council thread with messages
 */
export async function getCouncilThread(threadId: string): Promise<CouncilThread | null> {
  const thread = await db
    .select()
    .from(councilThreads)
    .where(eq(councilThreads.id, threadId))
    .get();

  if (!thread) return null;

  const messages = await db
    .select()
    .from(councilThreadMessages)
    .where(eq(councilThreadMessages.threadId, threadId))
    .orderBy(councilThreadMessages.createdAt)
    .all();

  return {
    id: thread.id,
    projectId: thread.projectId,
    iterationNumber: thread.iterationNumber,
    status: thread.status as CouncilThread["status"],
    messages: messages.map((msg) => ({
      ...msg,
      role: msg.role as CouncilMessage["role"],
      createdAt: new Date(msg.createdAt),
    })),
  };
}

/**
 * Get latest council thread for project
 */
export async function getLatestCouncilThread(projectId: string): Promise<CouncilThread | null> {
  const threads = await db
    .select()
    .from(councilThreads)
    .where(eq(councilThreads.projectId, projectId))
    .orderBy(councilThreads.createdAt)
    .all();

  if (threads.length === 0) return null;

  const latestThread = threads[threads.length - 1];
  return getCouncilThread(latestThread.id);
}
