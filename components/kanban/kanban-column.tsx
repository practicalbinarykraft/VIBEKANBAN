import { Task, TaskStatus } from "@/types";
import { TaskCard } from "./task-card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface KanbanColumnProps {
  title: string;
  status: TaskStatus;
  tasks: Task[];
  selectedTaskId: string | null;
  onTaskClick: (taskId: string) => void;
}

const statusColors: Record<TaskStatus, string> = {
  todo: "bg-gray-400",
  in_progress: "bg-blue-500",
  in_review: "bg-amber-500",
  done: "bg-green-600",
  cancelled: "bg-gray-500",
};

export function KanbanColumn({
  title,
  status,
  tasks,
  selectedTaskId,
  onTaskClick,
}: KanbanColumnProps) {
  return (
    <div className="flex min-w-[260px] max-w-[260px] flex-col shrink-0" data-testid={`column-${status}`}>
      <div className="flex items-center gap-1.5 px-2 py-1.5 bg-muted/40">
        <div className={cn("h-1.5 w-1.5 rounded-full", statusColors[status])} />
        <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
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
            <TaskCard
              key={task.id}
              task={task}
              isSelected={selectedTaskId === task.id}
              onClick={() => onTaskClick(task.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
