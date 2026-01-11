/**
 * TaskEmptyState - Empty states for task details panel
 *
 * Responsibility: Display appropriate message when no data to show
 * Props-driven, no internal state or side effects
 */

type EmptyStateType = "no-attempts" | "loading" | "attempt-not-found";

interface TaskEmptyStateProps {
  type: EmptyStateType;
}

const messages: Record<EmptyStateType, { title: string; subtitle?: string }> = {
  "no-attempts": {
    title: "No execution attempts yet",
    subtitle: "Click \"Run Task\" to start",
  },
  loading: {
    title: "Loading execution details...",
  },
  "attempt-not-found": {
    title: "Attempt not found",
    subtitle: "The selected attempt may have been deleted",
  },
};

export function TaskEmptyState({ type }: TaskEmptyStateProps) {
  const message = messages[type];

  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <p className="text-xs text-muted-foreground">{message.title}</p>
      {message.subtitle && (
        <p className="text-xs text-muted-foreground/60 mt-1">{message.subtitle}</p>
      )}
    </div>
  );
}
