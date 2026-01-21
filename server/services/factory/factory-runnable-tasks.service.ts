/** Factory Runnable Tasks Service (PR-105) - Get runnable tasks for column */
import { db } from "@/server/db";
import { tasks, attempts } from "@/server/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { RUNNABLE_STATUSES } from "@/lib/factory-constants";

export { RUNNABLE_STATUSES };

export interface RunnableTasksDeps {
  getTasksByProjectAndStatus: (projectId: string, status: string) => Promise<{ id: string }[]>;
  getRunningAttemptTaskIds: (projectId: string) => Promise<string[]>;
}

export interface RunnableTasksResult {
  taskIds: string[];
  count: number;
}

async function defaultGetTasksByProjectAndStatus(
  projectId: string,
  status: string
): Promise<{ id: string }[]> {
  return db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.projectId, projectId), eq(tasks.status, status)));
}

async function defaultGetRunningAttemptTaskIds(projectId: string): Promise<string[]> {
  const runningAttempts = await db
    .select({ taskId: attempts.taskId })
    .from(attempts)
    .innerJoin(tasks, eq(attempts.taskId, tasks.id))
    .where(
      and(
        eq(tasks.projectId, projectId),
        inArray(attempts.status, ["pending", "queued", "running"])
      )
    );
  return runningAttempts.map((a) => a.taskId);
}

const defaultDeps: RunnableTasksDeps = {
  getTasksByProjectAndStatus: defaultGetTasksByProjectAndStatus,
  getRunningAttemptTaskIds: defaultGetRunningAttemptTaskIds,
};

/**
 * Get runnable task IDs for a specific column (status)
 */
export async function getRunnableTasksForColumn(
  projectId: string,
  columnStatus: string,
  deps: RunnableTasksDeps = defaultDeps
): Promise<RunnableTasksResult> {
  // Only runnable statuses are allowed
  if (!RUNNABLE_STATUSES.includes(columnStatus as typeof RUNNABLE_STATUSES[number])) {
    return { taskIds: [], count: 0 };
  }

  // Get all tasks in column
  const columnTasks = await deps.getTasksByProjectAndStatus(projectId, columnStatus);
  if (columnTasks.length === 0) {
    return { taskIds: [], count: 0 };
  }

  // Get tasks with running attempts to exclude
  const runningTaskIds = await deps.getRunningAttemptTaskIds(projectId);
  const runningSet = new Set(runningTaskIds);

  // Filter out tasks with running attempts
  const runnableTaskIds = columnTasks
    .map((t) => t.id)
    .filter((id) => !runningSet.has(id));

  return {
    taskIds: runnableTaskIds,
    count: runnableTaskIds.length,
  };
}
