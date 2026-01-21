/** Factory Hard Stop Tests (PR-92) - TDD */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { FactoryQueueService, type FactoryQueueDeps } from "../factory-queue.service";
import { tickOnce, type TickOnceDeps } from "../factory-scheduler.service";
import type { ResumeState } from "../factory-resume.service";

describe("FactoryQueueService hard-stop", () => {
  let queue: FactoryQueueService;
  const mockDeps: FactoryQueueDeps = { now: () => new Date() };

  beforeEach(() => {
    queue = new FactoryQueueService(mockDeps);
    queue.resume({
      runId: "run-1",
      queuedTaskIds: ["task-1", "task-2", "task-3"],
      runningTaskIds: [],
      maxParallel: 2,
    });
  });

  it("popNext returns tasks when not stopped", () => {
    const task = queue.popNext();
    expect(task).toBe("task-1");
  });

  it("popNext returns null after stop() called", () => {
    queue.stop();
    const task = queue.popNext();
    expect(task).toBeNull();
  });

  it("stop() sets stopped flag true", () => {
    expect(queue.isStopped()).toBe(false);
    queue.stop();
    expect(queue.isStopped()).toBe(true);
  });

  it("stop() called multiple times is idempotent", () => {
    queue.stop();
    queue.stop();
    expect(queue.isStopped()).toBe(true);
  });

  it("queued tasks remain after stop (not cleared)", () => {
    queue.stop();
    const state = queue.getState();
    expect(state.queued).toEqual(["task-1", "task-2", "task-3"]);
  });

  it("running tasks remain after stop (not cleared)", () => {
    const task = queue.popNext();
    queue.markRunning(task!);
    queue.stop();
    const state = queue.getState();
    expect(state.running).toContain("task-1");
  });

  it("enqueue still works after stop (for recovery)", () => {
    queue.stop();
    const result = queue.enqueue("task-new");
    expect(result.accepted).toBe(true);
  });

  it("markFinished still works after stop", () => {
    const task = queue.popNext();
    queue.markRunning(task!);
    queue.stop();
    queue.markFinished(task!);
    expect(queue.getState().running).not.toContain(task);
  });
});

describe("tickOnce hard-stop", () => {
  const createMockDeps = (state: Partial<ResumeState>): TickOnceDeps => ({
    getResumeState: vi.fn().mockResolvedValue({
      runId: "run-1",
      status: "running",
      maxParallel: 3,
      queuedTaskIds: ["task-1", "task-2"],
      runningTaskIds: [],
      ...state,
    }),
    runTaskAttempt: vi.fn().mockResolvedValue({ taskId: "task-1", attemptId: "att-1", success: true }),
  });

  it("starts tasks when status is running", async () => {
    const deps = createMockDeps({ status: "running" });
    await tickOnce({ projectId: "proj-1", runId: "run-1", maxParallel: 3 }, deps);
    expect(deps.runTaskAttempt).toHaveBeenCalledTimes(2);
  });

  it("does NOT start tasks when status is cancelled", async () => {
    const deps = createMockDeps({ status: "cancelled" });
    await tickOnce({ projectId: "proj-1", runId: "run-1", maxParallel: 3 }, deps);
    expect(deps.runTaskAttempt).not.toHaveBeenCalled();
  });

  it("does NOT start tasks when status is completed", async () => {
    const deps = createMockDeps({ status: "completed" });
    await tickOnce({ projectId: "proj-1", runId: "run-1", maxParallel: 3 }, deps);
    expect(deps.runTaskAttempt).not.toHaveBeenCalled();
  });

  it("does NOT start tasks when status is failed", async () => {
    const deps = createMockDeps({ status: "failed" });
    await tickOnce({ projectId: "proj-1", runId: "run-1", maxParallel: 3 }, deps);
    expect(deps.runTaskAttempt).not.toHaveBeenCalled();
  });

  it("does NOT start tasks when no runId", async () => {
    const deps = createMockDeps({ runId: null, queuedTaskIds: ["task-1"] });
    await tickOnce({ projectId: "proj-1", runId: "run-1", maxParallel: 3 }, deps);
    expect(deps.runTaskAttempt).not.toHaveBeenCalled();
  });
});
