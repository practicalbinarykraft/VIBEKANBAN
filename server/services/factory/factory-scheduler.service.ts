/** Factory Scheduler Service (PR-82) - Parallel attempt execution */
import type { FactoryRunResult, FactorySchedulerOptions, AttemptResult } from "@/types/factory";

export interface FactorySchedulerDeps {
  getRunnableTasks: (projectId: string) => Promise<string[]>;
  runTaskAttempt: (taskId: string, autopilotRunId: string) => Promise<AttemptResult>;
  getRunStatus: (runId: string) => Promise<string>;
  markRunCompleted: (runId: string) => Promise<void>;
  markRunFailed: (runId: string, error?: string) => Promise<void>;
}

interface InFlightItem {
  taskId: string;
  promise: Promise<AttemptResult>;
}

/**
 * Run factory scheduler with parallel execution (maxParallel concurrent attempts)
 * Uses Promise.race pattern to maintain slot pool
 */
export async function runFactoryScheduler(
  options: FactorySchedulerOptions,
  deps: FactorySchedulerDeps
): Promise<FactoryRunResult> {
  const { projectId, autopilotRunId, maxParallel } = options;

  const taskIds = await deps.getRunnableTasks(projectId);
  const pending = [...taskIds];
  const inFlight = new Map<string, InFlightItem>();
  const attemptIds: string[] = [];
  let completed = 0;
  let failed = 0;
  let cancelled = 0;
  let started = 0;

  // Helper to start a task
  const startTask = (taskId: string): InFlightItem => {
    started++;
    const promise = deps.runTaskAttempt(taskId, autopilotRunId).catch((err): AttemptResult => ({
      taskId,
      attemptId: null,
      success: false,
      error: err?.message || "Unknown error",
    }));
    return { taskId, promise };
  };

  // Main loop: while there are pending tasks or in-flight attempts
  while (pending.length > 0 || inFlight.size > 0) {
    // Check if run was cancelled
    const runStatus = await deps.getRunStatus(autopilotRunId);
    if (runStatus === "cancelled") {
      cancelled += pending.length;
      pending.length = 0;
      // Wait for in-flight to complete
      for (const item of inFlight.values()) {
        const result = await item.promise;
        if (result.attemptId) attemptIds.push(result.attemptId);
        if (result.success) completed++;
        else failed++;
      }
      inFlight.clear();
      break;
    }

    // Fill slots up to maxParallel
    while (inFlight.size < maxParallel && pending.length > 0) {
      const taskId = pending.shift()!;
      const item = startTask(taskId);
      inFlight.set(taskId, item);
    }

    // If nothing in flight, we're done
    if (inFlight.size === 0) break;

    // Wait for one to complete using Promise.race
    const entries = Array.from(inFlight.entries());
    const promises = entries.map(([taskId, item]) =>
      item.promise.then((result) => ({ taskId, result }))
    );
    const { taskId: finishedTaskId, result } = await Promise.race(promises);

    // Remove from in-flight
    inFlight.delete(finishedTaskId);

    // Record result
    if (result.attemptId) attemptIds.push(result.attemptId);
    if (result.success) completed++;
    else failed++;
  }

  // Determine final status and mark run
  const total = taskIds.length;
  if (failed > 0) {
    await deps.markRunFailed(autopilotRunId, `${failed} task(s) failed`);
  } else {
    await deps.markRunCompleted(autopilotRunId);
  }

  return { autopilotRunId, total, started, completed, failed, cancelled, attemptIds };
}
