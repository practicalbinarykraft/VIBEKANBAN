import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { tasks, attempts, logs, artifacts, projects } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { emitAttemptStatus } from "@/server/services/events-hub";
import { hasAvailableSlot } from "@/server/services/attempt-queue";
import { runAttempt } from "@/server/services/attempt-runner";
import { getCurrentUserId, canPerformTaskAction, permissionDeniedError } from "@/server/services/permissions";
import { randomUUID } from "crypto";
import { mkdirSync, existsSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;

  try {
    // Get current user
    const userId = await getCurrentUserId(request);

    // Check permissions
    const canPerform = await canPerformTaskAction(taskId, userId);
    if (!canPerform) {
      return NextResponse.json(permissionDeniedError(), { status: 403 });
    }

    // Get task
    const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).get();

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Get project
    const project = await db.select().from(projects).where(eq(projects.id, task.projectId)).get();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if slot is available (queue management)
    const slotAvailable = await hasAvailableSlot(project.id);
    console.log(`[Run] Task ${taskId}: slot available = ${slotAvailable}`);

    // Create attempt with isolated workspace
    const attemptId = randomUUID();
    const attemptShort = attemptId.slice(0, 8);

    // If no slot available, queue the attempt
    if (!slotAvailable) {
      const queuedAttempt = {
        id: attemptId,
        taskId: task.id,
        queuedAt: new Date(),
        startedAt: new Date(), // Required by schema, but not semantically started yet
        agent: "Claude Sonnet 4.5",
        baseBranch: project.defaultBranch,
        worktreePath: `/tmp/queued-${attemptId}`, // Placeholder
        status: "queued" as const,
        runRequestedBy: userId,
      };

      await db.insert(attempts).values(queuedAttempt);

      // Update task status
      await db.update(tasks)
        .set({ status: "in_progress", updatedAt: new Date() })
        .where(eq(tasks.id, taskId));

      // Emit queued status
      emitAttemptStatus({ attemptId, status: "queued" });

      return NextResponse.json({ attemptId, status: "queued" });
    }

    // Create unique workspace directory on host
    const workspaceBase = process.env.WORKSPACE_BASE || "/tmp/vibe-workspaces";
    const workspacePath = join(workspaceBase, attemptId);

    try {
      mkdirSync(workspacePath, { recursive: true });
    } catch (error: any) {
      console.error("Failed to create workspace:", error);
    }

    // Git worktree setup (if repoPath exists)
    let branchName: string | null = null;
    let baseCommit: string | null = null;

    if (project.repoPath && existsSync(project.repoPath)) {
      try {
        // Get base commit
        baseCommit = execSync(`git -C "${project.repoPath}" rev-parse HEAD`, { encoding: "utf-8" }).trim();

        // Create branch name
        branchName = `vibe/task-${taskId}/${attemptShort}`;

        // Create git worktree
        execSync(
          `git -C "${project.repoPath}" worktree add -B "${branchName}" "${workspacePath}" ${project.defaultBranch}`,
          { encoding: "utf-8" }
        );

        console.log(`✅ Created git worktree: ${branchName} at ${workspacePath}`);
      } catch (error: any) {
        console.error("Failed to create git worktree:", error.message);
        // Continue without worktree - will just be empty workspace
      }
    } else {
      console.warn(`⚠️ No valid repoPath for project ${project.id}, running in isolated mode`);
    }

    const attempt = {
      id: attemptId,
      taskId: task.id,
      startedAt: new Date(),
      agent: "Claude Sonnet 4.5",
      baseBranch: project.defaultBranch,
      branchName,
      baseCommit,
      worktreePath: workspacePath,
      status: "running" as const,
      runRequestedBy: userId,
    };

    await db.insert(attempts).values(attempt);

    // Update task status
    await db.update(tasks)
      .set({ status: "in_progress", updatedAt: new Date() })
      .where(eq(tasks.id, taskId));

    // Emit initial status
    emitAttemptStatus({ attemptId, status: "running" });

    // Start runner (async)
    runAttempt({
      attemptId,
      taskId: task.id,
      taskTitle: task.title,
      taskDescription: task.description,
      projectId: project.id,
      projectDefaultBranch: project.defaultBranch,
      branchName,
      baseCommit,
      workspacePath,
      agentName: "Claude Sonnet 4.5",
    });


    return NextResponse.json({ attemptId, status: "running" });
  } catch (error: any) {
    console.error("Error running task:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
