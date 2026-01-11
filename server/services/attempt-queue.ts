import { db } from "@/server/db";
import { attempts } from "@/server/db/schema";
import { eq, and, isNull, asc } from "drizzle-orm";

/**
 * Queue Scheduler - manages attempt execution queue
 *
 * Responsibility: Ensure maxRunningAttemptsPerProject limit is respected.
 * When a running attempt finishes, automatically start next queued attempt.
 *
 * MVP: maxRunningAttemptsPerProject = 1 (simple FIFO queue)
 */

const MAX_RUNNING_PER_PROJECT = 1;

/**
 * Schedule project queue - start next queued attempt if slot is available
 * Called after: attempt finishes, attempt cancelled, new attempt queued
 */
export async function scheduleProject(projectId: string): Promise<void> {
  const runningCount = await getRunningCount(projectId);
  console.log(`[Queue] Project ${projectId}: ${runningCount} running, max ${MAX_RUNNING_PER_PROJECT}`);

  if (runningCount < MAX_RUNNING_PER_PROJECT) {
    const started = await tryStartNext(projectId);
    if (started) {
      console.log(`[Queue] Started next queued attempt: ${started}`);
    } else {
      console.log(`[Queue] No queued attempts to start`);
    }
  }
}

/**
 * Get count of running attempts for project
 */
async function getRunningCount(projectId: string): Promise<number> {
  // Get all tasks in this project
  const tasksInProject = await db.query.tasks.findMany({
    where: (tasks: any, { eq }: any) => eq(tasks.projectId, projectId),
  });

  const taskIds = tasksInProject.map((t: any) => t.id);

  if (taskIds.length === 0) {
    return 0;
  }

  // Count running attempts for these tasks
  const runningAttempts = await db
    .select()
    .from(attempts)
    .where(eq(attempts.status, "running"))
    .all();

  const count = runningAttempts.filter(a => taskIds.includes(a.taskId)).length;

  return count;
}

/**
 * Atomically start next queued attempt (FIFO by queuedAt)
 * Returns attemptId if started, null if no queued attempts
 */
export async function tryStartNext(projectId: string): Promise<string | null> {
  // Get all queued attempts for tasks in this project, ordered by queuedAt
  const tasksInProject = await db.query.tasks.findMany({
    where: (tasks: any, { eq }: any) => eq(tasks.projectId, projectId),
  });

  const taskIds = tasksInProject.map((t: any) => t.id);

  if (taskIds.length === 0) {
    return null;
  }

  // Find first queued attempt (FIFO)
  const queuedAttempts = await db
    .select()
    .from(attempts)
    .where(
      and(
        eq(attempts.status, "queued"),
        isNull(attempts.finishedAt)
      )
    )
    .orderBy(asc(attempts.queuedAt))
    .all();

  // Filter to only attempts in this project
  const queuedInProject = queuedAttempts.filter(a => taskIds.includes(a.taskId));

  if (queuedInProject.length === 0) {
    return null;
  }

  const nextAttempt = queuedInProject[0];

  // Atomically update status to running
  // Re-check status to avoid race condition
  const updated = await db
    .update(attempts)
    .set({
      status: "running",
      startedAt: new Date(),
    })
    .where(
      and(
        eq(attempts.id, nextAttempt.id),
        eq(attempts.status, "queued")
      )
    )
    .returning();

  if (updated.length === 0) {
    // Race condition: another process already started this attempt
    return null;
  }

  console.log(`[Queue] Started attempt ${nextAttempt.id} for task ${nextAttempt.taskId}`);

  return nextAttempt.id;
}

/**
 * Check if project has available slot for new running attempt
 */
export async function hasAvailableSlot(projectId: string): Promise<boolean> {
  const runningCount = await getRunningCount(projectId);
  return runningCount < MAX_RUNNING_PER_PROJECT;
}

/**
 * Get queue position for an attempt (1-indexed)
 * Returns null if attempt is not queued
 */
export async function getQueuePosition(attemptId: string): Promise<number | null> {
  const attempt = await db.query.attempts.findFirst({
    where: (attempts: any, { eq }: any) => eq(attempts.id, attemptId),
  });

  if (!attempt || attempt.status !== "queued") {
    return null;
  }

  const task = await db.query.tasks.findFirst({
    where: (tasks: any, { eq }: any) => eq(tasks.id, attempt.taskId),
  });

  if (!task) {
    return null;
  }

  // Get all queued attempts for this project ordered by queuedAt
  const tasksInProject = await db.query.tasks.findMany({
    where: (tasks: any, { eq }: any) => eq(tasks.projectId, task.projectId),
  });

  const taskIds = tasksInProject.map((t: any) => t.id);

  const queuedAttempts = await db
    .select()
    .from(attempts)
    .where(eq(attempts.status, "queued"))
    .orderBy(asc(attempts.queuedAt))
    .all();

  const queuedInProject = queuedAttempts.filter(a => taskIds.includes(a.taskId));

  const position = queuedInProject.findIndex(a => a.id === attemptId);

  return position === -1 ? null : position + 1;
}
