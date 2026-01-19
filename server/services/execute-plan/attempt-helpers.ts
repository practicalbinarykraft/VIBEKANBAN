/**
 * Execute Plan - Attempt Helper Functions
 */

import { db } from "@/server/db";
import { tasks, attempts } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { mkdirSync, existsSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import { runAttempt } from "../attempt-runner";
import { hasAvailableSlot, scheduleProject } from "../attempt-queue";
import { emitAttemptStatus } from "../events-hub";
import type { CreateAttemptOptions } from "./types";

/**
 * Create an attempt for a single task
 * Follows pattern from app/api/tasks/[id]/run/route.ts
 */
export async function createAttemptForTask(
  options: CreateAttemptOptions
): Promise<{ attemptId: string | null }> {
  const { taskId, task, project, userId, mode } = options;

  const attemptId = randomUUID();
  const attemptShort = attemptId.slice(0, 8);

  const slotAvailable = await hasAvailableSlot(project.id);

  const workspaceBase = process.env.WORKSPACE_BASE || "/tmp/vibe-workspaces";
  const workspacePath = join(workspaceBase, attemptId);

  try {
    mkdirSync(workspacePath, { recursive: true });
  } catch {
    // Workspace creation failed silently
  }

  let branchName: string | null = null;
  let baseCommit: string | null = null;

  if (project.repoPath && existsSync(project.repoPath)) {
    try {
      baseCommit = execSync(`git -C "${project.repoPath}" rev-parse HEAD`, {
        encoding: "utf-8",
      }).trim();
      branchName = `vibe/plan-${taskId.slice(0, 8)}/${attemptShort}`;

      execSync(
        `git -C "${project.repoPath}" worktree add -B "${branchName}" "${workspacePath}" ${project.defaultBranch}`,
        { encoding: "utf-8" }
      );
    } catch {
      // Worktree creation failed silently
    }
  }

  const initialStatus = slotAvailable ? "running" : "queued";

  await db.insert(attempts).values({
    id: attemptId,
    taskId,
    queuedAt: new Date(),
    startedAt: new Date(),
    agent: "Claude Sonnet 4.5",
    baseBranch: project.defaultBranch,
    branchName,
    baseCommit,
    worktreePath: workspacePath,
    status: initialStatus,
    runRequestedBy: userId,
  });

  await db
    .update(tasks)
    .set({ status: "in_progress", updatedAt: new Date() })
    .where(eq(tasks.id, taskId));

  emitAttemptStatus({ attemptId, status: initialStatus });

  if (slotAvailable && mode === "real") {
    runAttempt({
      attemptId,
      taskId,
      taskTitle: task.title,
      taskDescription: task.description,
      projectId: project.id,
      projectDefaultBranch: project.defaultBranch,
      branchName,
      baseCommit,
      workspacePath,
      agentName: "Claude Sonnet 4.5",
    });
  } else if (slotAvailable && mode === "mock") {
    await simulateMockExecution(attemptId, taskId, project.id);
  }

  return { attemptId };
}

/**
 * Simulate mock execution for testing
 */
export async function simulateMockExecution(
  attemptId: string,
  taskId: string,
  projectId: string
): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 50));

  await db
    .update(attempts)
    .set({
      finishedAt: new Date(),
      status: "completed",
      exitCode: 0,
    })
    .where(eq(attempts.id, attemptId));

  await db
    .update(tasks)
    .set({ status: "done", updatedAt: new Date() })
    .where(eq(tasks.id, taskId));

  emitAttemptStatus({ attemptId, status: "completed", exitCode: 0 });

  await scheduleProject(projectId);
}
