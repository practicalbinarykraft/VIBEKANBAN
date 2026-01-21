/** Task Reorder Service Tests (PR-104) - TDD */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  reorderTask,
  type ReorderTaskDeps,
  type ReorderInput,
  type ReorderResult,
} from "../tasks/task-reorder.service";

function createMockDeps(overrides: Partial<ReorderTaskDeps> = {}): ReorderTaskDeps {
  return {
    getTaskById: vi.fn().mockResolvedValue(null),
    getTasksByProject: vi.fn().mockResolvedValue([]),
    updateTaskPositions: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe("task-reorder.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("reorderTask - validation", () => {
    it("returns error when task not found", async () => {
      const deps = createMockDeps({
        getTaskById: vi.fn().mockResolvedValue(null),
      });

      const result = await reorderTask(
        "proj-1",
        { taskId: "t999", from: { status: "todo", index: 0 }, to: { status: "in_progress", index: 0 } },
        deps
      );

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toBe("Task not found");
    });

    it("returns error when task not in project", async () => {
      const deps = createMockDeps({
        getTaskById: vi.fn().mockResolvedValue({ id: "t1", projectId: "other-project", status: "todo", order: 0 }),
      });

      const result = await reorderTask(
        "proj-1",
        { taskId: "t1", from: { status: "todo", index: 0 }, to: { status: "in_progress", index: 0 } },
        deps
      );

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toBe("Task not in project");
    });

    it("returns error for invalid target status", async () => {
      const deps = createMockDeps({
        getTaskById: vi.fn().mockResolvedValue({ id: "t1", projectId: "proj-1", status: "todo", order: 0 }),
      });

      const result = await reorderTask(
        "proj-1",
        { taskId: "t1", from: { status: "todo", index: 0 }, to: { status: "invalid" as any, index: 0 } },
        deps
      );

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toBe("Invalid status");
    });

    it("returns error for negative index", async () => {
      const deps = createMockDeps({
        getTaskById: vi.fn().mockResolvedValue({ id: "t1", projectId: "proj-1", status: "todo", order: 0 }),
      });

      const result = await reorderTask(
        "proj-1",
        { taskId: "t1", from: { status: "todo", index: 0 }, to: { status: "in_progress", index: -1 } },
        deps
      );

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toBe("Invalid index");
    });
  });

  describe("reorderTask - same column", () => {
    it("updates order within column", async () => {
      const updateFn = vi.fn().mockResolvedValue(true);
      const deps = createMockDeps({
        getTaskById: vi.fn().mockResolvedValue({ id: "t2", projectId: "proj-1", status: "todo", order: 1 }),
        getTasksByProject: vi.fn().mockResolvedValue([
          { id: "t1", status: "todo", order: 0 },
          { id: "t2", status: "todo", order: 1 },
          { id: "t3", status: "todo", order: 2 },
        ]),
        updateTaskPositions: updateFn,
      });

      const result = await reorderTask(
        "proj-1",
        { taskId: "t2", from: { status: "todo", index: 1 }, to: { status: "todo", index: 0 } },
        deps
      );

      expect(result.ok).toBe(true);
      expect(updateFn).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: "t2", order: 0 }),
          expect.objectContaining({ id: "t1", order: 1 }),
        ])
      );
    });
  });

  describe("reorderTask - cross column", () => {
    it("updates status and order for cross-column move", async () => {
      const updateFn = vi.fn().mockResolvedValue(true);
      const deps = createMockDeps({
        getTaskById: vi.fn().mockResolvedValue({ id: "t1", projectId: "proj-1", status: "todo", order: 0 }),
        getTasksByProject: vi.fn().mockResolvedValue([
          { id: "t1", status: "todo", order: 0 },
          { id: "t2", status: "todo", order: 1 },
          { id: "t3", status: "in_progress", order: 0 },
        ]),
        updateTaskPositions: updateFn,
      });

      const result = await reorderTask(
        "proj-1",
        { taskId: "t1", from: { status: "todo", index: 0 }, to: { status: "in_progress", index: 0 } },
        deps
      );

      expect(result.ok).toBe(true);
      expect(updateFn).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: "t1", status: "in_progress", order: 0 }),
          expect.objectContaining({ id: "t3", status: "in_progress", order: 1 }),
        ])
      );
    });

    it("reindexes source column after cross-column move", async () => {
      const updateFn = vi.fn().mockResolvedValue(true);
      const deps = createMockDeps({
        getTaskById: vi.fn().mockResolvedValue({ id: "t1", projectId: "proj-1", status: "todo", order: 0 }),
        getTasksByProject: vi.fn().mockResolvedValue([
          { id: "t1", status: "todo", order: 0 },
          { id: "t2", status: "todo", order: 1 },
        ]),
        updateTaskPositions: updateFn,
      });

      const result = await reorderTask(
        "proj-1",
        { taskId: "t1", from: { status: "todo", index: 0 }, to: { status: "in_progress", index: 0 } },
        deps
      );

      expect(result.ok).toBe(true);
      // t2 should be reindexed to 0 in todo column
      expect(updateFn).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: "t2", status: "todo", order: 0 }),
        ])
      );
    });
  });

  describe("reorderTask - no-op", () => {
    it("returns ok without updates for same position", async () => {
      const updateFn = vi.fn().mockResolvedValue(true);
      const deps = createMockDeps({
        getTaskById: vi.fn().mockResolvedValue({ id: "t1", projectId: "proj-1", status: "todo", order: 0 }),
        getTasksByProject: vi.fn().mockResolvedValue([
          { id: "t1", status: "todo", order: 0 },
        ]),
        updateTaskPositions: updateFn,
      });

      const result = await reorderTask(
        "proj-1",
        { taskId: "t1", from: { status: "todo", index: 0 }, to: { status: "todo", index: 0 } },
        deps
      );

      expect(result.ok).toBe(true);
      expect(updateFn).not.toHaveBeenCalled();
    });
  });
});
