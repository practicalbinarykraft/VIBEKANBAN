/** Factory Auto-Enqueue Service (PR-106) - Auto-enqueue task on status change */
import { db } from "@/server/db";
import { tasks, attempts, factoryRuns } from "@/server/db/schema";
import { eq, and, inArray, desc } from "drizzle-orm";
import { isRunnableStatus } from "@/lib/factory-constants";
import { createFactoryRun } from "./factory-runs.service";
import { FactoryWorkerService } from "./factory-worker.service";
import { createWorkerDeps } from "./factory-deps";
import { randomUUID } from "crypto";

export interface AutoEnqueueInput {
  projectId: string;
  taskId: string;
  reason: "status_change";
}

export interface AutoEnqueueDeps {
  getActiveRun: (projectId: string) => Promise<{ runId: string; status: string } | null>;
  isTaskRunnable: (taskId: string) => Promise<boolean>;
  createRun: (projectId: string) => Promise<{ ok: boolean; runId?: string; error?: string }>;
  createQueuedAttempt: (taskId: string, runId: string) => Promise<{ ok: boolean; attemptId?: string }>;
  startWorker: (projectId: string, runId: string) => Promise<{ started: boolean }>;
  hasExistingAttempt: (taskId: string, runId: string) => Promise<boolean>;
}

export type AutoEnqueueResult =
  | { ok: true; runId: string; enqueued: boolean }
  | { ok: false; errorCode: "TASK_NOT_RUNNABLE" | "RUN_CREATION_FAILED" };

async function defaultGetActiveRun(projectId: string): Promise<{ runId: string; status: string } | null> {
  const runs = await db
    .select({ runId: factoryRuns.id, status: factoryRuns.status })
    .from(factoryRuns)
    .where(and(eq(factoryRuns.projectId, projectId), inArray(factoryRuns.status, ["running", "pending"])))
    .orderBy(desc(factoryRuns.startedAt))
    .limit(1);
  return runs[0] ?? null;
}

async function defaultIsTaskRunnable(taskId: string): Promise<boolean> {
  const task = await db
    .select({ status: tasks.status })
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);
  if (!task[0]) return false;
  return isRunnableStatus(task[0].status);
}

async function defaultCreateRun(projectId: string): Promise<{ ok: boolean; runId?: string; error?: string }> {
  const result = await createFactoryRun({ projectId, mode: "column", maxParallel: 1 });
  if (result.ok) {
    return { ok: true, runId: result.runId };
  }
  return { ok: false, error: "Failed to create run" };
}

async function defaultCreateQueuedAttempt(
  taskId: string,
  runId: string
): Promise<{ ok: boolean; attemptId?: string }> {
  const attemptId = randomUUID();
  const now = new Date();
  await db.insert(attempts).values({
    id: attemptId,
    taskId,
    factoryRunId: runId,
    queuedAt: now,
    startedAt: now,
    status: "queued",
  });
  return { ok: true, attemptId };
}

async function defaultStartWorker(projectId: string, runId: string): Promise<{ started: boolean }> {
  const deps = createWorkerDeps();
  const worker = new FactoryWorkerService(deps);
  return worker.startOrAttach({ projectId, runId, maxParallel: 1 });
}

async function defaultHasExistingAttempt(taskId: string, runId: string): Promise<boolean> {
  const existing = await db
    .select({ id: attempts.id })
    .from(attempts)
    .where(
      and(
        eq(attempts.taskId, taskId),
        eq(attempts.factoryRunId, runId),
        inArray(attempts.status, ["queued", "pending", "running"])
      )
    )
    .limit(1);
  return existing.length > 0;
}

const defaultDeps: AutoEnqueueDeps = {
  getActiveRun: defaultGetActiveRun,
  isTaskRunnable: defaultIsTaskRunnable,
  createRun: defaultCreateRun,
  createQueuedAttempt: defaultCreateQueuedAttempt,
  startWorker: defaultStartWorker,
  hasExistingAttempt: defaultHasExistingAttempt,
};

/**
 * Auto-enqueue a task to factory queue on status change
 */
export async function autoEnqueueTask(
  input: AutoEnqueueInput,
  deps: AutoEnqueueDeps = defaultDeps
): Promise<AutoEnqueueResult> {
  const { projectId, taskId } = input;

  // 1. Check if task is runnable
  const runnable = await deps.isTaskRunnable(taskId);
  if (!runnable) {
    return { ok: false, errorCode: "TASK_NOT_RUNNABLE" };
  }

  // 2. Get or create active run
  let activeRun = await deps.getActiveRun(projectId);
  let isNewRun = false;

  if (!activeRun) {
    const createResult = await deps.createRun(projectId);
    if (!createResult.ok || !createResult.runId) {
      return { ok: false, errorCode: "RUN_CREATION_FAILED" };
    }
    activeRun = { runId: createResult.runId, status: "pending" };
    isNewRun = true;
  }

  // 3. Check for duplicate attempt
  const hasExisting = await deps.hasExistingAttempt(taskId, activeRun.runId);
  if (hasExisting) {
    return { ok: true, runId: activeRun.runId, enqueued: false };
  }

  // 4. Create queued attempt
  await deps.createQueuedAttempt(taskId, activeRun.runId);

  // 5. Start worker if new run
  if (isNewRun) {
    await deps.startWorker(projectId, activeRun.runId);
  }

  return { ok: true, runId: activeRun.runId, enqueued: true };
}
