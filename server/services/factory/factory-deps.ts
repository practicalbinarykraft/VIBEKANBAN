/** Factory Dependencies (PR-82) - Real implementations for scheduler */
import { db } from "@/server/db";
import { tasks } from "@/server/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { runSimpleAttempt } from "@/server/services/execution/simple-runner";
import { getRun, finishRun } from "@/server/services/autopilot/autopilot-runs.service";
import type { FactorySchedulerDeps } from "./factory-scheduler.service";
import type { AttemptResult } from "@/types/factory";

/**
 * Get runnable tasks for a project (status: todo or in_progress)
 * TODO: May need refinement based on attempt history to avoid re-running succeeded tasks
 */
export async function getRunnableTasks(projectId: string): Promise<string[]> {
  const rows = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.projectId, projectId), inArray(tasks.status, ["todo", "in_progress"])));
  return rows.map((r) => r.id);
}

/**
 * Run a single task attempt, linking it to the autopilot run
 */
export async function runTaskAttempt(
  taskId: string,
  autopilotRunId: string
): Promise<AttemptResult> {
  // Get task to find projectId
  const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).get();
  if (!task) {
    return { taskId, attemptId: null, success: false, error: "Task not found" };
  }

  const result = await runSimpleAttempt({
    taskId,
    projectId: task.projectId,
    command: ["echo", "Task execution placeholder"],
    timeout: 60000,
    autopilotRunId,
  });

  if (result.budgetRejected) {
    return { taskId, attemptId: null, success: false, error: "Budget exceeded" };
  }

  return {
    taskId,
    attemptId: result.attemptId,
    success: result.success,
    error: result.error,
  };
}

/**
 * Get current run status
 */
export async function getRunStatus(runId: string): Promise<string> {
  const { run } = await getRun(runId);
  return run?.status ?? "unknown";
}

/**
 * Mark run as completed
 */
export async function markRunCompleted(runId: string): Promise<void> {
  await finishRun(runId, "completed");
}

/**
 * Mark run as failed
 */
export async function markRunFailed(runId: string, error?: string): Promise<void> {
  await finishRun(runId, "failed", error);
}

/**
 * Create default deps for production use
 */
export function createFactoryDeps(): FactorySchedulerDeps {
  return {
    getRunnableTasks,
    runTaskAttempt,
    getRunStatus,
    markRunCompleted,
    markRunFailed,
  };
}
