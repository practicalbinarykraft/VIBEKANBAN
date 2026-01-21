/** Draggable Task Card (PR-104) - dnd-kit wrapper for TaskCard */
"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "@/types";
import { TaskCard } from "../task-card";

interface DraggableTaskCardProps {
  task: Task;
  isSelected: boolean;
  isHighlighted?: boolean;
  isChecked?: boolean;
  showCheckbox?: boolean;
  onClick: () => void;
  onCheckChange?: (taskId: string, checked: boolean) => void;
}

export function DraggableTaskCard({
  task,
  isSelected,
  isHighlighted = false,
  isChecked = false,
  showCheckbox = false,
  onClick,
  onCheckChange,
}: DraggableTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-draggable="true"
      {...listeners}
      {...attributes}
    >
      <TaskCard
        task={task}
        isSelected={isSelected}
        isHighlighted={isHighlighted}
        isChecked={isChecked}
        showCheckbox={showCheckbox}
        onClick={onClick}
        onCheckChange={onCheckChange}
      />
    </div>
  );
}
