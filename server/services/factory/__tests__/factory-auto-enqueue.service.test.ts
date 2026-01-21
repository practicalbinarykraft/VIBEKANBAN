/** Factory Auto-Enqueue Service Tests (PR-106) - TDD */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  autoEnqueueTask,
  type AutoEnqueueInput,
  type AutoEnqueueDeps,
} from "../factory-auto-enqueue.service";

function createMockDeps(overrides: Partial<AutoEnqueueDeps> = {}): AutoEnqueueDeps {
  return {
    getActiveRun: vi.fn().mockResolvedValue(null),
    isTaskRunnable: vi.fn().mockResolvedValue(true),
    createRun: vi.fn().mockResolvedValue({ ok: true, runId: "run-new" }),
    createQueuedAttempt: vi.fn().mockResolvedValue({ ok: true, attemptId: "att-1" }),
    startWorker: vi.fn().mockResolvedValue({ started: true }),
    hasExistingAttempt: vi.fn().mockResolvedValue(false),
    ...overrides,
  };
}

describe("factory-auto-enqueue.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("when no active run exists", () => {
    it("creates a new run and enqueues task", async () => {
      const createRun = vi.fn().mockResolvedValue({ ok: true, runId: "run-123" });
      const createQueuedAttempt = vi.fn().mockResolvedValue({ ok: true, attemptId: "att-1" });
      const startWorker = vi.fn().mockResolvedValue({ started: true });

      const deps = createMockDeps({
        getActiveRun: vi.fn().mockResolvedValue(null),
        createRun,
        createQueuedAttempt,
        startWorker,
      });

      const input: AutoEnqueueInput = {
        projectId: "proj-1",
        taskId: "task-1",
        reason: "status_change",
      };

      const result = await autoEnqueueTask(input, deps);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.runId).toBe("run-123");
        expect(result.enqueued).toBe(true);
      }
      expect(createRun).toHaveBeenCalledWith("proj-1");
      expect(createQueuedAttempt).toHaveBeenCalledWith("task-1", "run-123");
      expect(startWorker).toHaveBeenCalledWith("proj-1", "run-123");
    });
  });

  describe("when active run exists", () => {
    it("enqueues to existing run without creating new one", async () => {
      const createRun = vi.fn();
      const createQueuedAttempt = vi.fn().mockResolvedValue({ ok: true, attemptId: "att-2" });

      const deps = createMockDeps({
        getActiveRun: vi.fn().mockResolvedValue({ runId: "run-existing", status: "running" }),
        createRun,
        createQueuedAttempt,
      });

      const input: AutoEnqueueInput = {
        projectId: "proj-1",
        taskId: "task-2",
        reason: "status_change",
      };

      const result = await autoEnqueueTask(input, deps);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.runId).toBe("run-existing");
        expect(result.enqueued).toBe(true);
      }
      expect(createRun).not.toHaveBeenCalled();
      expect(createQueuedAttempt).toHaveBeenCalledWith("task-2", "run-existing");
    });

    it("does not start worker when run already active", async () => {
      const startWorker = vi.fn();

      const deps = createMockDeps({
        getActiveRun: vi.fn().mockResolvedValue({ runId: "run-existing", status: "running" }),
        startWorker,
      });

      const input: AutoEnqueueInput = {
        projectId: "proj-1",
        taskId: "task-1",
        reason: "status_change",
      };

      await autoEnqueueTask(input, deps);

      expect(startWorker).not.toHaveBeenCalled();
    });
  });

  describe("when task not runnable", () => {
    it("returns error without enqueueing", async () => {
      const createQueuedAttempt = vi.fn();

      const deps = createMockDeps({
        isTaskRunnable: vi.fn().mockResolvedValue(false),
        createQueuedAttempt,
      });

      const input: AutoEnqueueInput = {
        projectId: "proj-1",
        taskId: "task-done",
        reason: "status_change",
      };

      const result = await autoEnqueueTask(input, deps);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errorCode).toBe("TASK_NOT_RUNNABLE");
      }
      expect(createQueuedAttempt).not.toHaveBeenCalled();
    });
  });

  describe("deduplication", () => {
    it("returns enqueued:false when task already has queued/running attempt", async () => {
      const createQueuedAttempt = vi.fn();

      const deps = createMockDeps({
        getActiveRun: vi.fn().mockResolvedValue({ runId: "run-1", status: "running" }),
        hasExistingAttempt: vi.fn().mockResolvedValue(true),
        createQueuedAttempt,
      });

      const input: AutoEnqueueInput = {
        projectId: "proj-1",
        taskId: "task-already-queued",
        reason: "status_change",
      };

      const result = await autoEnqueueTask(input, deps);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.enqueued).toBe(false);
        expect(result.runId).toBe("run-1");
      }
      expect(createQueuedAttempt).not.toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("returns error when createRun fails", async () => {
      const deps = createMockDeps({
        getActiveRun: vi.fn().mockResolvedValue(null),
        createRun: vi.fn().mockResolvedValue({ ok: false, error: "DB error" }),
      });

      const input: AutoEnqueueInput = {
        projectId: "proj-1",
        taskId: "task-1",
        reason: "status_change",
      };

      const result = await autoEnqueueTask(input, deps);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errorCode).toBe("RUN_CREATION_FAILED");
      }
    });
  });
});
