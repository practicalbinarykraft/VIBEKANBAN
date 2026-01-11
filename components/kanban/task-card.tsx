import { Task } from "@/types";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: Task;
  isSelected: boolean;
  onClick: () => void;
}

export function TaskCard({ task, isSelected, onClick }: TaskCardProps) {
  return (
    <div
      data-testid={`task-card-${task.id}`}
      onClick={onClick}
      className={cn(
        "group cursor-pointer rounded border border-border bg-card px-2 py-2 text-xs hover:border-foreground/20 hover:shadow-sm transition-all",
        isSelected && "border-foreground/40 bg-accent/30"
      )}
    >
      <div className="flex items-start gap-1.5">
        <span className="text-muted-foreground/50 font-mono text-[10px] shrink-0">#{task.id}</span>
        <span className="flex-1 line-clamp-3 leading-snug text-foreground/90">{task.title}</span>
      </div>
    </div>
  );
}
