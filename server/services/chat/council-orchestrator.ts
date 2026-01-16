/**
 * Council Orchestrator
 *
 * Orchestrates AI Council discussions
 * Generates discussion between PM, Architect, Backend, Frontend, QA
 * Creates iteration plans
 *
 * Supports both demo mode (mock responses) and real AI mode (API calls)
 */

import { db } from "@/server/db";
import { councilThreads, councilThreadMessages } from "@/server/db/schema";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { getAICompletion, isAIConfigured, AINotConfiguredError, AIAPIError } from "../ai/ai-provider";
import {
  COUNCIL_PROMPTS,
  DISCUSSION_ORDER,
  buildCouncilContext,
  CouncilRole,
} from "../ai/council-prompts";

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
 * Generate mock council discussion based on keywords (demo/test mode)
 */
function generateMockCouncilDiscussion(userMessage: string): Omit<CouncilMessage, "id" | "threadId" | "createdAt">[] {
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
 * Generate real council discussion using AI
 * Throws error if AI not configured (does not silently fallback)
 */
async function generateRealCouncilDiscussion(
  userMessage: string
): Promise<Omit<CouncilMessage, "id" | "threadId" | "createdAt">[]> {
  const messages: Omit<CouncilMessage, "id" | "threadId" | "createdAt">[] = [];
  const previousMessages: Array<{ role: CouncilRole; content: string }> = [];

  for (const role of DISCUSSION_ORDER) {
    const prompt = COUNCIL_PROMPTS[role];
    const context = buildCouncilContext(userMessage, previousMessages);

    // Call AI - will throw if not configured
    const result = await getAICompletion({
      systemPrompt: prompt.systemPrompt,
      messages: [{ role: "user", content: context }],
      maxTokens: 500,
      temperature: 0.7,
    });

    const content = result.content.trim();
    messages.push({ role, content });
    previousMessages.push({ role, content });
  }

  return messages;
}

/**
 * Generate mock iteration plan (demo/test mode)
 */
function generateMockIterationPlan(userMessage: string): IterationPlan {
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
 * Generate real iteration plan using AI
 * Throws error if AI not configured (does not silently fallback)
 */
async function generateRealIterationPlan(
  userMessage: string,
  councilDiscussion: Array<{ role: string; content: string }>
): Promise<IterationPlan> {
  const discussionSummary = councilDiscussion
    .map((m) => `[${m.role}]: ${m.content}`)
    .join("\n");

  const systemPrompt = `You are a planning assistant that creates iteration plans from council discussions.

Based on the user request and council discussion, create a JSON plan with:
1. A brief summary of what will be implemented
2. A list of tasks, each with:
   - title: Short task name
   - description: What needs to be done
   - type: One of "backend", "frontend", or "qa"

Return ONLY valid JSON in this exact format:
{
  "summary": "Brief summary of the plan",
  "tasks": [
    {"title": "Task name", "description": "Task description", "type": "backend|frontend|qa"}
  ]
}`;

  const userPrompt = `User Request: "${userMessage}"

Council Discussion:
${discussionSummary}

Generate the iteration plan JSON:`;

  const result = await getAICompletion({
    systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
    maxTokens: 1000,
    temperature: 0.3,
  });

  // Parse JSON from response
  const jsonMatch = result.content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const plan = JSON.parse(jsonMatch[0]) as IterationPlan;
      // Validate and sanitize the plan
      if (plan.summary && Array.isArray(plan.tasks)) {
        return {
          summary: plan.summary,
          tasks: plan.tasks.map((t) => ({
            title: t.title || "Untitled task",
            description: t.description || "",
            type: ["backend", "frontend", "qa"].includes(t.type) ? t.type : "backend",
          })),
        };
      }
    } catch {
      // JSON parse error - fall through to default
    }
  }

  // Default plan if parsing fails
  return {
    summary: `Plan for: ${userMessage}`,
    tasks: [{ title: userMessage, description: "Implementation as discussed by council", type: "backend" }],
  };
}

/**
 * Start council discussion
 * Returns error info in result if AI fails (fail loudly)
 */
export async function startCouncilDiscussion(
  projectId: string,
  userMessage: string
): Promise<{ thread: CouncilThread; plan: IterationPlan; error?: string }> {
  const existingThreads = await db.select().from(councilThreads).where(eq(councilThreads.projectId, projectId)).all();
  const iterationNumber = existingThreads.length + 1;
  const threadId = randomUUID();

  await db.insert(councilThreads).values({ id: threadId, projectId, iterationNumber, status: "discussing", createdAt: new Date() });

  // Check if real AI is available
  const aiConfigured = await isAIConfigured();
  let discussion: Omit<CouncilMessage, "id" | "threadId" | "createdAt">[];
  let plan: IterationPlan;
  let errorMessage: string | undefined;

  if (aiConfigured && !isTestMode()) {
    try {
      // Use real AI
      discussion = await generateRealCouncilDiscussion(userMessage);
      plan = await generateRealIterationPlan(userMessage, discussion);
    } catch (error) {
      // FAIL LOUDLY: Return error instead of silently falling back
      if (error instanceof AINotConfiguredError || error instanceof AIAPIError) {
        errorMessage = error.message;
      } else {
        errorMessage = `AI error: ${(error as Error).message}`;
      }
      // Still generate mock response but include error
      discussion = generateMockCouncilDiscussion(userMessage);
      plan = generateMockIterationPlan(userMessage);
    }
  } else {
    // Test mode or demo mode - use mock
    discussion = generateMockCouncilDiscussion(userMessage);
    plan = generateMockIterationPlan(userMessage);
  }

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
    plan,
    error: errorMessage,
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
