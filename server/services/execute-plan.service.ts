/**
 * Execute Plan Service (PR-42)
 *
 * Takes tasks from plan_artifact, creates git worktrees, and runs Claude Code.
 * Supports mock and real execution modes.
 *
 * Key features:
 * - Idempotent: second call with same planId returns existing data
 * - Task deduplication via stable key in description
 * - Status flow: approved → executing → completed
 */

import { db } from "@/server/db";
import { planArtifacts, tasks, attempts, projects, councilThreads } from "@/server/db/schema";
import { eq, and, like } from "drizzle-orm";
import { randomUUID } from "crypto";
import { mkdirSync, existsSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import { runAttempt } from "./attempt-runner";
import { hasAvailableSlot, scheduleProject } from "./attempt-queue";
import { emitAttemptStatus } from "./events-hub";

export type ExecutionMode = "mock" | "real";

export interface PlanTaskItem {
  title: string;
  description: string;
  type: "backend" | "frontend" | "qa" | "design";
  estimate: "S" | "M" | "L";
}

export interface ExecutePlanOptions {
  planId: string;
  projectId: string;
  userId?: string;
}

export interface ExecutePlanResult {
  success: boolean;
  createdTaskIds: string[];
  attemptIds: string[];
  error?: string;
  alreadyExecuted?: boolean;
}

/**
 * Determine execution mode from environment
 */
export function getExecutionMode(): ExecutionMode {
  if (process.env.EXECUTION_MODE === "mock") return "mock";
  if (process.env.EXECUTION_MODE === "real") return "real";
  if (process.env.PLAYWRIGHT === "1") return "mock";
  if (process.env.NODE_ENV === "test") return "mock";
  return "real";
}

/**
 * Check if feature flag is enabled
 */
export function isExecutePlanV2Enabled(): boolean {
  return process.env.FEATURE_EXECUTE_PLAN_V2 === "1";
}

/**
 * Generate stable key for task deduplication
 * Pattern: [plan:{planId}:idx:{index}]
 */
function getStableKey(planId: string, index: number): string {
  return `[plan:${planId}:idx:${index}]`;
}

/**
 * Find existing tasks created by this plan execution
 */
async function findExistingTasksForPlan(
  projectId: string,
  planId: string,
  taskCount: number
): Promise<Map<number, { id: string; hasAttempt: boolean }>> {
  const result = new Map<number, { id: string; hasAttempt: boolean }>();

  for (let i = 0; i < taskCount; i++) {
    const stableKey = getStableKey(planId, i);
    const existing = await db
      .select()
      .from(tasks)
      .where(
        and(eq(tasks.projectId, projectId), like(tasks.description, `%${stableKey}%`))
      )
      .get();

    if (existing) {
      // Check if task has an attempt
      const attempt = await db
        .select()
        .from(attempts)
        .where(eq(attempts.taskId, existing.id))
        .get();

      result.set(i, { id: existing.id, hasAttempt: !!attempt });
    }
  }

  return result;
}

/**
 * Get all task and attempt IDs for a completed/executing plan
 */
async function getExistingExecutionData(
  projectId: string,
  planId: string,
  taskCount: number
): Promise<{ taskIds: string[]; attemptIds: string[] }> {
  const taskIds: string[] = [];
  const attemptIds: string[] = [];

  for (let i = 0; i < taskCount; i++) {
    const stableKey = getStableKey(planId, i);
    const task = await db
      .select()
      .from(tasks)
      .where(
        and(eq(tasks.projectId, projectId), like(tasks.description, `%${stableKey}%`))
      )
      .get();

    if (task) {
      taskIds.push(task.id);
      const attempt = await db
        .select()
        .from(attempts)
        .where(eq(attempts.taskId, task.id))
        .get();
      if (attempt) {
        attemptIds.push(attempt.id);
      }
    }
  }

  return { taskIds, attemptIds };
}

/**
 * Execute a plan by:
 * 1. Loading tasks from plan_artifact
 * 2. Creating kanban tasks (with deduplication)
 * 3. Creating attempts with git worktrees
 * 4. Running Claude Code (or mock)
 *
 * IDEMPOTENT: Second call returns existing data without creating duplicates.
 */
export async function executePlan(options: ExecutePlanOptions): Promise<ExecutePlanResult> {
  const { planId, projectId, userId } = options;
  const mode = getExecutionMode();

  console.log(`[ExecutePlan] Starting execution for plan ${planId} in ${mode} mode`);

  // 1. Load plan artifact
  const plan = await db.select().from(planArtifacts).where(eq(planArtifacts.id, planId)).get();
  if (!plan) {
    return { success: false, createdTaskIds: [], attemptIds: [], error: "Plan not found" };
  }

  // 2. Parse tasks to get count
  let planTasks: PlanTaskItem[];
  try {
    planTasks = JSON.parse(plan.tasks);
  } catch {
    return { success: false, createdTaskIds: [], attemptIds: [], error: "Invalid plan tasks JSON" };
  }

  if (!planTasks.length) {
    return { success: false, createdTaskIds: [], attemptIds: [], error: "Plan has no tasks" };
  }

  // 3. IDEMPOTENCY GUARD: Check if already executed
  if (plan.status === "executing" || plan.status === "completed") {
    console.log(`[ExecutePlan] Plan ${planId} already ${plan.status}, returning existing data`);
    const existing = await getExistingExecutionData(projectId, planId, planTasks.length);
    return {
      success: true,
      createdTaskIds: existing.taskIds,
      attemptIds: existing.attemptIds,
      alreadyExecuted: true,
    };
  }

  // 4. Verify plan status is 'approved'
  if (plan.status !== "approved") {
    return {
      success: false,
      createdTaskIds: [],
      attemptIds: [],
      error: `Plan status is '${plan.status}', expected 'approved'`,
    };
  }

  // 5. Load project
  const project = await db.select().from(projects).where(eq(projects.id, projectId)).get();
  if (!project) {
    return { success: false, createdTaskIds: [], attemptIds: [], error: "Project not found" };
  }

  // 6. Set plan status to 'executing'
  await db.update(planArtifacts).set({ status: "executing" }).where(eq(planArtifacts.id, planId));

  // 7. Find existing tasks for deduplication
  const existingTasks = await findExistingTasksForPlan(projectId, planId, planTasks.length);

  const createdTaskIds: string[] = [];
  const attemptIds: string[] = [];

  // 8. Create tasks and queue attempts
  for (let i = 0; i < planTasks.length; i++) {
    const planTask = planTasks[i];
    const stableKey = getStableKey(planId, i);
    let taskId: string;

    // Check if task already exists
    const existing = existingTasks.get(i);
    if (existing) {
      taskId = existing.id;
      console.log(`[ExecutePlan] Reusing existing task ${taskId} for index ${i}`);
    } else {
      // Create new kanban task with stable key in description
      taskId = randomUUID();
      const descriptionWithKey = `${planTask.description}\n\n${stableKey}`;

      await db.insert(tasks).values({
        id: taskId,
        projectId,
        title: planTask.title,
        description: descriptionWithKey,
        status: "todo",
        order: i,
        estimate: planTask.estimate,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`[ExecutePlan] Created new task ${taskId} for index ${i}`);
    }

    createdTaskIds.push(taskId);

    // Create attempt if task doesn't have one yet
    if (!existing?.hasAttempt) {
      const attemptResult = await createAttemptForTask({
        taskId,
        task: planTask,
        project,
        userId,
        mode,
      });

      if (attemptResult.attemptId) {
        attemptIds.push(attemptResult.attemptId);
      }
    } else {
      // Task already has attempt, find and add it
      const existingAttempt = await db
        .select()
        .from(attempts)
        .where(eq(attempts.taskId, taskId))
        .get();
      if (existingAttempt) {
        attemptIds.push(existingAttempt.id);
      }
    }
  }

  // 9. Update plan status to 'completed'
  await db.update(planArtifacts).set({ status: "completed" }).where(eq(planArtifacts.id, planId));

  // 10. Update thread status to 'completed'
  await db
    .update(councilThreads)
    .set({ status: "completed" })
    .where(eq(councilThreads.id, plan.threadId));

  // 11. Trigger queue scheduler
  await scheduleProject(projectId);

  console.log(`[ExecutePlan] Completed: ${createdTaskIds.length} tasks, ${attemptIds.length} attempts`);

  return {
    success: true,
    createdTaskIds,
    attemptIds,
  };
}

interface CreateAttemptOptions {
  taskId: string;
  task: PlanTaskItem;
  project: typeof projects.$inferSelect;
  userId?: string;
  mode: ExecutionMode;
}

/**
 * Create an attempt for a single task
 * Follows pattern from app/api/tasks/[id]/run/route.ts
 */
async function createAttemptForTask(
  options: CreateAttemptOptions
): Promise<{ attemptId: string | null }> {
  const { taskId, task, project, userId, mode } = options;

  const attemptId = randomUUID();
  const attemptShort = attemptId.slice(0, 8);

  // Check slot availability
  const slotAvailable = await hasAvailableSlot(project.id);

  // Setup workspace
  const workspaceBase = process.env.WORKSPACE_BASE || "/tmp/vibe-workspaces";
  const workspacePath = join(workspaceBase, attemptId);

  // Create workspace directory
  try {
    mkdirSync(workspacePath, { recursive: true });
  } catch (error: any) {
    console.error(`[ExecutePlan] Failed to create workspace: ${error.message}`);
  }

  // Git worktree setup
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

      console.log(`[ExecutePlan] Created git worktree: ${branchName}`);
    } catch (error: any) {
      console.error(`[ExecutePlan] Failed to create worktree: ${error.message}`);
    }
  }

  // Determine initial status
  const initialStatus = slotAvailable ? "running" : "queued";

  // Create attempt record
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

  // Update task status
  await db
    .update(tasks)
    .set({ status: "in_progress", updatedAt: new Date() })
    .where(eq(tasks.id, taskId));

  // Emit status
  emitAttemptStatus({ attemptId, status: initialStatus });

  // If slot available and mode is real, start runner
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
    // In mock mode, simulate quick completion
    await simulateMockExecution(attemptId, taskId, project.id);
  }

  return { attemptId };
}

/**
 * Simulate mock execution for testing
 */
async function simulateMockExecution(
  attemptId: string,
  taskId: string,
  projectId: string
): Promise<void> {
  // Wait briefly to simulate work
  await new Promise((resolve) => setTimeout(resolve, 50));

  // Mark as completed
  await db
    .update(attempts)
    .set({
      finishedAt: new Date(),
      status: "completed",
      exitCode: 0,
    })
    .where(eq(attempts.id, attemptId));

  // Update task status to done (mock completes immediately)
  await db.update(tasks).set({ status: "done", updatedAt: new Date() }).where(eq(tasks.id, taskId));

  emitAttemptStatus({ attemptId, status: "completed", exitCode: 0 });

  // Trigger next in queue
  await scheduleProject(projectId);
}
