/** Factory Runnable Tasks Service Tests (PR-105) - TDD */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getRunnableTasksForColumn,
  type RunnableTasksDeps,
  RUNNABLE_STATUSES,
} from "../factory-runnable-tasks.service";

function createMockDeps(overrides: Partial<RunnableTasksDeps> = {}): RunnableTasksDeps {
  return {
    getTasksByProjectAndStatus: vi.fn().mockResolvedValue([]),
    getRunningAttemptTaskIds: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

describe("factory-runnable-tasks.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("RUNNABLE_STATUSES", () => {
    it("includes todo, in_progress, in_review", () => {
      expect(RUNNABLE_STATUSES).toContain("todo");
      expect(RUNNABLE_STATUSES).toContain("in_progress");
      expect(RUNNABLE_STATUSES).toContain("in_review");
    });

    it("excludes done and cancelled", () => {
      expect(RUNNABLE_STATUSES).not.toContain("done");
      expect(RUNNABLE_STATUSES).not.toContain("cancelled");
    });
  });

  describe("getRunnableTasksForColumn", () => {
    it("returns empty array for empty column", async () => {
      const deps = createMockDeps({
        getTasksByProjectAndStatus: vi.fn().mockResolvedValue([]),
      });

      const result = await getRunnableTasksForColumn("proj-1", "todo", deps);

      expect(result.taskIds).toEqual([]);
      expect(result.count).toBe(0);
    });

    it("returns tasks for runnable column", async () => {
      const deps = createMockDeps({
        getTasksByProjectAndStatus: vi.fn().mockResolvedValue([
          { id: "t1" },
          { id: "t2" },
          { id: "t3" },
        ]),
      });

      const result = await getRunnableTasksForColumn("proj-1", "todo", deps);

      expect(result.taskIds).toEqual(["t1", "t2", "t3"]);
      expect(result.count).toBe(3);
    });

    it("returns empty for non-runnable column (done)", async () => {
      const deps = createMockDeps({
        getTasksByProjectAndStatus: vi.fn().mockResolvedValue([
          { id: "t1" },
        ]),
      });

      const result = await getRunnableTasksForColumn("proj-1", "done", deps);

      expect(result.taskIds).toEqual([]);
      expect(result.count).toBe(0);
      expect(deps.getTasksByProjectAndStatus).not.toHaveBeenCalled();
    });

    it("returns empty for non-runnable column (cancelled)", async () => {
      const deps = createMockDeps();

      const result = await getRunnableTasksForColumn("proj-1", "cancelled", deps);

      expect(result.taskIds).toEqual([]);
      expect(result.count).toBe(0);
    });

    it("excludes tasks with running attempts", async () => {
      const deps = createMockDeps({
        getTasksByProjectAndStatus: vi.fn().mockResolvedValue([
          { id: "t1" },
          { id: "t2" },
          { id: "t3" },
        ]),
        getRunningAttemptTaskIds: vi.fn().mockResolvedValue(["t2"]),
      });

      const result = await getRunnableTasksForColumn("proj-1", "todo", deps);

      expect(result.taskIds).toEqual(["t1", "t3"]);
      expect(result.count).toBe(2);
    });

    it("calls deps with correct parameters", async () => {
      const getTasksByProjectAndStatus = vi.fn().mockResolvedValue([{ id: "t1" }]);
      const getRunningAttemptTaskIds = vi.fn().mockResolvedValue([]);
      const deps = createMockDeps({
        getTasksByProjectAndStatus,
        getRunningAttemptTaskIds,
      });

      await getRunnableTasksForColumn("proj-1", "in_progress", deps);

      expect(getTasksByProjectAndStatus).toHaveBeenCalledWith("proj-1", "in_progress");
      expect(getRunningAttemptTaskIds).toHaveBeenCalledWith("proj-1");
    });
  });
});
