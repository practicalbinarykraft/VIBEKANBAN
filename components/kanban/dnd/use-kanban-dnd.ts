/** useKanbanDnd Hook (PR-104, PR-106) - DnD state management */
import { useState, useCallback, useMemo, useRef } from "react";
import type { DragStartEvent, DragOverEvent, DragEndEvent } from "@dnd-kit/core";
import type { Task, TaskStatus } from "@/types";
import { isRunnableStatus } from "@/lib/factory-constants";

export interface ReorderPayload {
  taskId: string;
  from: { status: string; index: number };
  to: { status: string; index: number };
}

export interface UseKanbanDndOptions {
  tasks: Task[];
  onReorder: (payload: ReorderPayload) => Promise<{ ok: boolean }>;
  onAutoEnqueue?: (taskId: string) => void; // PR-106
}

export interface UseKanbanDndReturn {
  isDragging: boolean;
  activeId: string | null;
  optimisticTasks: Task[];
  handleDragStart: (event: DragStartEvent) => void;
  handleDragOver: (event: DragOverEvent) => void;
  handleDragEnd: (event: DragEndEvent) => Promise<void>;
}

export function useKanbanDnd({ tasks, onReorder, onAutoEnqueue }: UseKanbanDndOptions): UseKanbanDndReturn {
  const [isDragging, setIsDragging] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [optimisticOrder, setOptimisticOrder] = useState<Task[] | null>(null);
  const onAutoEnqueueRef = useRef(onAutoEnqueue);
  onAutoEnqueueRef.current = onAutoEnqueue;

  const optimisticTasks = optimisticOrder ?? tasks;

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setIsDragging(true);
    setActiveId(String(event.active.id));
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeTaskId = String(active.id);
    const overId = String(over.id);

    if (activeTaskId === overId) return;

    setOptimisticOrder((current) => {
      const source = current ?? tasks;
      const activeTask = source.find((t) => t.id === activeTaskId);
      if (!activeTask) return current;

      // Determine target column and index
      let targetStatus: TaskStatus;
      let targetIndex: number;

      if (overId.startsWith("column-")) {
        // Dropping on column
        targetStatus = overId.replace("column-", "") as TaskStatus;
        const columnTasks = source.filter((t) => t.status === targetStatus && t.id !== activeTaskId);
        targetIndex = columnTasks.length; // Add to end
      } else {
        // Dropping on another task
        const overTask = source.find((t) => t.id === overId);
        if (!overTask) return current;
        targetStatus = overTask.status;
        const columnTasks = source.filter((t) => t.status === targetStatus);
        targetIndex = columnTasks.findIndex((t) => t.id === overId);
      }

      // Build new order
      return reorderTasks(source, activeTaskId, activeTask.status, targetStatus, targetIndex);
    });
  }, [tasks]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    setIsDragging(false);
    setActiveId(null);

    if (!over) {
      setOptimisticOrder(null);
      return;
    }

    const activeTaskId = String(active.id);
    const overId = String(over.id);

    if (activeTaskId === overId) {
      setOptimisticOrder(null);
      return;
    }

    const activeTask = tasks.find((t) => t.id === activeTaskId);
    if (!activeTask) {
      setOptimisticOrder(null);
      return;
    }

    // Calculate from position
    const fromColumnTasks = tasks.filter((t) => t.status === activeTask.status).sort((a, b) => a.order - b.order);
    const fromIndex = fromColumnTasks.findIndex((t) => t.id === activeTaskId);

    // Calculate to position
    let targetStatus: TaskStatus;
    let targetIndex: number;

    if (overId.startsWith("column-")) {
      targetStatus = overId.replace("column-", "") as TaskStatus;
      const toColumnTasks = tasks.filter((t) => t.status === targetStatus && t.id !== activeTaskId);
      targetIndex = toColumnTasks.length;
    } else {
      const overTask = tasks.find((t) => t.id === overId);
      if (!overTask) {
        setOptimisticOrder(null);
        return;
      }
      targetStatus = overTask.status;
      const toColumnTasks = tasks.filter((t) => t.status === targetStatus).sort((a, b) => a.order - b.order);
      targetIndex = toColumnTasks.findIndex((t) => t.id === overId);
      // Adjust index if moving down in same column
      if (activeTask.status === targetStatus && fromIndex < targetIndex) {
        targetIndex = targetIndex; // Position after the over task
      }
    }

    try {
      await onReorder({
        taskId: activeTaskId,
        from: { status: activeTask.status, index: fromIndex },
        to: { status: targetStatus, index: targetIndex },
      });

      // PR-106: Auto-enqueue when moving to runnable column
      if (activeTask.status !== targetStatus && isRunnableStatus(targetStatus)) {
        onAutoEnqueueRef.current?.(activeTaskId);
      }
    } finally {
      setOptimisticOrder(null);
    }
  }, [tasks, onReorder]);

  return {
    isDragging,
    activeId,
    optimisticTasks,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  };
}

function reorderTasks(
  tasks: Task[],
  activeId: string,
  fromStatus: TaskStatus,
  toStatus: TaskStatus,
  toIndex: number
): Task[] {
  const activeTask = tasks.find((t) => t.id === activeId);
  if (!activeTask) return tasks;

  // Remove from current position
  const withoutActive = tasks.filter((t) => t.id !== activeId);

  // Get tasks in target column
  const targetColumnTasks = withoutActive.filter((t) => t.status === toStatus);
  const otherTasks = withoutActive.filter((t) => t.status !== toStatus);

  // Insert at target position
  const newColumnTasks = [...targetColumnTasks];
  const clampedIndex = Math.min(toIndex, newColumnTasks.length);
  newColumnTasks.splice(clampedIndex, 0, { ...activeTask, status: toStatus });

  // Update order values
  const updatedColumnTasks = newColumnTasks.map((t, i) => ({ ...t, order: i }));

  return [...otherTasks, ...updatedColumnTasks];
}
