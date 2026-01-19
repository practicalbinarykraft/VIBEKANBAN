/**
 * Execute Plan Service (PR-42)
 *
 * Takes tasks from plan_artifact, creates git worktrees, and runs Claude Code.
 * Supports mock and real execution modes.
 *
 * Key features:
 * - Idempotent: second call with same planId returns existing data
 * - Task deduplication via stable key in description
 * - Status flow: approved → executing → completed
 */

import { db } from "@/server/db";
import { planArtifacts, tasks, attempts, projects, councilThreads } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { scheduleProject } from "../attempt-queue";
import { getExecutionMode, getStableKey } from "./config";
import { findExistingTasksForPlan, getExistingExecutionData } from "./task-helpers";
import { createAttemptForTask } from "./attempt-helpers";
import type { ExecutePlanOptions, ExecutePlanResult, PlanTaskItem } from "./types";

// Re-export types and config for backwards compatibility
export { getExecutionMode, isExecutePlanV2Enabled, getStableKey } from "./config";
export type { ExecutionMode, PlanTaskItem, ExecutePlanOptions, ExecutePlanResult } from "./types";

/**
 * Execute a plan by:
 * 1. Loading tasks from plan_artifact
 * 2. Creating kanban tasks (with deduplication)
 * 3. Creating attempts with git worktrees
 * 4. Running Claude Code (or mock)
 *
 * IDEMPOTENT: Second call returns existing data without creating duplicates.
 */
export async function executePlan(options: ExecutePlanOptions): Promise<ExecutePlanResult> {
  const { planId, projectId, userId } = options;
  const mode = getExecutionMode();

  const plan = await db.select().from(planArtifacts).where(eq(planArtifacts.id, planId)).get();
  if (!plan) {
    return { success: false, createdTaskIds: [], attemptIds: [], error: "Plan not found" };
  }

  let planTasks: PlanTaskItem[];
  try {
    planTasks = JSON.parse(plan.tasks);
  } catch {
    return { success: false, createdTaskIds: [], attemptIds: [], error: "Invalid plan tasks JSON" };
  }

  if (!planTasks.length) {
    return { success: false, createdTaskIds: [], attemptIds: [], error: "Plan has no tasks" };
  }

  // IDEMPOTENCY GUARD
  if (plan.status === "executing" || plan.status === "completed") {
    const existing = await getExistingExecutionData(projectId, planId, planTasks.length);
    return {
      success: true,
      createdTaskIds: existing.taskIds,
      attemptIds: existing.attemptIds,
      alreadyExecuted: true,
    };
  }

  if (plan.status !== "approved") {
    return {
      success: false,
      createdTaskIds: [],
      attemptIds: [],
      error: `Plan status is '${plan.status}', expected 'approved'`,
    };
  }

  const project = await db.select().from(projects).where(eq(projects.id, projectId)).get();
  if (!project) {
    return { success: false, createdTaskIds: [], attemptIds: [], error: "Project not found" };
  }

  await db.update(planArtifacts).set({ status: "executing" }).where(eq(planArtifacts.id, planId));

  const existingTasks = await findExistingTasksForPlan(projectId, planId, planTasks.length);
  const createdTaskIds: string[] = [];
  const attemptIds: string[] = [];

  for (let i = 0; i < planTasks.length; i++) {
    const planTask = planTasks[i];
    const stableKey = getStableKey(planId, i);
    let taskId: string;

    const existing = existingTasks.get(i);
    if (existing) {
      taskId = existing.id;
    } else {
      taskId = randomUUID();
      const descriptionWithKey = `${planTask.description}\n\n${stableKey}`;

      await db.insert(tasks).values({
        id: taskId,
        projectId,
        title: planTask.title,
        description: descriptionWithKey,
        status: "todo",
        order: i,
        estimate: planTask.estimate,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    createdTaskIds.push(taskId);

    if (!existing?.hasAttempt) {
      const attemptResult = await createAttemptForTask({
        taskId,
        task: planTask,
        project,
        userId,
        mode,
      });

      if (attemptResult.attemptId) {
        attemptIds.push(attemptResult.attemptId);
      }
    } else {
      const existingAttempt = await db
        .select()
        .from(attempts)
        .where(eq(attempts.taskId, taskId))
        .get();
      if (existingAttempt) {
        attemptIds.push(existingAttempt.id);
      }
    }
  }

  await db.update(planArtifacts).set({ status: "completed" }).where(eq(planArtifacts.id, planId));

  await db
    .update(councilThreads)
    .set({ status: "completed" })
    .where(eq(councilThreads.id, plan.threadId));

  await scheduleProject(projectId);

  return {
    success: true,
    createdTaskIds,
    attemptIds,
  };
}
