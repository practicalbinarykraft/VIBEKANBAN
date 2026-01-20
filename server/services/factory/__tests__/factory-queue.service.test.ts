/** Factory Queue Service Tests (PR-85) - TDD */
import { describe, it, expect, beforeEach } from "vitest";
import { FactoryQueueService, type FactoryQueueDeps } from "../factory-queue.service";

function createDeps(): FactoryQueueDeps {
  return { now: () => new Date("2025-01-01T00:00:00Z") };
}

describe("FactoryQueueService", () => {
  let queue: FactoryQueueService;
  let deps: FactoryQueueDeps;

  beforeEach(() => {
    deps = createDeps();
    queue = new FactoryQueueService(deps);
    queue.resume({ runId: "run-1", queuedTaskIds: [], runningTaskIds: [], maxParallel: 2 });
  });

  describe("enqueue", () => {
    it("adds task to queue", () => {
      const result = queue.enqueue("task-1");
      expect(result.accepted).toBe(true);
      expect(queue.getState().queued).toContain("task-1");
    });

    it("rejects duplicate when already queued", () => {
      queue.enqueue("task-1");
      const result = queue.enqueue("task-1");
      expect(result.accepted).toBe(false);
      expect(result.reason).toBe("DUPLICATE");
      expect(queue.getState().queued).toHaveLength(1);
    });

    it("rejects duplicate when already running", () => {
      queue.enqueue("task-1");
      queue.popNext();
      queue.markRunning("task-1");
      const result = queue.enqueue("task-1");
      expect(result.accepted).toBe(false);
      expect(result.reason).toBe("DUPLICATE");
    });
  });

  describe("popNext", () => {
    it("returns null when queue is empty", () => {
      expect(queue.popNext()).toBeNull();
    });

    it("returns null when running equals maxParallel", () => {
      queue.enqueue("task-1");
      queue.enqueue("task-2");
      queue.enqueue("task-3");
      // Pop and mark running up to maxParallel (2)
      const t1 = queue.popNext();
      queue.markRunning(t1!);
      const t2 = queue.popNext();
      queue.markRunning(t2!);
      // Now at max, should return null
      expect(queue.popNext()).toBeNull();
    });

    it("returns next in FIFO order", () => {
      queue.enqueue("task-1");
      queue.enqueue("task-2");
      queue.enqueue("task-3");
      expect(queue.popNext()).toBe("task-1");
      expect(queue.popNext()).toBe("task-2");
    });

    it("removes task from queued on pop", () => {
      queue.enqueue("task-1");
      queue.popNext();
      expect(queue.getState().queued).not.toContain("task-1");
    });
  });

  describe("markRunning", () => {
    it("adds task to running set", () => {
      queue.enqueue("task-1");
      queue.popNext();
      queue.markRunning("task-1");
      expect(queue.getState().running).toContain("task-1");
    });

    it("increases running count", () => {
      queue.enqueue("task-1");
      queue.popNext();
      expect(queue.getState().counts.running).toBe(0);
      queue.markRunning("task-1");
      expect(queue.getState().counts.running).toBe(1);
    });
  });

  describe("markFinished", () => {
    it("removes task from running set", () => {
      queue.enqueue("task-1");
      queue.popNext();
      queue.markRunning("task-1");
      queue.markFinished("task-1");
      expect(queue.getState().running).not.toContain("task-1");
    });

    it("frees slot for next task", () => {
      queue.enqueue("task-1");
      queue.enqueue("task-2");
      queue.enqueue("task-3");
      // Fill both slots
      const t1 = queue.popNext();
      queue.markRunning(t1!);
      const t2 = queue.popNext();
      queue.markRunning(t2!);
      // At max, can't pop
      expect(queue.popNext()).toBeNull();
      // Free a slot
      queue.markFinished(t1!);
      // Now can pop
      expect(queue.popNext()).toBe("task-3");
    });
  });

  describe("resume", () => {
    it("restores queued task IDs", () => {
      const freshQueue = new FactoryQueueService(deps);
      freshQueue.resume({
        runId: "run-2",
        queuedTaskIds: ["t1", "t2"],
        runningTaskIds: [],
        maxParallel: 3,
      });
      expect(freshQueue.getState().queued).toEqual(["t1", "t2"]);
    });

    it("restores running task IDs", () => {
      const freshQueue = new FactoryQueueService(deps);
      freshQueue.resume({
        runId: "run-2",
        queuedTaskIds: [],
        runningTaskIds: ["t3", "t4"],
        maxParallel: 3,
      });
      expect(freshQueue.getState().running).toEqual(["t3", "t4"]);
    });

    it("restores maxParallel setting", () => {
      const freshQueue = new FactoryQueueService(deps);
      freshQueue.resume({
        runId: "run-2",
        queuedTaskIds: [],
        runningTaskIds: [],
        maxParallel: 5,
      });
      expect(freshQueue.getState().maxParallel).toBe(5);
    });

    it("clears previous state on resume", () => {
      queue.enqueue("old-task");
      queue.resume({
        runId: "run-2",
        queuedTaskIds: ["new-task"],
        runningTaskIds: [],
        maxParallel: 2,
      });
      expect(queue.getState().queued).toEqual(["new-task"]);
      expect(queue.getState().queued).not.toContain("old-task");
    });
  });

  describe("getState", () => {
    it("returns correct counts", () => {
      queue.enqueue("task-1");
      queue.enqueue("task-2");
      queue.enqueue("task-3");
      queue.popNext();
      queue.markRunning("task-1");
      const state = queue.getState();
      expect(state.counts.queued).toBe(2);
      expect(state.counts.running).toBe(1);
    });
  });

  describe("clearAll", () => {
    it("clears queue and running", () => {
      queue.enqueue("task-1");
      queue.enqueue("task-2");
      queue.popNext();
      queue.markRunning("task-1");
      queue.clearAll();
      const state = queue.getState();
      expect(state.queued).toHaveLength(0);
      expect(state.running).toHaveLength(0);
    });
  });
});
