/** Factory Scheduler Service Tests (PR-82, PR-85, PR-86) - TDD */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { runFactoryScheduler, tickOnce, FactorySchedulerDeps, TickOnceDeps } from "../factory-scheduler.service";

function createMockDeps(overrides: Partial<FactorySchedulerDeps> = {}): FactorySchedulerDeps {
  return {
    getRunnableTasks: vi.fn().mockResolvedValue([]),
    runTaskAttempt: vi.fn().mockResolvedValue({ attemptId: "att-1", success: true }),
    getRunStatus: vi.fn().mockResolvedValue("running"),
    markRunCompleted: vi.fn().mockResolvedValue(undefined),
    markRunFailed: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("runFactoryScheduler", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("maxParallel=2 with 5 tasks → never more than 2 concurrent", async () => {
    const concurrent: number[] = [];
    let currentConcurrent = 0;
    const deps = createMockDeps({
      getRunnableTasks: vi.fn().mockResolvedValue(["t1", "t2", "t3", "t4", "t5"]),
      runTaskAttempt: vi.fn().mockImplementation(async (taskId: string) => {
        currentConcurrent++;
        concurrent.push(currentConcurrent);
        await new Promise((r) => setTimeout(r, 10));
        currentConcurrent--;
        return { attemptId: `att-${taskId}`, success: true };
      }),
    });
    await runFactoryScheduler({ projectId: "p1", autopilotRunId: "run1", maxParallel: 2 }, deps);
    expect(Math.max(...concurrent)).toBeLessThanOrEqual(2);
    expect(deps.runTaskAttempt).toHaveBeenCalledTimes(5);
  });

  it("empty task list → started=0, run=COMPLETED", async () => {
    const deps = createMockDeps({ getRunnableTasks: vi.fn().mockResolvedValue([]) });
    const result = await runFactoryScheduler(
      { projectId: "p1", autopilotRunId: "run1", maxParallel: 3 },
      deps
    );
    expect(result.started).toBe(0);
    expect(result.completed).toBe(0);
    expect(deps.markRunCompleted).toHaveBeenCalled();
  });

  it("one task fails → result FAILED, but other tasks were started/awaited", async () => {
    const deps = createMockDeps({
      getRunnableTasks: vi.fn().mockResolvedValue(["t1", "t2", "t3"]),
      runTaskAttempt: vi.fn().mockImplementation(async (taskId: string) => {
        if (taskId === "t2") return { attemptId: "att-t2", success: false, error: "fail" };
        return { attemptId: `att-${taskId}`, success: true };
      }),
    });
    const result = await runFactoryScheduler(
      { projectId: "p1", autopilotRunId: "run1", maxParallel: 3 },
      deps
    );
    expect(result.failed).toBe(1);
    expect(result.completed).toBe(2);
    expect(deps.markRunFailed).toHaveBeenCalled();
    expect(deps.runTaskAttempt).toHaveBeenCalledTimes(3);
  });

  it("error on attempt start (throw) → counted as failed, scheduler continues", async () => {
    const deps = createMockDeps({
      getRunnableTasks: vi.fn().mockResolvedValue(["t1", "t2", "t3"]),
      runTaskAttempt: vi.fn().mockImplementation(async (taskId: string) => {
        if (taskId === "t2") throw new Error("runner crash");
        return { attemptId: `att-${taskId}`, success: true };
      }),
    });
    const result = await runFactoryScheduler(
      { projectId: "p1", autopilotRunId: "run1", maxParallel: 2 },
      deps
    );
    expect(result.failed).toBe(1);
    expect(result.completed).toBe(2);
    expect(result.started).toBe(3);
    expect(deps.runTaskAttempt).toHaveBeenCalledTimes(3);
  });

  it("if run status becomes cancelled → no new attempts start", async () => {
    let callCount = 0;
    const deps = createMockDeps({
      getRunnableTasks: vi.fn().mockResolvedValue(["t1", "t2", "t3", "t4"]),
      runTaskAttempt: vi.fn().mockImplementation(async (taskId: string) => {
        callCount++;
        await new Promise((r) => setTimeout(r, 5));
        return { attemptId: `att-${taskId}`, success: true };
      }),
      getRunStatus: vi.fn().mockImplementation(async () => {
        return callCount >= 2 ? "cancelled" : "running";
      }),
    });
    const result = await runFactoryScheduler(
      { projectId: "p1", autopilotRunId: "run1", maxParallel: 1 },
      deps
    );
    expect(result.cancelled).toBeGreaterThan(0);
    expect(result.started).toBeLessThan(4);
  });

  it("collects attemptIds correctly (all started)", async () => {
    const deps = createMockDeps({
      getRunnableTasks: vi.fn().mockResolvedValue(["t1", "t2", "t3"]),
      runTaskAttempt: vi.fn().mockImplementation(async (taskId: string) => {
        return { attemptId: `att-${taskId}`, success: true };
      }),
    });
    const result = await runFactoryScheduler(
      { projectId: "p1", autopilotRunId: "run1", maxParallel: 3 },
      deps
    );
    expect(result.attemptIds).toHaveLength(3);
    expect(result.attemptIds).toContain("att-t1");
    expect(result.attemptIds).toContain("att-t2");
    expect(result.attemptIds).toContain("att-t3");
  });

  it("race correctly frees slot and starts next task", async () => {
    const startOrder: string[] = [];
    const endOrder: string[] = [];
    const deps = createMockDeps({
      getRunnableTasks: vi.fn().mockResolvedValue(["t1", "t2", "t3", "t4"]),
      runTaskAttempt: vi.fn().mockImplementation(async (taskId: string) => {
        startOrder.push(taskId);
        const delay = taskId === "t1" ? 30 : taskId === "t2" ? 10 : 5;
        await new Promise((r) => setTimeout(r, delay));
        endOrder.push(taskId);
        return { attemptId: `att-${taskId}`, success: true };
      }),
    });
    await runFactoryScheduler(
      { projectId: "p1", autopilotRunId: "run1", maxParallel: 2 },
      deps
    );
    expect(startOrder.slice(0, 2)).toEqual(["t1", "t2"]);
    expect(endOrder[0]).toBe("t2");
    expect(deps.runTaskAttempt).toHaveBeenCalledTimes(4);
  });

  it("handles null attemptId from failed attempt", async () => {
    const deps = createMockDeps({
      getRunnableTasks: vi.fn().mockResolvedValue(["t1"]),
      runTaskAttempt: vi.fn().mockResolvedValue({ attemptId: null, success: false, error: "budget" }),
    });
    const result = await runFactoryScheduler(
      { projectId: "p1", autopilotRunId: "run1", maxParallel: 1 },
      deps
    );
    expect(result.failed).toBe(1);
    expect(result.attemptIds).toHaveLength(0);
  });
});

function createTickOnceDeps(overrides: Partial<TickOnceDeps> = {}): TickOnceDeps {
  return {
    getResumeState: vi.fn().mockResolvedValue({
      runId: "run-1", status: "running", maxParallel: 3, queuedTaskIds: [], runningTaskIds: [],
    }),
    runTaskAttempt: vi.fn().mockResolvedValue({ attemptId: "att-1", success: true, taskId: "t1" }),
    ...overrides,
  };
}

describe("tickOnce (PR-86)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("respects maxParallel - starts only available slots", async () => {
    const runTaskAttempt = vi.fn().mockImplementation(async (taskId: string) => {
      // Simulate async work (but don't block)
      return { attemptId: `att-${taskId}`, success: true, taskId };
    });
    const deps = createTickOnceDeps({
      getResumeState: vi.fn().mockResolvedValue({
        runId: "run-1", status: "running", maxParallel: 2,
        queuedTaskIds: ["t1", "t2", "t3", "t4"], runningTaskIds: [],
      }),
      runTaskAttempt,
    });

    await tickOnce({ projectId: "p1", runId: "run-1", maxParallel: 2 }, deps);
    // Should start up to maxParallel tasks
    expect(runTaskAttempt).toHaveBeenCalledTimes(2);
  });

  it("returns without waiting for attempt completion", async () => {
    let attemptStarted = false;
    let attemptCompleted = false;
    const runTaskAttempt = vi.fn().mockImplementation(async () => {
      attemptStarted = true;
      await new Promise((r) => setTimeout(r, 100)); // Slow task
      attemptCompleted = true;
      return { attemptId: "att-1", success: true, taskId: "t1" };
    });
    const deps = createTickOnceDeps({
      getResumeState: vi.fn().mockResolvedValue({
        runId: "run-1", status: "running", maxParallel: 1,
        queuedTaskIds: ["t1"], runningTaskIds: [],
      }),
      runTaskAttempt,
    });

    await tickOnce({ projectId: "p1", runId: "run-1", maxParallel: 1 }, deps);
    expect(attemptStarted).toBe(true);
    expect(attemptCompleted).toBe(false); // Should not wait
  });

  it("accounts for already running tasks", async () => {
    const runTaskAttempt = vi.fn().mockResolvedValue({ attemptId: "att-1", success: true, taskId: "t1" });
    const deps = createTickOnceDeps({
      getResumeState: vi.fn().mockResolvedValue({
        runId: "run-1", status: "running", maxParallel: 2,
        queuedTaskIds: ["t3", "t4"], runningTaskIds: ["t1", "t2"], // Already 2 running
      }),
      runTaskAttempt,
    });

    await tickOnce({ projectId: "p1", runId: "run-1", maxParallel: 2 }, deps);
    // Should not start any new tasks (already at max)
    expect(runTaskAttempt).not.toHaveBeenCalled();
  });

  it("does nothing when no queued tasks", async () => {
    const runTaskAttempt = vi.fn();
    const deps = createTickOnceDeps({
      getResumeState: vi.fn().mockResolvedValue({
        runId: "run-1", status: "running", maxParallel: 3,
        queuedTaskIds: [], runningTaskIds: [],
      }),
      runTaskAttempt,
    });

    await tickOnce({ projectId: "p1", runId: "run-1", maxParallel: 3 }, deps);
    expect(runTaskAttempt).not.toHaveBeenCalled();
  });
});
