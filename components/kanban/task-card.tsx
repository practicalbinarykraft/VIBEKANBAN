import { Task } from "@/types";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: Task;
  isSelected: boolean;
  isHighlighted?: boolean;
  isChecked?: boolean;
  showCheckbox?: boolean;
  onClick: () => void;
  onCheckChange?: (taskId: string, checked: boolean) => void;
}

export function TaskCard({
  task,
  isSelected,
  isHighlighted = false,
  isChecked = false,
  showCheckbox = false,
  onClick,
  onCheckChange,
}: TaskCardProps) {
  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCheckChange?.(task.id, !isChecked);
  };

  return (
    <div
      data-testid={`task-card-${task.id}`}
      data-highlighted={isHighlighted ? "true" : undefined}
      data-checked={isChecked ? "true" : undefined}
      onClick={onClick}
      className={cn(
        "group cursor-pointer rounded border border-border bg-card px-2 py-2 text-xs hover:border-foreground/20 hover:shadow-sm transition-all",
        isSelected && "border-foreground/40 bg-accent/30",
        isHighlighted && "ring-2 ring-primary/50 bg-primary/10 animate-pulse",
        isChecked && "border-primary/50 bg-primary/5"
      )}
    >
      <div className="flex items-start gap-1.5">
        {showCheckbox && (
          <input
            type="checkbox"
            checked={isChecked}
            onClick={handleCheckboxClick}
            onChange={() => {}}
            className="mt-0.5 h-3 w-3 shrink-0 cursor-pointer"
            data-testid={`task-checkbox-${task.id}`}
          />
        )}
        <span className="text-muted-foreground/50 font-mono text-[10px] shrink-0">#{task.id}</span>
        <span className="flex-1 line-clamp-3 leading-snug text-foreground/90">{task.title}</span>
      </div>
    </div>
  );
}
