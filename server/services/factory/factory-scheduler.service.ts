/** Factory Scheduler Service (PR-82, PR-85, PR-86) - Queue-based parallel execution */
import type { FactoryRunResult, FactorySchedulerOptions, AttemptResult } from "@/types/factory";
import { FactoryQueueService, type FactoryQueueDeps } from "./factory-queue.service";
import type { ResumeState } from "./factory-resume.service";

export interface FactorySchedulerDeps {
  getRunnableTasks: (projectId: string) => Promise<string[]>;
  runTaskAttempt: (taskId: string, autopilotRunId: string) => Promise<AttemptResult>;
  getRunStatus: (runId: string) => Promise<string>;
  markRunCompleted: (runId: string) => Promise<void>;
  markRunFailed: (runId: string, error?: string) => Promise<void>;
}

interface SchedulerState {
  stopped: boolean;
  tickScheduled: boolean;
  pendingCompletions: Promise<void>[];
}

/**
 * Run factory scheduler with queue-based parallel execution
 * Uses tick loop pattern for strict maxParallel enforcement
 */
export async function runFactoryScheduler(
  options: FactorySchedulerOptions,
  deps: FactorySchedulerDeps
): Promise<FactoryRunResult> {
  const { projectId, autopilotRunId, maxParallel } = options;
  const queueDeps: FactoryQueueDeps = { now: () => new Date() };
  const queue = new FactoryQueueService(queueDeps);

  // Get tasks and initialize queue
  const taskIds = await deps.getRunnableTasks(projectId);
  queue.resume({ runId: autopilotRunId, queuedTaskIds: taskIds, runningTaskIds: [], maxParallel });

  const attemptIds: string[] = [];
  let completed = 0;
  let failed = 0;
  let cancelled = 0;
  let started = 0;
  const state: SchedulerState = { stopped: false, tickScheduled: false, pendingCompletions: [] };

  // Handle task completion
  const onTaskComplete = (taskId: string, result: AttemptResult) => {
    queue.markFinished(taskId);
    if (result.attemptId) attemptIds.push(result.attemptId);
    if (result.success) completed++;
    else failed++;
    // Schedule next tick via microtask
    scheduleTick();
  };

  // Run a single tick: start tasks up to available slots
  const tick = async () => {
    state.tickScheduled = false;
    if (state.stopped) return;

    // Check if run was cancelled
    const runStatus = await deps.getRunStatus(autopilotRunId);
    if (runStatus === "cancelled") {
      state.stopped = true;
      const queueState = queue.getState();
      cancelled += queueState.queued.length;
      queue.clearAll();
      return;
    }

    // Start tasks while slots available
    let taskId = queue.popNext();
    while (taskId !== null) {
      const currentTaskId = taskId;
      queue.markRunning(currentTaskId);
      started++;

      // Start attempt async
      const completion = deps.runTaskAttempt(currentTaskId, autopilotRunId)
        .catch((err): AttemptResult => ({
          taskId: currentTaskId,
          attemptId: null,
          success: false,
          error: err?.message || "Unknown error",
        }))
        .then((result) => onTaskComplete(currentTaskId, result));

      state.pendingCompletions.push(completion);
      taskId = queue.popNext();
    }
  };

  // Schedule tick (deduped via flag)
  const scheduleTick = () => {
    if (state.tickScheduled || state.stopped) return;
    state.tickScheduled = true;
    queueMicrotask(tick);
  };

  // Initial tick
  await tick();

  // Wait for all completions
  while (state.pendingCompletions.length > 0) {
    const batch = state.pendingCompletions.splice(0);
    await Promise.all(batch);
    // After batch completes, run another tick if needed
    if (!state.stopped && queue.hasWork()) {
      await tick();
    }
  }

  // Determine final status and mark run
  if (failed > 0) {
    await deps.markRunFailed(autopilotRunId, `${failed} task(s) failed`);
  } else {
    await deps.markRunCompleted(autopilotRunId);
  }

  return {
    autopilotRunId,
    total: taskIds.length,
    started,
    completed,
    failed,
    cancelled,
    attemptIds,
  };
}

// Singleton queue instance for global access (stop integration)
let globalQueue: FactoryQueueService | null = null;

export function getGlobalQueue(): FactoryQueueService | null {
  return globalQueue;
}

export function setGlobalQueue(queue: FactoryQueueService | null): void {
  globalQueue = queue;
}

// PR-86, PR-92, PR-103: tickOnce for worker mode (non-blocking) with hard-stop
export interface TickOnceDeps {
  getResumeState: (projectId: string) => Promise<ResumeState>;
  runTaskAttempt: (taskId: string, runId: string, agentProfileId?: string) => Promise<AttemptResult>;
}

export interface TickOnceParams {
  projectId: string;
  runId: string;
  maxParallel: number;
  agentProfileId?: string;
}

/**
 * Execute one tick: start tasks up to available slots (non-blocking)
 * Returns immediately after starting tasks, does not wait for completion
 * PR-92: Checks status before starting - returns early if not "running"
 * PR-103: Passes agentProfileId to runTaskAttempt
 */
export async function tickOnce(
  params: TickOnceParams,
  deps: TickOnceDeps
): Promise<void> {
  const { projectId, runId, maxParallel, agentProfileId } = params;

  // Get current state from DB
  const state = await deps.getResumeState(projectId);

  // PR-92: Hard-stop - don't start if run is not running
  if (!state.runId || state.status !== "running") {
    return;
  }

  // Calculate available slots
  const runningCount = state.runningTaskIds.length;
  const availableSlots = Math.max(0, maxParallel - runningCount);

  if (availableSlots === 0 || state.queuedTaskIds.length === 0) {
    return;
  }

  // Start tasks up to available slots (fire-and-forget)
  const tasksToStart = state.queuedTaskIds.slice(0, availableSlots);
  for (const taskId of tasksToStart) {
    // Fire-and-forget: don't await
    deps.runTaskAttempt(taskId, runId, agentProfileId).catch(() => {
      // Errors handled by attempt runner
    });
  }
}
