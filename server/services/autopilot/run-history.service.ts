/** Run History Service (PR-65) - Read-only run history and details */
import { db } from "@/server/db";
import { projects, tasks, attempts } from "@/server/db/schema";
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

function mapAttemptStatus(status: string): AttemptStatus {
  const valid: AttemptStatus[] = ["pending", "queued", "running", "completed", "failed", "stopped"];
  return valid.includes(status as AttemptStatus) ? (status as AttemptStatus) : "pending";
}

export async function listRuns(projectId: string, limit = 20): Promise<ListRunsResponse> {
  const project = await db.select().from(projects)
    .where(eq(projects.id, projectId)).get();

  if (!project) {
    return { runs: [] };
  }

  // Get task counts for the project
  const projectTasks = await db.select().from(tasks)
    .where(eq(tasks.projectId, projectId));

  const doneTasks = projectTasks.filter(t => t.status === "done").length;
  const failedAttempts = await getFailedAttemptsCount(projectId);

  const run: RunSummary = {
    runId: project.id,
    projectId: project.id,
    status: mapStatus(project.executionStatus),
    startedAt: toISOString(project.executionStartedAt),
    finishedAt: toISOString(project.executionFinishedAt),
    totalTasks: projectTasks.length,
    doneTasks,
    failedTasks: failedAttempts,
  };

  return { runs: [run] };
}

export async function getRunDetails(runId: string): Promise<GetRunResponse> {
  const project = await db.select().from(projects)
    .where(eq(projects.id, runId)).get();

  if (!project) {
    return { run: null, error: "Run not found" };
  }

  const projectTasks = await db.select().from(tasks)
    .where(eq(tasks.projectId, runId));

  const taskIds = projectTasks.map(t => t.id);
  const taskMap = new Map(projectTasks.map(t => [t.id, t.title]));

  let projectAttempts: AttemptSummary[] = [];
  if (taskIds.length > 0) {
    const rawAttempts = await db.select().from(attempts)
      .where(inArray(attempts.taskId, taskIds))
      .orderBy(desc(attempts.startedAt));

    projectAttempts = rawAttempts.map(a => ({
      attemptId: a.id,
      taskId: a.taskId,
      taskTitle: taskMap.get(a.taskId) || "Unknown Task",
      status: mapAttemptStatus(a.status),
      startedAt: toISOString(a.startedAt),
      finishedAt: toISOString(a.finishedAt),
      exitCode: a.exitCode,
      error: a.applyError || null,
    }));
  }

  const errors = await getRunErrors(runId);
  const doneTasks = projectTasks.filter(t => t.status === "done").length;
  const failedAttempts = projectAttempts.filter(a => a.status === "failed").length;

  const run: RunDetails = {
    runId: project.id,
    projectId: project.id,
    status: mapStatus(project.executionStatus),
    startedAt: toISOString(project.executionStartedAt),
    finishedAt: toISOString(project.executionFinishedAt),
    totalTasks: projectTasks.length,
    doneTasks,
    failedTasks: failedAttempts,
    attempts: projectAttempts,
    errors,
  };

  return { run };
}

export async function getRunErrors(runId: string): Promise<RunError[]> {
  const projectTasks = await db.select().from(tasks)
    .where(eq(tasks.projectId, runId));

  if (projectTasks.length === 0) {
    return [];
  }

  const taskIds = projectTasks.map(t => t.id);
  const taskMap = new Map(projectTasks.map(t => [t.id, t.title]));

  const failedAttempts = await db.select().from(attempts)
    .where(and(
      inArray(attempts.taskId, taskIds),
      eq(attempts.status, "failed")
    ));

  return failedAttempts.map(a => ({
    code: `EXIT_${a.exitCode ?? "UNKNOWN"}`,
    message: a.applyError || `Task failed with exit code ${a.exitCode ?? "unknown"}`,
    attemptId: a.id,
    taskTitle: taskMap.get(a.taskId),
  }));
}

async function getFailedAttemptsCount(projectId: string): Promise<number> {
  const projectTasks = await db.select().from(tasks)
    .where(eq(tasks.projectId, projectId));

  if (projectTasks.length === 0) return 0;

  const taskIds = projectTasks.map(t => t.id);
  const failedAttempts = await db.select().from(attempts)
    .where(and(
      inArray(attempts.taskId, taskIds),
      eq(attempts.status, "failed")
    ));

  return failedAttempts.length;
}
