"use client";

import { Task, TaskStatus } from "@/types";
import { KanbanColumn } from "./kanban-column";

interface KanbanBoardProps {
  tasks: Task[];
  selectedTaskId: string | null;
  onTaskClick: (taskId: string) => void;
  isRefreshing?: boolean;
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
}: KanbanBoardProps) {
  const tasksByStatus = columns.map((column) => ({
    ...column,
    tasks: tasks.filter((task) => task.status === column.status),
  }));

  return (
    <div className="relative" data-testid="kanban-board">
      {/* Refreshing overlay */}
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
        {tasksByStatus.map((column) => (
          <KanbanColumn
            key={column.status}
            title={column.title}
            status={column.status}
            tasks={column.tasks}
            selectedTaskId={selectedTaskId}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>
    </div>
  );
}
