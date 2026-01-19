/**
 * Execute Plan - Task Helper Functions
 */

import { db } from "@/server/db";
import { tasks, attempts } from "@/server/db/schema";
import { eq, and, like } from "drizzle-orm";
import { getStableKey } from "./config";
import type { ExistingTaskInfo } from "./types";

/**
 * Find existing tasks created by this plan execution
 */
export async function findExistingTasksForPlan(
  projectId: string,
  planId: string,
  taskCount: number
): Promise<Map<number, ExistingTaskInfo>> {
  const result = new Map<number, ExistingTaskInfo>();

  for (let i = 0; i < taskCount; i++) {
    const stableKey = getStableKey(planId, i);
    const existing = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.projectId, projectId), like(tasks.description, `%${stableKey}%`)))
      .get();

    if (existing) {
      const attempt = await db
        .select()
        .from(attempts)
        .where(eq(attempts.taskId, existing.id))
        .get();

      result.set(i, { id: existing.id, hasAttempt: !!attempt });
    }
  }

  return result;
}

/**
 * Get all task and attempt IDs for a completed/executing plan
 */
export async function getExistingExecutionData(
  projectId: string,
  planId: string,
  taskCount: number
): Promise<{ taskIds: string[]; attemptIds: string[] }> {
  const taskIds: string[] = [];
  const attemptIds: string[] = [];

  for (let i = 0; i < taskCount; i++) {
    const stableKey = getStableKey(planId, i);
    const task = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.projectId, projectId), like(tasks.description, `%${stableKey}%`)))
      .get();

    if (task) {
      taskIds.push(task.id);
      const attempt = await db
        .select()
        .from(attempts)
        .where(eq(attempts.taskId, task.id))
        .get();
      if (attempt) {
        attemptIds.push(attempt.id);
      }
    }
  }

  return { taskIds, attemptIds };
}
