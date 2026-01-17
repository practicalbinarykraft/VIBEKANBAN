/**
 * Plan Generator Service
 *
 * Handles Phase 3: Generate plan drafts based on council discussion
 * Supports versioning, revision, and approval
 */

import { db } from "@/server/db";
import { councilThreads, planArtifacts } from "@/server/db/schema";
import { randomUUID } from "crypto";
import { eq, desc, and } from "drizzle-orm";
import { getAICompletion, isAIConfigured } from "../ai/ai-provider";
import { getCouncilDialogue } from "./council-dialogue";

export interface PlanTask {
  title: string;
  description: string;
  type: "backend" | "frontend" | "qa" | "design";
  estimate: "S" | "M" | "L";
}

export interface PlanArtifact {
  id: string;
  threadId: string;
  version: number;
  status: "draft" | "revised" | "approved" | "final";
  summary: string;
  scope: string;
  tasks: PlanTask[];
  taskCount: number;
  estimate: "S" | "M" | "L";
  createdAt: Date;
}

function isTestMode(): boolean {
  return process.env.PLAYWRIGHT === "1" || process.env.NODE_ENV === "test";
}

/**
 * Calculate overall estimate from tasks
 */
function calculateOverallEstimate(tasks: PlanTask[]): "S" | "M" | "L" {
  const count = tasks.length;
  if (count <= 5) return "S";
  if (count <= 12) return "M";
  return "L";
}

/**
 * Generate plan tasks from council discussion
 */
async function generatePlanTasks(
  thread: NonNullable<Awaited<ReturnType<typeof getCouncilDialogue>>>,
  revision?: string
): Promise<{ summary: string; scope: string; tasks: PlanTask[] }> {
  const language = thread.language;
  const idea = thread.ideaText || "";

  if (isTestMode() || !(await isAIConfigured())) {
    return getMockPlan(idea, language);
  }

  const langInstruction = language === "ru" ? "Respond in Russian." : "Respond in English.";
  const discussionContext = thread.messages.map(m => `[${m.role}]: ${m.content}`).join("\n");

  const systemPrompt = `You are a planning assistant creating a development plan.
${langInstruction}

Based on the council discussion, generate a structured plan.
Return ONLY valid JSON in this exact format:
{
  "summary": "Brief 1-2 sentence summary of what we're building",
  "scope": "What's included in this iteration",
  "tasks": [
    {"title": "Task name", "description": "What to do", "type": "backend|frontend|qa|design", "estimate": "S|M|L"}
  ]
}

Guidelines:
- Create 5-15 specific, actionable tasks
- Each task should be completable in 1-4 hours
- Include backend, frontend, and qa tasks as appropriate
- S = <2h, M = 2-4h, L = 4-8h`;

  const userPrompt = `Idea: "${idea}"

Council Discussion:
${discussionContext}

${revision ? `User revision request: "${revision}"` : ""}

Generate the plan JSON:`;

  try {
    const result = await getAICompletion({
      systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      maxTokens: 1500,
      temperature: 0.4,
    });

    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        summary: parsed.summary || `Plan for: ${idea}`,
        scope: parsed.scope || "Core MVP features",
        tasks: (parsed.tasks || []).map((t: any) => ({
          title: t.title || "Task",
          description: t.description || "",
          type: ["backend", "frontend", "qa", "design"].includes(t.type) ? t.type : "backend",
          estimate: ["S", "M", "L"].includes(t.estimate) ? t.estimate : "M",
        })),
      };
    }
  } catch {
    // Fall through to mock
  }

  return getMockPlan(idea, language);
}

function getMockPlan(idea: string, language: string): { summary: string; scope: string; tasks: PlanTask[] } {
  if (language === "ru") {
    return {
      summary: `MVP для: ${idea}`,
      scope: "Базовый функционал первой итерации",
      tasks: [
        { title: "Создать структуру проекта", description: "Инициализация проекта и настройка", type: "backend", estimate: "S" },
        { title: "Разработать модели данных", description: "Определить схему БД", type: "backend", estimate: "M" },
        { title: "Создать API эндпоинты", description: "REST API для основных операций", type: "backend", estimate: "M" },
        { title: "Создать UI компоненты", description: "Базовые компоненты интерфейса", type: "frontend", estimate: "M" },
        { title: "Интегрировать фронтенд с API", description: "Подключить UI к бэкенду", type: "frontend", estimate: "M" },
        { title: "Написать тесты", description: "E2E и unit тесты", type: "qa", estimate: "M" },
      ],
    };
  }

  return {
    summary: `MVP for: ${idea}`,
    scope: "Core functionality for first iteration",
    tasks: [
      { title: "Setup project structure", description: "Initialize project and configuration", type: "backend", estimate: "S" },
      { title: "Design data models", description: "Define database schema", type: "backend", estimate: "M" },
      { title: "Create API endpoints", description: "REST API for core operations", type: "backend", estimate: "M" },
      { title: "Build UI components", description: "Core interface components", type: "frontend", estimate: "M" },
      { title: "Integrate frontend with API", description: "Connect UI to backend", type: "frontend", estimate: "M" },
      { title: "Write tests", description: "E2E and unit tests", type: "qa", estimate: "M" },
    ],
  };
}

/**
 * Generate a new plan draft (Phase 3)
 */
export async function generatePlan(threadId: string): Promise<PlanArtifact> {
  const thread = await getCouncilDialogue(threadId);
  if (!thread) {
    throw new Error("Council thread not found");
  }

  if (!["plan_ready", "awaiting_response", "discussing"].includes(thread.status)) {
    throw new Error(`Cannot generate plan: thread status is ${thread.status}`);
  }

  // Get current version
  const existingPlans = await db
    .select()
    .from(planArtifacts)
    .where(eq(planArtifacts.threadId, threadId))
    .orderBy(desc(planArtifacts.version))
    .all();

  const newVersion = existingPlans.length > 0 ? existingPlans[0].version + 1 : 1;

  // Generate plan
  const { summary, scope, tasks } = await generatePlanTasks(thread);
  const estimate = calculateOverallEstimate(tasks);

  const planId = randomUUID();
  const createdAt = new Date();

  await db.insert(planArtifacts).values({
    id: planId,
    threadId,
    version: newVersion,
    status: "draft",
    summary,
    scope,
    tasks: JSON.stringify(tasks),
    taskCount: tasks.length,
    estimate,
    createdAt,
  });

  return {
    id: planId,
    threadId,
    version: newVersion,
    status: "draft",
    summary,
    scope,
    tasks,
    taskCount: tasks.length,
    estimate,
    createdAt,
  };
}

/**
 * Revise an existing plan
 */
export async function revisePlan(threadId: string, revision: string): Promise<PlanArtifact> {
  const thread = await getCouncilDialogue(threadId);
  if (!thread) throw new Error("Council thread not found");

  // Get current version
  const existingPlans = await db
    .select()
    .from(planArtifacts)
    .where(eq(planArtifacts.threadId, threadId))
    .orderBy(desc(planArtifacts.version))
    .all();

  const newVersion = existingPlans.length > 0 ? existingPlans[0].version + 1 : 1;

  // Generate revised plan
  const { summary, scope, tasks } = await generatePlanTasks(thread, revision);
  const estimate = calculateOverallEstimate(tasks);

  const planId = randomUUID();
  const createdAt = new Date();

  await db.insert(planArtifacts).values({
    id: planId,
    threadId,
    version: newVersion,
    status: "revised",
    summary,
    scope,
    tasks: JSON.stringify(tasks),
    taskCount: tasks.length,
    estimate,
    createdAt,
  });

  return {
    id: planId,
    threadId,
    version: newVersion,
    status: "revised",
    summary,
    scope,
    tasks,
    taskCount: tasks.length,
    estimate,
    createdAt,
  };
}

/**
 * Approve a plan (makes it final)
 */
export async function approvePlan(planId: string): Promise<PlanArtifact> {
  const plan = await db.select().from(planArtifacts).where(eq(planArtifacts.id, planId)).get();
  if (!plan) throw new Error("Plan not found");

  await db.update(planArtifacts)
    .set({ status: "approved" })
    .where(eq(planArtifacts.id, planId));

  // Update thread status
  await db.update(councilThreads)
    .set({ status: "approved" })
    .where(eq(councilThreads.id, plan.threadId));

  return {
    ...plan,
    status: "approved" as const,
    estimate: plan.estimate as "S" | "M" | "L",
    tasks: JSON.parse(plan.tasks),
    createdAt: new Date(plan.createdAt),
  };
}

/**
 * Get latest plan for thread
 */
export async function getLatestPlan(threadId: string): Promise<PlanArtifact | null> {
  const plan = await db
    .select()
    .from(planArtifacts)
    .where(eq(planArtifacts.threadId, threadId))
    .orderBy(desc(planArtifacts.version))
    .get();

  if (!plan) return null;

  return {
    ...plan,
    status: plan.status as PlanArtifact["status"],
    estimate: plan.estimate as "S" | "M" | "L",
    tasks: JSON.parse(plan.tasks),
    createdAt: new Date(plan.createdAt),
  };
}

/**
 * Get all plan versions for thread
 */
export async function getPlanVersions(threadId: string): Promise<PlanArtifact[]> {
  const plans = await db
    .select()
    .from(planArtifacts)
    .where(eq(planArtifacts.threadId, threadId))
    .orderBy(desc(planArtifacts.version))
    .all();

  return plans.map(p => ({
    ...p,
    status: p.status as PlanArtifact["status"],
    estimate: p.estimate as "S" | "M" | "L",
    tasks: JSON.parse(p.tasks),
    createdAt: new Date(p.createdAt),
  }));
}
