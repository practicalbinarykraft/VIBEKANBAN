"use client";

import { Task, TaskStatus } from "@/types";
import { KanbanColumn } from "./kanban-column";

interface KanbanBoardProps {
  tasks: Task[];
  selectedTaskId: string | null;
  onTaskClick: (taskId: string) => void;
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
}: KanbanBoardProps) {
  const tasksByStatus = columns.map((column) => ({
    ...column,
    tasks: tasks.filter((task) => task.status === column.status),
  }));

  return (
    <div className="flex gap-2 overflow-x-auto p-2" data-testid="kanban-board">
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
  );
}
