/** AutopilotRunnerService (PR-64) - Start/Stop/Retry autopilot runs */
import { db } from "@/server/db";
import { projects, tasks } from "@/server/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { runSimpleAttempt } from "@/server/services/execution/simple-runner";

export type RunStatus = "idle" | "running" | "stopped" | "failed" | "done";

export interface RunStatusResult {
  projectId: string;
  status: RunStatus;
  startedAt?: Date | null;
  finishedAt?: Date | null;
  error?: string;
}

export interface RunResult {
  success: boolean;
  status?: RunStatus;
  error?: string;
}

const stopRequests = new Map<string, boolean>();

export async function getRunStatus(projectId: string): Promise<RunStatusResult> {
  const project = await db.select().from(projects)
    .where(eq(projects.id, projectId)).get();

  if (!project) {
    return { projectId, status: "idle", error: "Project not found" };
  }

  return {
    projectId,
    status: project.executionStatus as RunStatus,
    startedAt: project.executionStartedAt,
    finishedAt: project.executionFinishedAt,
  };
}

export async function startRun(projectId: string): Promise<RunResult> {
  const project = await db.select().from(projects)
    .where(eq(projects.id, projectId)).get();

  if (!project) {
    return { success: false, error: "Project not found" };
  }

  // Check if already running
  if (project.executionStatus === "running") {
    return { success: false, error: "Project is already running" };
  }

  // Only allow start from idle, stopped, or failed
  const allowedStatuses = ["idle", "stopped", "failed"];
  if (!allowedStatuses.includes(project.executionStatus)) {
    return { success: false, error: `Cannot start from status: ${project.executionStatus}` };
  }

  // Update project status to running
  const now = new Date();
  await db.update(projects)
    .set({
      executionStatus: "running",
      executionStartedAt: now,
      executionFinishedAt: null,
    })
    .where(eq(projects.id, projectId));

  // Clear any previous stop request
  stopRequests.delete(projectId);

  // Get project tasks (todo or in_progress)
  const projectTasks = await db.select().from(tasks)
    .where(and(
      eq(tasks.projectId, projectId),
      inArray(tasks.status, ["todo", "in_progress"])
    ));

  // Fire-and-forget execution
  executeTasksAsync(projectId, projectTasks.map(t => t.id));

  return { success: true, status: "running" };
}

export async function stopRun(projectId: string, _reason?: string): Promise<RunResult> {
  const project = await db.select().from(projects)
    .where(eq(projects.id, projectId)).get();

  if (!project) {
    return { success: false, error: "Project not found" };
  }

  if (project.executionStatus !== "running") {
    return { success: false, error: "Project is not running" };
  }

  // Set stop request flag
  stopRequests.set(projectId, true);

  // Update project status
  await db.update(projects)
    .set({
      executionStatus: "stopped",
      executionFinishedAt: new Date(),
    })
    .where(eq(projects.id, projectId));

  return { success: true, status: "stopped" };
}

export async function retryRun(projectId: string): Promise<RunResult> {
  const project = await db.select().from(projects)
    .where(eq(projects.id, projectId)).get();

  if (!project) {
    return { success: false, error: "Project not found" };
  }

  // If running, stop first
  if (project.executionStatus === "running") {
    await stopRun(projectId, "retry requested");
  }

  // Reset to idle, then start
  await db.update(projects)
    .set({ executionStatus: "idle" })
    .where(eq(projects.id, projectId));

  return startRun(projectId);
}

export function isStopRequested(projectId: string): boolean {
  return stopRequests.get(projectId) === true;
}

async function executeTasksAsync(projectId: string, taskIds: string[]): Promise<void> {
  let hasFailure = false;

  for (const taskId of taskIds) {
    // Check for stop request
    if (isStopRequested(projectId)) {
      break;
    }

    // Create and run attempt
    try {
      const result = await runSimpleAttempt({
        taskId,
        projectId,
        command: ["echo", "Task execution placeholder"],
        timeout: 60000,
      });

      if (!result.success) {
        hasFailure = true;
      }
    } catch {
      hasFailure = true;
    }
  }

  // Check if stopped during execution
  if (isStopRequested(projectId)) {
    stopRequests.delete(projectId);
    return;
  }

  // Update final status
  const finalStatus = hasFailure ? "failed" : "done";
  await db.update(projects)
    .set({
      executionStatus: finalStatus,
      executionFinishedAt: new Date(),
    })
    .where(eq(projects.id, projectId));

  stopRequests.delete(projectId);
}
