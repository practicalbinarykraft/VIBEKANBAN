/**
 * TaskDetailsHeader - Header section of task details panel
 *
 * Responsibility: Display task title, status, and action buttons (close/edit/delete)
 * Props-driven, no internal state or side effects
 */

import { Task } from "@/types";
import { Badge } from "@/components/ui/badge";
import { X, Edit, Trash2 } from "lucide-react";

interface TaskDetailsHeaderProps {
  task: Task;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const statusColors: Record<string, string> = {
  todo: "bg-gray-500",
  in_progress: "bg-blue-500",
  in_review: "bg-yellow-500",
  done: "bg-green-500",
  cancelled: "bg-red-500",
};

const statusLabels: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
  cancelled: "Cancelled",
};

export function TaskDetailsHeader({
  task,
  onClose,
  onEdit,
  onDelete,
}: TaskDetailsHeaderProps) {
  return (
    <div className="border-b border-border bg-background px-3 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <div
              className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                statusColors[task.status]
              }`}
            />
            <span className="text-[11px] font-mono text-muted-foreground/60 shrink-0">
              #{task.id}
            </span>
            <Badge
              variant={task.status === "in_progress" ? "default" : "outline"}
              className={`text-[10px] h-5 px-2 ${task.status === "in_progress" ? "animate-pulse" : ""}`}
            >
              {statusLabels[task.status]}
            </Badge>
          </div>
          <h2 className="text-base font-semibold leading-tight" data-testid="task-title">{task.title}</h2>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onEdit} className="rounded p-1 hover:bg-muted" title="Edit task">
            <Edit className="h-3 w-3 text-muted-foreground" />
          </button>
          <button onClick={onDelete} className="rounded p-1 hover:bg-muted hover:text-destructive" title="Delete task">
            <Trash2 className="h-3 w-3 text-muted-foreground" />
          </button>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted" title="Close panel" data-testid="close-details">
            <X className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}
