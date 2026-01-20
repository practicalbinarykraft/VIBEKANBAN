/** Run History Service (PR-65, PR-73) - Read-only run history and details */
import { db } from "@/server/db";
import { projects, tasks, attempts, autopilotRuns } from "@/server/db/schema";
import { eq, and, inArray, desc } from "drizzle-orm";
import type {
  RunSummary,
  RunDetails,
  AttemptSummary,
  RunError,
  ListRunsResponse,
  GetRunResponse,
  RunStatus,
  AttemptStatus,
} from "@/types/autopilot-run";

function toISOString(date: Date | null): string | null {
  return date ? date.toISOString() : null;
}

function mapStatus(status: string): RunStatus {
  const valid: RunStatus[] = ["idle", "running", "stopped", "failed", "done"];
  return valid.includes(status as RunStatus) ? (status as RunStatus) : "idle";
}

// PR-73: Map autopilot_runs.status to RunStatus
function mapRunStatus(status: string): RunStatus {
  const mapping: Record<string, RunStatus> = {
    running: "running",
    completed: "done",
    failed: "failed",
    cancelled: "stopped",
  };
  return mapping[status] || "idle";
}

function mapAttemptStatus(status: string): AttemptStatus {
  const valid: AttemptStatus[] = ["pending", "queued", "running", "completed", "failed", "stopped"];
  return valid.includes(status as AttemptStatus) ? (status as AttemptStatus) : "pending";
}

export async function listRuns(projectId: string, limit = 20): Promise<ListRunsResponse> {
  // PR-73: Query from autopilot_runs table
  const runs = await db.select().from(autopilotRuns)
    .where(eq(autopilotRuns.projectId, projectId))
    .orderBy(desc(autopilotRuns.startedAt))
    .limit(limit);

  const result: RunSummary[] = [];
  for (const run of runs) {
    const attemptsForRun = await db.select().from(attempts)
      .where(eq(attempts.autopilotRunId, run.id));
    const failedCount = attemptsForRun.filter(a => a.status === "failed").length;

    result.push({
      runId: run.id,
      projectId: run.projectId,
      status: mapRunStatus(run.status),
      startedAt: toISOString(run.startedAt),
      finishedAt: toISOString(run.finishedAt),
      totalTasks: attemptsForRun.length,
      doneTasks: attemptsForRun.filter(a => a.status === "completed").length,
      failedTasks: failedCount,
    });
  }

  return { runs: result };
}

export async function getRunDetails(runId: string): Promise<GetRunResponse> {
  // PR-73: Query from autopilot_runs table
  const run = await db.select().from(autopilotRuns)
    .where(eq(autopilotRuns.id, runId)).get();

  if (!run) {
    return { run: null, error: "Run not found" };
  }

  // Get attempts linked to this run
  const runAttempts = await db.select().from(attempts)
    .where(eq(attempts.autopilotRunId, runId))
    .orderBy(desc(attempts.startedAt));

  // Get task titles for attempts
  const taskIds = [...new Set(runAttempts.map(a => a.taskId))];
  const taskMap = new Map<string, string>();
  if (taskIds.length > 0) {
    const taskRows = await db.select().from(tasks).where(inArray(tasks.id, taskIds));
    taskRows.forEach(t => taskMap.set(t.id, t.title));
  }

  const attemptSummaries: AttemptSummary[] = runAttempts.map(a => ({
    attemptId: a.id,
    taskId: a.taskId,
    taskTitle: taskMap.get(a.taskId) || "Unknown Task",
    status: mapAttemptStatus(a.status),
    startedAt: toISOString(a.startedAt),
    finishedAt: toISOString(a.finishedAt),
    exitCode: a.exitCode,
    error: a.applyError || null,
  }));

  const errors = await getRunErrorsForAttempts(runAttempts, taskMap);
  const completedCount = attemptSummaries.filter(a => a.status === "completed").length;
  const failedCount = attemptSummaries.filter(a => a.status === "failed").length;

  const runDetails: RunDetails = {
    runId: run.id,
    projectId: run.projectId,
    status: mapRunStatus(run.status),
    startedAt: toISOString(run.startedAt),
    finishedAt: toISOString(run.finishedAt),
    totalTasks: attemptSummaries.length,
    doneTasks: completedCount,
    failedTasks: failedCount,
    attempts: attemptSummaries,
    errors,
  };

  return { run: runDetails };
}

// PR-73: Get errors from attempts array
function getRunErrorsForAttempts(
  runAttempts: typeof attempts.$inferSelect[],
  taskMap: Map<string, string>
): RunError[] {
  return runAttempts
    .filter(a => a.status === "failed")
    .map(a => ({
      code: `EXIT_${a.exitCode ?? "UNKNOWN"}`,
      message: a.applyError || `Task failed with exit code ${a.exitCode ?? "unknown"}`,
      attemptId: a.id,
      taskTitle: taskMap.get(a.taskId),
    }));
}

// Legacy: Get errors by runId (kept for backward compat)
export async function getRunErrors(runId: string): Promise<RunError[]> {
  const runAttempts = await db.select().from(attempts)
    .where(eq(attempts.autopilotRunId, runId));
  const taskIds = [...new Set(runAttempts.map(a => a.taskId))];
  const taskMap = new Map<string, string>();
  if (taskIds.length > 0) {
    const taskRows = await db.select().from(tasks).where(inArray(tasks.id, taskIds));
    taskRows.forEach(t => taskMap.set(t.id, t.title));
  }
  return getRunErrorsForAttempts(runAttempts, taskMap);
}
