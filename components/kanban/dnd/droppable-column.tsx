/** Droppable Column (PR-104, PR-105) - dnd-kit wrapper for KanbanColumn */
"use client";

import { useDroppable } from "@dnd-kit/core";
import type { Task, TaskStatus } from "@/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DraggableTaskCard } from "./draggable-task-card";
import { FactoryColumnRunButton } from "@/components/factory/factory-column-run-button";
import { RUNNABLE_STATUSES } from "@/lib/factory-constants";

interface DroppableColumnProps {
  title: string;
  status: TaskStatus;
  tasks: Task[];
  selectedTaskId: string | null;
  onTaskClick: (taskId: string) => void;
  highlightedTaskIds?: string[];
  checkedTaskIds?: string[];
  showCheckboxes?: boolean;
  onTaskCheckChange?: (taskId: string, checked: boolean) => void;
  // PR-105: Factory run button props
  showFactoryButton?: boolean;
  isFactoryLoading?: boolean;
  isFactoryRunning?: boolean;
  preflightOk?: boolean;
  onFactoryStart?: (columnStatus: string) => void;
}

const statusColors: Record<TaskStatus, string> = {
  todo: "bg-gray-400",
  in_progress: "bg-blue-500",
  in_review: "bg-amber-500",
  done: "bg-green-600",
  cancelled: "bg-gray-500",
};

export function DroppableColumn({
  title,
  status,
  tasks,
  selectedTaskId,
  onTaskClick,
  highlightedTaskIds = [],
  checkedTaskIds = [],
  showCheckboxes = false,
  onTaskCheckChange,
  showFactoryButton = false,
  isFactoryLoading = false,
  isFactoryRunning = false,
  preflightOk = true,
  onFactoryStart,
}: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${status}`,
  });

  const isRunnable = RUNNABLE_STATUSES.includes(status as typeof RUNNABLE_STATUSES[number]);
  const showButton = showFactoryButton && isRunnable && onFactoryStart;

  return (
    <div
      ref={setNodeRef}
      data-testid={`column-${status}`}
      data-droppable="true"
      className={cn(
        "flex min-w-[260px] max-w-[260px] flex-col shrink-0",
        isOver && "ring-2 ring-primary/50"
      )}
    >
      <div className="flex items-center gap-1.5 px-2 py-1.5 bg-muted/40">
        <div className={cn("h-1.5 w-1.5 rounded-full", statusColors[status])} />
        <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
        {showButton && (
          <FactoryColumnRunButton
            columnStatus={status}
            taskCount={tasks.length}
            isLoading={isFactoryLoading}
            isRunning={isFactoryRunning}
            preflightOk={preflightOk}
            onStart={onFactoryStart}
          />
        )}
        <Badge variant="secondary" className="ml-auto rounded-full px-1.5 py-0 h-4 text-[10px] font-medium">
          {tasks.length}
        </Badge>
      </div>
      <div className="flex flex-col gap-1 p-1.5 min-h-[100px]">
        {tasks.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-center">
            <p className="text-[11px] text-muted-foreground/50">Drop tasks here</p>
          </div>
        ) : (
          tasks.map((task) => (
            <DraggableTaskCard
              key={task.id}
              task={task}
              isSelected={selectedTaskId === task.id}
              isHighlighted={highlightedTaskIds.includes(task.id)}
              isChecked={checkedTaskIds.includes(task.id)}
              showCheckbox={showCheckboxes}
              onClick={() => onTaskClick(task.id)}
              onCheckChange={onTaskCheckChange}
            />
          ))
        )}
      </div>
    </div>
  );
}
