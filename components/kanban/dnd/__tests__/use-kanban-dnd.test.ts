/** useKanbanDnd Hook Tests (PR-104) - TDD */
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useKanbanDnd, type UseKanbanDndOptions } from "../use-kanban-dnd";
import type { Task } from "@/types";

const mockTasks: Task[] = [
  { id: "t1", projectId: "p1", title: "Task 1", description: "", status: "todo", order: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: "t2", projectId: "p1", title: "Task 2", description: "", status: "todo", order: 1, createdAt: new Date(), updatedAt: new Date() },
  { id: "t3", projectId: "p1", title: "Task 3", description: "", status: "in_progress", order: 0, createdAt: new Date(), updatedAt: new Date() },
];

describe("useKanbanDnd", () => {
  describe("initial state", () => {
    it("returns isDragging false initially", () => {
      const onReorder = vi.fn();
      const { result } = renderHook(() =>
        useKanbanDnd({ tasks: mockTasks, onReorder })
      );

      expect(result.current.isDragging).toBe(false);
      expect(result.current.activeId).toBeNull();
    });

    it("returns tasks unchanged initially", () => {
      const onReorder = vi.fn();
      const { result } = renderHook(() =>
        useKanbanDnd({ tasks: mockTasks, onReorder })
      );

      expect(result.current.optimisticTasks).toEqual(mockTasks);
    });
  });

  describe("handleDragStart", () => {
    it("sets isDragging to true", () => {
      const onReorder = vi.fn();
      const { result } = renderHook(() =>
        useKanbanDnd({ tasks: mockTasks, onReorder })
      );

      act(() => {
        result.current.handleDragStart({ active: { id: "t1" } } as any);
      });

      expect(result.current.isDragging).toBe(true);
      expect(result.current.activeId).toBe("t1");
    });
  });

  describe("handleDragEnd", () => {
    it("calls onReorder with correct payload for same column move", async () => {
      const onReorder = vi.fn().mockResolvedValue({ ok: true });
      const { result } = renderHook(() =>
        useKanbanDnd({ tasks: mockTasks, onReorder })
      );

      act(() => {
        result.current.handleDragStart({ active: { id: "t1" } } as any);
      });

      await act(async () => {
        await result.current.handleDragEnd({
          active: { id: "t1" },
          over: { id: "t2" },
        } as any);
      });

      expect(onReorder).toHaveBeenCalledWith({
        taskId: "t1",
        from: { status: "todo", index: 0 },
        to: { status: "todo", index: 1 },
      });
    });

    it("calls onReorder with correct payload for cross column move", async () => {
      const onReorder = vi.fn().mockResolvedValue({ ok: true });
      const { result } = renderHook(() =>
        useKanbanDnd({ tasks: mockTasks, onReorder })
      );

      act(() => {
        result.current.handleDragStart({ active: { id: "t1" } } as any);
      });

      await act(async () => {
        await result.current.handleDragEnd({
          active: { id: "t1" },
          over: { id: "column-in_progress" },
        } as any);
      });

      // t3 is already in in_progress column, so t1 goes to index 1 (end)
      expect(onReorder).toHaveBeenCalledWith({
        taskId: "t1",
        from: { status: "todo", index: 0 },
        to: { status: "in_progress", index: 1 },
      });
    });

    it("resets isDragging after drag end", async () => {
      const onReorder = vi.fn().mockResolvedValue({ ok: true });
      const { result } = renderHook(() =>
        useKanbanDnd({ tasks: mockTasks, onReorder })
      );

      act(() => {
        result.current.handleDragStart({ active: { id: "t1" } } as any);
      });

      await act(async () => {
        await result.current.handleDragEnd({
          active: { id: "t1" },
          over: { id: "t2" },
        } as any);
      });

      expect(result.current.isDragging).toBe(false);
      expect(result.current.activeId).toBeNull();
    });

    it("does not call onReorder when dropping on same position", async () => {
      const onReorder = vi.fn().mockResolvedValue({ ok: true });
      const { result } = renderHook(() =>
        useKanbanDnd({ tasks: mockTasks, onReorder })
      );

      act(() => {
        result.current.handleDragStart({ active: { id: "t1" } } as any);
      });

      await act(async () => {
        await result.current.handleDragEnd({
          active: { id: "t1" },
          over: { id: "t1" },
        } as any);
      });

      expect(onReorder).not.toHaveBeenCalled();
    });

    it("handles null over target (cancelled drag)", async () => {
      const onReorder = vi.fn().mockResolvedValue({ ok: true });
      const { result } = renderHook(() =>
        useKanbanDnd({ tasks: mockTasks, onReorder })
      );

      act(() => {
        result.current.handleDragStart({ active: { id: "t1" } } as any);
      });

      await act(async () => {
        await result.current.handleDragEnd({
          active: { id: "t1" },
          over: null,
        } as any);
      });

      expect(onReorder).not.toHaveBeenCalled();
      expect(result.current.isDragging).toBe(false);
    });
  });

  describe("optimistic updates", () => {
    it("applies optimistic update during drag", async () => {
      const onReorder = vi.fn().mockResolvedValue({ ok: true });
      const { result } = renderHook(() =>
        useKanbanDnd({ tasks: mockTasks, onReorder })
      );

      act(() => {
        result.current.handleDragStart({ active: { id: "t1" } } as any);
      });

      // Simulate drag over t2
      act(() => {
        result.current.handleDragOver({
          active: { id: "t1" },
          over: { id: "t2" },
        } as any);
      });

      // Tasks should be reordered optimistically
      const todoTasks = result.current.optimisticTasks.filter(t => t.status === "todo");
      expect(todoTasks[0].id).toBe("t2"); // t2 now first
      expect(todoTasks[1].id).toBe("t1"); // t1 moved after
    });
  });

  describe("auto-enqueue (PR-106)", () => {
    const tasksWithDone: Task[] = [
      ...mockTasks,
      { id: "t4", projectId: "p1", title: "Task 4", description: "", status: "done", order: 0, createdAt: new Date(), updatedAt: new Date() },
    ];

    it("calls onAutoEnqueue when moving to runnable column", async () => {
      const onReorder = vi.fn().mockResolvedValue({ ok: true });
      const onAutoEnqueue = vi.fn();
      const { result } = renderHook(() =>
        useKanbanDnd({ tasks: tasksWithDone, onReorder, onAutoEnqueue })
      );

      act(() => {
        result.current.handleDragStart({ active: { id: "t4" } } as any);
      });

      await act(async () => {
        await result.current.handleDragEnd({
          active: { id: "t4" },
          over: { id: "column-todo" },
        } as any);
      });

      expect(onAutoEnqueue).toHaveBeenCalledWith("t4");
    });

    it("does not call onAutoEnqueue for same column move", async () => {
      const onReorder = vi.fn().mockResolvedValue({ ok: true });
      const onAutoEnqueue = vi.fn();
      const { result } = renderHook(() =>
        useKanbanDnd({ tasks: mockTasks, onReorder, onAutoEnqueue })
      );

      act(() => {
        result.current.handleDragStart({ active: { id: "t1" } } as any);
      });

      await act(async () => {
        await result.current.handleDragEnd({
          active: { id: "t1" },
          over: { id: "t2" },
        } as any);
      });

      expect(onAutoEnqueue).not.toHaveBeenCalled();
    });

    it("does not call onAutoEnqueue when moving to non-runnable column (done)", async () => {
      const onReorder = vi.fn().mockResolvedValue({ ok: true });
      const onAutoEnqueue = vi.fn();
      const { result } = renderHook(() =>
        useKanbanDnd({ tasks: mockTasks, onReorder, onAutoEnqueue })
      );

      act(() => {
        result.current.handleDragStart({ active: { id: "t1" } } as any);
      });

      await act(async () => {
        await result.current.handleDragEnd({
          active: { id: "t1" },
          over: { id: "column-done" },
        } as any);
      });

      expect(onAutoEnqueue).not.toHaveBeenCalled();
    });

    it("works without onAutoEnqueue callback", async () => {
      const onReorder = vi.fn().mockResolvedValue({ ok: true });
      const { result } = renderHook(() =>
        useKanbanDnd({ tasks: tasksWithDone, onReorder })
      );

      act(() => {
        result.current.handleDragStart({ active: { id: "t4" } } as any);
      });

      // Should not throw
      await act(async () => {
        await result.current.handleDragEnd({
          active: { id: "t4" },
          over: { id: "column-todo" },
        } as any);
      });

      expect(onReorder).toHaveBeenCalled();
    });
  });
});
