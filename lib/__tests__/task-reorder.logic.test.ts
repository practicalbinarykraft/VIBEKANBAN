/** Task Reorder Logic Tests (PR-104) - TDD */
import { describe, it, expect } from "vitest";
import {
  computeReorder,
  type ReorderInput,
  type TaskPosition,
} from "../task-reorder.logic";

describe("task-reorder.logic", () => {
  describe("computeReorder - same column", () => {
    it("moves task down within column", () => {
      const tasks: TaskPosition[] = [
        { id: "t1", status: "todo", order: 0 },
        { id: "t2", status: "todo", order: 1 },
        { id: "t3", status: "todo", order: 2 },
      ];
      const input: ReorderInput = {
        taskId: "t1",
        from: { status: "todo", index: 0 },
        to: { status: "todo", index: 2 },
      };

      const result = computeReorder(tasks, input);

      expect(result.updates).toHaveLength(3);
      expect(result.updates.find((u) => u.id === "t1")?.order).toBe(2);
      expect(result.updates.find((u) => u.id === "t2")?.order).toBe(0);
      expect(result.updates.find((u) => u.id === "t3")?.order).toBe(1);
    });

    it("moves task up within column", () => {
      const tasks: TaskPosition[] = [
        { id: "t1", status: "todo", order: 0 },
        { id: "t2", status: "todo", order: 1 },
        { id: "t3", status: "todo", order: 2 },
      ];
      const input: ReorderInput = {
        taskId: "t3",
        from: { status: "todo", index: 2 },
        to: { status: "todo", index: 0 },
      };

      const result = computeReorder(tasks, input);

      expect(result.updates.find((u) => u.id === "t3")?.order).toBe(0);
      expect(result.updates.find((u) => u.id === "t1")?.order).toBe(1);
      expect(result.updates.find((u) => u.id === "t2")?.order).toBe(2);
    });

    it("no-op when same index (no updates needed)", () => {
      const tasks: TaskPosition[] = [
        { id: "t1", status: "todo", order: 0 },
        { id: "t2", status: "todo", order: 1 },
      ];
      const input: ReorderInput = {
        taskId: "t1",
        from: { status: "todo", index: 0 },
        to: { status: "todo", index: 0 },
      };

      const result = computeReorder(tasks, input);

      expect(result.updates).toHaveLength(0);
    });
  });

  describe("computeReorder - cross column", () => {
    it("moves task to different column at start", () => {
      const tasks: TaskPosition[] = [
        { id: "t1", status: "todo", order: 0 },
        { id: "t2", status: "todo", order: 1 },
        { id: "t3", status: "in_progress", order: 0 },
      ];
      const input: ReorderInput = {
        taskId: "t1",
        from: { status: "todo", index: 0 },
        to: { status: "in_progress", index: 0 },
      };

      const result = computeReorder(tasks, input);

      const t1Update = result.updates.find((u) => u.id === "t1");
      expect(t1Update?.status).toBe("in_progress");
      expect(t1Update?.order).toBe(0);
      // t3 should shift to order 1
      expect(result.updates.find((u) => u.id === "t3")?.order).toBe(1);
      // t2 should shift to order 0 in todo
      expect(result.updates.find((u) => u.id === "t2")?.order).toBe(0);
    });

    it("moves task to different column at end", () => {
      const tasks: TaskPosition[] = [
        { id: "t1", status: "todo", order: 0 },
        { id: "t2", status: "in_progress", order: 0 },
        { id: "t3", status: "in_progress", order: 1 },
      ];
      const input: ReorderInput = {
        taskId: "t1",
        from: { status: "todo", index: 0 },
        to: { status: "in_progress", index: 2 },
      };

      const result = computeReorder(tasks, input);

      const t1Update = result.updates.find((u) => u.id === "t1");
      expect(t1Update?.status).toBe("in_progress");
      expect(t1Update?.order).toBe(2);
    });

    it("moves task to empty column", () => {
      const tasks: TaskPosition[] = [
        { id: "t1", status: "todo", order: 0 },
        { id: "t2", status: "todo", order: 1 },
      ];
      const input: ReorderInput = {
        taskId: "t1",
        from: { status: "todo", index: 0 },
        to: { status: "in_progress", index: 0 },
      };

      const result = computeReorder(tasks, input);

      const t1Update = result.updates.find((u) => u.id === "t1");
      expect(t1Update?.status).toBe("in_progress");
      expect(t1Update?.order).toBe(0);
      // t2 should shift to order 0 in todo
      expect(result.updates.find((u) => u.id === "t2")?.order).toBe(0);
    });
  });

  describe("computeReorder - edge cases", () => {
    it("handles single task in column", () => {
      const tasks: TaskPosition[] = [{ id: "t1", status: "todo", order: 0 }];
      const input: ReorderInput = {
        taskId: "t1",
        from: { status: "todo", index: 0 },
        to: { status: "in_progress", index: 0 },
      };

      const result = computeReorder(tasks, input);

      expect(result.updates).toHaveLength(1);
      expect(result.updates[0].status).toBe("in_progress");
      expect(result.updates[0].order).toBe(0);
    });

    it("returns error for non-existent task", () => {
      const tasks: TaskPosition[] = [{ id: "t1", status: "todo", order: 0 }];
      const input: ReorderInput = {
        taskId: "t999",
        from: { status: "todo", index: 0 },
        to: { status: "in_progress", index: 0 },
      };

      const result = computeReorder(tasks, input);

      expect(result.error).toBe("Task not found");
      expect(result.updates).toHaveLength(0);
    });

    it("handles gaps in order values", () => {
      const tasks: TaskPosition[] = [
        { id: "t1", status: "todo", order: 0 },
        { id: "t2", status: "todo", order: 5 },
        { id: "t3", status: "todo", order: 10 },
      ];
      const input: ReorderInput = {
        taskId: "t3",
        from: { status: "todo", index: 2 },
        to: { status: "todo", index: 0 },
      };

      const result = computeReorder(tasks, input);

      // Should normalize to 0, 1, 2
      expect(result.updates.find((u) => u.id === "t3")?.order).toBe(0);
      expect(result.updates.find((u) => u.id === "t1")?.order).toBe(1);
      expect(result.updates.find((u) => u.id === "t2")?.order).toBe(2);
    });
  });
});
