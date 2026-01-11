/**
 * Iteration Service
 *
 * Applies iteration plans to project
 * Creates or updates tasks based on council decisions
 */

import { db } from "@/server/db";
import { tasks } from "@/server/db/schema";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { IterationPlan } from "./council-orchestrator";

export interface IterationResult {
  createdTasks: string[];
  updatedTasks: string[];
}

/**
 * Apply iteration plan to project
 * Creates new tasks in kanban
 */
export async function applyIterationPlan(
  projectId: string,
  plan: IterationPlan
): Promise<IterationResult> {
  const createdTasks: string[] = [];

  // Create tasks from plan
  for (const taskPlan of plan.tasks) {
    const taskId = randomUUID();

    await db.insert(tasks).values({
      id: taskId,
      projectId,
      title: taskPlan.title,
      description: taskPlan.description,
      status: "todo",
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    createdTasks.push(taskId);
  }

  return {
    createdTasks,
    updatedTasks: [],
  };
}

/**
 * Get tasks for project
 */
export async function getProjectTasks(projectId: string) {
  return await db
    .select()
    .from(tasks)
    .where(eq(tasks.projectId, projectId))
    .orderBy(tasks.createdAt)
    .all();
}
