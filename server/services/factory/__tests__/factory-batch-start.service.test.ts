/** Factory Batch Start Service Tests (PR-87) - TDD */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  startBatchFactory,
  type BatchStartDeps,
  type BatchStartParams,
} from "../factory-batch-start.service";

function createMockDeps(overrides: Partial<BatchStartDeps> = {}): BatchStartDeps {
  return {
    getTasksByStatus: vi.fn().mockResolvedValue([]),
    getTasksByIds: vi.fn().mockResolvedValue([]),
    isFactoryRunning: vi.fn().mockResolvedValue(false),
    checkBudget: vi.fn().mockResolvedValue({ ok: true }),
    createRun: vi.fn().mockResolvedValue({ ok: true, runId: "run-1" }),
    startWorker: vi.fn().mockResolvedValue({ started: true }),
    ...overrides,
  };
}

describe("startBatchFactory", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe("source: column", () => {
    it("starts factory with tasks from column status", async () => {
      const deps = createMockDeps({
        getTasksByStatus: vi.fn().mockResolvedValue([
          { id: "t1", status: "todo" },
          { id: "t2", status: "todo" },
        ]),
      });
      const params: BatchStartParams = {
        projectId: "p1",
        source: "column",
        columnStatus: "todo",
        maxParallel: 3,
      };
      const result = await startBatchFactory(params, deps);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.taskCount).toBe(2);
      }
      expect(deps.getTasksByStatus).toHaveBeenCalledWith("p1", "todo");
      expect(deps.startWorker).toHaveBeenCalled();
    });

    it("returns error when column is empty", async () => {
      const deps = createMockDeps({
        getTasksByStatus: vi.fn().mockResolvedValue([]),
      });
      const params: BatchStartParams = {
        projectId: "p1",
        source: "column",
        columnStatus: "todo",
        maxParallel: 3,
      };
      const result = await startBatchFactory(params, deps);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("NO_TASKS");
      }
    });
  });

  describe("source: selection", () => {
    it("starts factory with explicitly provided task IDs", async () => {
      const deps = createMockDeps({
        getTasksByIds: vi.fn().mockResolvedValue([
          { id: "t1", status: "todo" },
          { id: "t2", status: "in_progress" },
        ]),
      });
      const params: BatchStartParams = {
        projectId: "p1",
        source: "selection",
        taskIds: ["t1", "t2"],
        maxParallel: 2,
      };
      const result = await startBatchFactory(params, deps);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.taskCount).toBe(2);
      }
      expect(deps.getTasksByIds).toHaveBeenCalledWith(["t1", "t2"]);
    });

    it("returns error when no task IDs provided", async () => {
      const deps = createMockDeps();
      const params: BatchStartParams = {
        projectId: "p1",
        source: "selection",
        taskIds: [],
        maxParallel: 3,
      };
      const result = await startBatchFactory(params, deps);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("NO_TASKS");
      }
    });
  });

  describe("validation", () => {
    it("returns error when factory already running", async () => {
      const deps = createMockDeps({
        isFactoryRunning: vi.fn().mockResolvedValue(true),
        getTasksByStatus: vi.fn().mockResolvedValue([{ id: "t1", status: "todo" }]),
      });
      const params: BatchStartParams = {
        projectId: "p1",
        source: "column",
        columnStatus: "todo",
        maxParallel: 3,
      };
      const result = await startBatchFactory(params, deps);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("ALREADY_RUNNING");
      }
    });

    it("returns error when budget exceeded", async () => {
      const deps = createMockDeps({
        getTasksByStatus: vi.fn().mockResolvedValue([{ id: "t1", status: "todo" }]),
        checkBudget: vi.fn().mockResolvedValue({ ok: false, reason: "BUDGET_EXCEEDED" }),
      });
      const params: BatchStartParams = {
        projectId: "p1",
        source: "column",
        columnStatus: "todo",
        maxParallel: 3,
      };
      const result = await startBatchFactory(params, deps);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("BUDGET_EXCEEDED");
      }
    });
  });

  describe("deduplication", () => {
    it("deduplicates task IDs in selection", async () => {
      const deps = createMockDeps({
        getTasksByIds: vi.fn().mockResolvedValue([
          { id: "t1", status: "todo" },
        ]),
      });
      const params: BatchStartParams = {
        projectId: "p1",
        source: "selection",
        taskIds: ["t1", "t1", "t1"], // Duplicates
        maxParallel: 3,
      };
      await startBatchFactory(params, deps);
      // Should only query unique IDs
      expect(deps.getTasksByIds).toHaveBeenCalledWith(["t1"]);
    });
  });

  describe("filtering", () => {
    it("filters out non-runnable tasks (done, cancelled)", async () => {
      const deps = createMockDeps({
        getTasksByIds: vi.fn().mockResolvedValue([
          { id: "t1", status: "todo" },
          { id: "t2", status: "done" },
          { id: "t3", status: "cancelled" },
        ]),
      });
      const params: BatchStartParams = {
        projectId: "p1",
        source: "selection",
        taskIds: ["t1", "t2", "t3"],
        maxParallel: 3,
      };
      const result = await startBatchFactory(params, deps);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.taskCount).toBe(1); // Only t1 is runnable
      }
    });
  });
});
