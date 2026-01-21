/** Factory Rerun Service (PR-93) - Rerun failed/selected tasks from a previous run */
import { db } from "@/server/db";
import { attempts } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { startBatchFactory, type BatchStartResult } from "./factory-batch-start.service";

export type RerunMode = "failed" | "selected";

interface AttemptRecord {
  taskId: string;
  status: string;
  updatedAt: Date;
}

export interface FactoryRerunDeps {
  getAttemptsByRunId: (runId: string) => Promise<AttemptRecord[]>;
  startBatch: (params: { projectId: string; taskIds: string[]; maxParallel: number }) => Promise<BatchStartResult>;
}

interface BuildRerunParams {
  runId: string;
  mode: RerunMode;
  selectedTaskIds?: string[];
}

interface StartRerunParams {
  projectId: string;
  sourceRunId: string;
  mode: RerunMode;
  selectedTaskIds?: string[];
  maxParallel: number;
}

type RerunResult =
  | { ok: true; newRunId: string; taskCount: number }
  | { ok: false; error: string };

const MIN_PARALLEL = 1;
const MAX_PARALLEL = 20;

/** Default: get attempts from DB */
async function defaultGetAttemptsByRunId(runId: string): Promise<AttemptRecord[]> {
  const rows = await db
    .select({
      taskId: attempts.taskId,
      status: attempts.status,
      finishedAt: attempts.finishedAt,
      startedAt: attempts.startedAt,
    })
    .from(attempts)
    .where(eq(attempts.factoryRunId, runId));

  return rows.map((r) => ({
    taskId: r.taskId,
    status: r.status,
    updatedAt: r.finishedAt ?? r.startedAt,
  }));
}

/** Default: delegate to factory-batch-start */
async function defaultStartBatch(params: {
  projectId: string;
  taskIds: string[];
  maxParallel: number;
}): Promise<BatchStartResult> {
  return startBatchFactory({
    projectId: params.projectId,
    source: "selection",
    taskIds: params.taskIds,
    maxParallel: params.maxParallel,
  });
}

const defaultDeps: FactoryRerunDeps = {
  getAttemptsByRunId: defaultGetAttemptsByRunId,
  startBatch: defaultStartBatch,
};

/**
 * Build list of taskIds to rerun from a previous run
 * - Dedupes by taskId (uses latest attempt per task)
 * - Filters by mode: "failed" = only failed, "selected" = only specified taskIds
 */
export async function buildRerunTaskIdsFromRun(
  params: BuildRerunParams,
  deps: FactoryRerunDeps = defaultDeps
): Promise<string[]> {
  const { runId, mode, selectedTaskIds } = params;

  const attemptRecords = await deps.getAttemptsByRunId(runId);

  // Group by taskId and find latest attempt for each
  const latestByTask = new Map<string, AttemptRecord>();
  for (const att of attemptRecords) {
    const existing = latestByTask.get(att.taskId);
    if (!existing || att.updatedAt > existing.updatedAt) {
      latestByTask.set(att.taskId, att);
    }
  }

  // Filter based on mode
  const result: string[] = [];
  for (const [taskId, att] of latestByTask) {
    if (mode === "failed") {
      // Only include if latest status is "failed"
      if (att.status === "failed") {
        result.push(taskId);
      }
    } else if (mode === "selected") {
      // Only include if in selectedTaskIds
      if (selectedTaskIds?.includes(taskId)) {
        result.push(taskId);
      }
    }
  }

  return result;
}

/**
 * Start a new factory run with tasks from a previous run
 * Returns NO_TASKS_TO_RERUN if no matching tasks found
 */
export async function startFactoryRerun(
  params: StartRerunParams,
  deps: FactoryRerunDeps = defaultDeps
): Promise<RerunResult> {
  const { projectId, sourceRunId, mode, selectedTaskIds, maxParallel } = params;

  // Build task list
  const taskIds = await buildRerunTaskIdsFromRun(
    { runId: sourceRunId, mode, selectedTaskIds },
    deps
  );

  if (taskIds.length === 0) {
    return { ok: false, error: "NO_TASKS_TO_RERUN" };
  }

  // Clamp maxParallel
  const clampedParallel = Math.min(MAX_PARALLEL, Math.max(MIN_PARALLEL, maxParallel));

  // Start batch
  const result = await deps.startBatch({
    projectId,
    taskIds,
    maxParallel: clampedParallel,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  return { ok: true, newRunId: result.runId, taskCount: taskIds.length };
}
