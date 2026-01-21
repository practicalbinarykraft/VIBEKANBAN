"use client";

import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { Task, TaskStatus } from "@/types";
import { KanbanColumn } from "./kanban-column";
import { DroppableColumn } from "./dnd/droppable-column";
import { TaskCard } from "./task-card";
import { useKanbanDnd, type ReorderPayload } from "./dnd/use-kanban-dnd";

interface KanbanBoardProps {
  tasks: Task[];
  selectedTaskId: string | null;
  onTaskClick: (taskId: string) => void;
  isRefreshing?: boolean;
  highlightedTaskIds?: string[];
  checkedTaskIds?: string[];
  showCheckboxes?: boolean;
  onTaskCheckChange?: (taskId: string, checked: boolean) => void;
  onReorder?: (payload: ReorderPayload) => Promise<{ ok: boolean }>;
}

const columns: Array<{ title: string; status: TaskStatus }> = [
  { title: "To Do", status: "todo" },
  { title: "In Progress", status: "in_progress" },
  { title: "In Review", status: "in_review" },
  { title: "Done", status: "done" },
  { title: "Cancelled", status: "cancelled" },
];

export function KanbanBoard({
  tasks,
  selectedTaskId,
  onTaskClick,
  isRefreshing = false,
  highlightedTaskIds = [],
  checkedTaskIds = [],
  showCheckboxes = false,
  onTaskCheckChange,
  onReorder,
}: KanbanBoardProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const noopReorder = async () => ({ ok: true });
  const {
    isDragging,
    activeId,
    optimisticTasks,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  } = useKanbanDnd({ tasks, onReorder: onReorder ?? noopReorder });

  const displayTasks = onReorder ? optimisticTasks : tasks;
  const activeTask = activeId ? displayTasks.find((t) => t.id === activeId) : null;

  const tasksByStatus = columns.map((column) => ({
    ...column,
    tasks: displayTasks.filter((task) => task.status === column.status).sort((a, b) => a.order - b.order),
  }));

  const boardContent = (
    <div className="relative" data-testid="kanban-board">
      {isRefreshing && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center bg-background/50"
          data-testid="board-refreshing"
        >
          <div className="flex items-center gap-2 rounded-md bg-background px-3 py-2 shadow-sm">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm text-muted-foreground">Refreshing...</span>
          </div>
        </div>
      )}
      <div className="flex gap-2 overflow-x-auto p-2">
        {tasksByStatus.map((column) =>
          onReorder ? (
            <DroppableColumn
              key={column.status}
              title={column.title}
              status={column.status}
              tasks={column.tasks}
              selectedTaskId={selectedTaskId}
              onTaskClick={onTaskClick}
              highlightedTaskIds={highlightedTaskIds}
              checkedTaskIds={checkedTaskIds}
              showCheckboxes={showCheckboxes}
              onTaskCheckChange={onTaskCheckChange}
            />
          ) : (
            <KanbanColumn
              key={column.status}
              title={column.title}
              status={column.status}
              tasks={column.tasks}
              selectedTaskId={selectedTaskId}
              onTaskClick={onTaskClick}
              highlightedTaskIds={highlightedTaskIds}
              checkedTaskIds={checkedTaskIds}
              showCheckboxes={showCheckboxes}
              onTaskCheckChange={onTaskCheckChange}
            />
          )
        )}
      </div>
    </div>
  );

  if (!onReorder) {
    return boardContent;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      {boardContent}
      <DragOverlay>
        {activeTask && (
          <div className="opacity-90">
            <TaskCard task={activeTask} isSelected={false} onClick={() => {}} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
