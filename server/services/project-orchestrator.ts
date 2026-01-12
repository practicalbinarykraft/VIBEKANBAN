/**
 * Project Execution Orchestrator
 *
 * Manages sequential task execution within a project
 * Concurrency limit: 1 (MVP)
 */

import { db } from "@/server/db";
import { projects, tasks, attempts } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { selectAgent } from "@/server/agents/agent-selector";
import { getAgent } from "@/server/agents/registry";
import { runAgent } from "@/server/agents/agent-runner";

export async function startProjectExecution(projectId: string) {
  // Update project status to running
  await db
    .update(projects)
    .set({
      executionStatus: 'running',
      executionStartedAt: new Date(),
      executionFinishedAt: null,
    })
    .where(eq(projects.id, projectId));

  // Trigger first tick
  await tickProjectExecution(projectId);
}

export async function pauseProjectExecution(projectId: string) {
  await db
    .update(projects)
    .set({ executionStatus: 'paused' })
    .where(eq(projects.id, projectId));
}

export async function resumeProjectExecution(projectId: string) {
  await db
    .update(projects)
    .set({ executionStatus: 'running' })
    .where(eq(projects.id, projectId));

  await tickProjectExecution(projectId);
}

export async function tickProjectExecution(projectId: string) {
  // Get project
  const project = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .get();

  if (!project || project.executionStatus !== 'running') {
    return; // Not running, skip
  }

  // Check if there's already a running task
  const projectTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.projectId, projectId))
    .all();

  const runningTask = projectTasks.find(t => t.status === 'in_progress');
  if (runningTask) {
    // Already has a running task, wait for it to complete
    return;
  }

  // Find next task to run (first 'todo' task by createdAt, then by id for determinism)
  const nextTask = projectTasks
    .filter(t => t.status === 'todo')
    .sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (aTime !== bTime) return aTime - bTime;
      // Secondary sort by id for deterministic ordering when timestamps match
      return a.id.localeCompare(b.id);
    })[0];

  if (!nextTask) {
    // No more tasks to run, mark project as completed
    await db
      .update(projects)
      .set({
        executionStatus: 'completed',
        executionFinishedAt: new Date(),
      })
      .where(eq(projects.id, projectId));
    return;
  }

  // Start next task: move to in_progress
  await db
    .update(tasks)
    .set({ status: 'in_progress', updatedAt: new Date() })
    .where(eq(tasks.id, nextTask.id));

  // Select agent for this task
  const agentRole = selectAgent({
    id: nextTask.id,
    title: nextTask.title,
    description: nextTask.description,
    status: nextTask.status,
  });
  const agentConfig = getAgent(agentRole);

  // Run agent to generate code and PR
  const agentResult = await runAgent(
    {
      id: nextTask.id,
      title: nextTask.title,
      description: nextTask.description,
      status: nextTask.status,
    },
    agentConfig,
    {
      projectId,
      projectName: project.name || 'Unnamed Project',
    }
  );

  // Create attempt for this task
  const attemptId = randomUUID();
  const now = new Date();

  await db.insert(attempts).values({
    id: attemptId,
    taskId: nextTask.id,
    queuedAt: now,
    startedAt: now,
    finishedAt: null,
    status: 'running',
    agent: agentConfig.name,
    baseBranch: 'main',
    branchName: `attempt/${attemptId.slice(0, 8)}`,
    baseCommit: 'abc123def456',
    headCommit: null,
    worktreePath: `/tmp/worktree-${attemptId}`,
    mergeStatus: 'not_merged',
    exitCode: null,
    prNumber: agentResult.prNumber || null,
    prUrl: agentResult.prNumber ? `https://github.com/test-org/test-repo/pull/${agentResult.prNumber}` : null,
    prStatus: agentResult.prNumber ? 'open' : null,
  });

  console.log(`[Orchestrator] Started task ${nextTask.id} with ${agentConfig.name} (attempt ${attemptId}) for project ${projectId}`);
}

export async function onAttemptFinished(
  projectId: string,
  taskId: string,
  attemptId: string,
  success: boolean
) {
  // Get task
  const task = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .get();

  if (!task) return;

  // Move task to next status based on success
  let newStatus: 'in_review' | 'done' | 'todo' = 'in_review';
  if (success) {
    // If successful, move to in_review (for PR flow)
    // In a full implementation, this could check if PR is needed
    newStatus = 'in_review';
  } else {
    // If failed, keep in todo for retry (or mark as failed)
    newStatus = 'todo';
  }

  await db
    .update(tasks)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(tasks.id, taskId));

  // Trigger next tick to start next task
  await tickProjectExecution(projectId);
}
