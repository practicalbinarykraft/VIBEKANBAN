/** Factory Batch Start Service (PR-87, PR-91, PR-105) - Start factory from Kanban */
import { db } from "@/server/db";
import { tasks } from "@/server/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getAiStatus } from "@/server/services/ai/ai-status";
import { createFactoryRun, type FactoryRunMode } from "./factory-runs.service";
import { FactoryWorkerService } from "./factory-worker.service";
import { createWorkerDeps } from "./factory-deps";
import { getGlobalWorkerRegistry } from "./factory-worker-registry";

export type BatchStartSource = "column" | "selection";

export interface BatchStartParams {
  projectId: string;
  source: BatchStartSource;
  columnStatus?: string; // For column source
  taskIds?: string[]; // For selection source
  maxParallel: number;
  agentProfileId?: string; // PR-105
}

type TaskRecord = { id: string; status: string };

export interface BatchStartDeps {
  getTasksByStatus: (projectId: string, status: string) => Promise<TaskRecord[]>;
  getTasksByIds: (ids: string[]) => Promise<TaskRecord[]>;
  isFactoryRunning: (projectId: string) => Promise<boolean>;
  checkBudget: () => Promise<{ ok: boolean; reason?: string }>;
  createRun: (params: { projectId: string; mode: FactoryRunMode; maxParallel: number; selectedTaskIds?: string[]; columnId?: string }) => Promise<{ ok: boolean; runId?: string }>;
  startWorker: (params: { projectId: string; runId: string; maxParallel: number; agentProfileId?: string }) => Promise<{ started: boolean }>;
}

export type BatchStartResult =
  | { ok: true; runId: string; taskCount: number }
  | { ok: false; error: "NO_TASKS" | "ALREADY_RUNNING" | "BUDGET_EXCEEDED" | "RUN_FAILED" };

const RUNNABLE_STATUSES = ["todo", "in_progress", "in_review"];

async function defaultGetTasksByStatus(projectId: string, status: string): Promise<TaskRecord[]> {
  return db.select({ id: tasks.id, status: tasks.status })
    .from(tasks)
    .where(and(eq(tasks.projectId, projectId), eq(tasks.status, status)));
}

async function defaultGetTasksByIds(ids: string[]): Promise<TaskRecord[]> {
  if (ids.length === 0) return [];
  return db.select({ id: tasks.id, status: tasks.status })
    .from(tasks)
    .where(inArray(tasks.id, ids));
}

async function defaultIsFactoryRunning(projectId: string): Promise<boolean> {
  return getGlobalWorkerRegistry().has(projectId);
}

async function defaultCheckBudget(): Promise<{ ok: boolean; reason?: string }> {
  const status = await getAiStatus();
  if (!status.realAiEligible) {
    return { ok: false, reason: status.reason };
  }
  return { ok: true };
}

async function defaultCreateRun(params: { projectId: string; mode: FactoryRunMode; maxParallel: number; selectedTaskIds?: string[]; columnId?: string }): Promise<{ ok: boolean; runId?: string }> {
  const result = await createFactoryRun(params);
  if (result.ok) {
    return { ok: true, runId: result.runId };
  }
  return { ok: false };
}

async function defaultStartWorker(params: { projectId: string; runId: string; maxParallel: number; agentProfileId?: string }): Promise<{ started: boolean }> {
  const deps = createWorkerDeps();
  const worker = new FactoryWorkerService(deps);
  return worker.startOrAttach(params);
}

const defaultDeps: BatchStartDeps = {
  getTasksByStatus: defaultGetTasksByStatus,
  getTasksByIds: defaultGetTasksByIds,
  isFactoryRunning: defaultIsFactoryRunning,
  checkBudget: defaultCheckBudget,
  createRun: defaultCreateRun,
  startWorker: defaultStartWorker,
};

/**
 * Start factory batch execution from Kanban
 */
export async function startBatchFactory(
  params: BatchStartParams,
  deps: BatchStartDeps = defaultDeps
): Promise<BatchStartResult> {
  const { projectId, source, columnStatus, taskIds, maxParallel, agentProfileId } = params;

  // 1. Collect tasks based on source
  let taskRecords: TaskRecord[] = [];
  if (source === "column" && columnStatus) {
    taskRecords = await deps.getTasksByStatus(projectId, columnStatus);
  } else if (source === "selection" && taskIds) {
    const uniqueIds = [...new Set(taskIds)];
    if (uniqueIds.length === 0) {
      return { ok: false, error: "NO_TASKS" };
    }
    taskRecords = await deps.getTasksByIds(uniqueIds);
  }

  // 2. Filter to runnable tasks only
  const runnableTasks = taskRecords.filter((t) => RUNNABLE_STATUSES.includes(t.status));
  if (runnableTasks.length === 0) {
    return { ok: false, error: "NO_TASKS" };
  }

  // 3. Check if factory already running
  const running = await deps.isFactoryRunning(projectId);
  if (running) {
    return { ok: false, error: "ALREADY_RUNNING" };
  }

  // 4. Check budget
  const budgetCheck = await deps.checkBudget();
  if (!budgetCheck.ok) {
    return { ok: false, error: "BUDGET_EXCEEDED" };
  }

  // 5. Create factory run (PR-91)
  const runResult = await deps.createRun({
    projectId,
    mode: source,
    maxParallel,
    selectedTaskIds: source === "selection" ? runnableTasks.map((t) => t.id) : undefined,
    columnId: source === "column" ? columnStatus : undefined,
  });
  if (!runResult.ok || !runResult.runId) {
    return { ok: false, error: "RUN_FAILED" };
  }

  // 6. Start worker (PR-105: pass agentProfileId)
  await deps.startWorker({ projectId, runId: runResult.runId, maxParallel, agentProfileId });

  return { ok: true, runId: runResult.runId, taskCount: runnableTasks.length };
}
