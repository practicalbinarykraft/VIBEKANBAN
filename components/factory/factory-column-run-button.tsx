/** FactoryColumnRunButton (PR-105) - Run factory from column header */
"use client";

import { Play, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FactoryColumnRunButtonProps {
  columnStatus: string;
  taskCount: number;
  isLoading?: boolean;
  isRunning?: boolean;
  preflightOk?: boolean;
  onStart: (columnStatus: string) => void;
}

export function FactoryColumnRunButton({
  columnStatus,
  taskCount,
  isLoading = false,
  isRunning = false,
  preflightOk = true,
  onStart,
}: FactoryColumnRunButtonProps) {
  const isDisabled = taskCount === 0 || isRunning || isLoading || !preflightOk;

  const getTitle = () => {
    if (taskCount === 0) return "No runnable tasks";
    if (isRunning) return "Factory running";
    if (!preflightOk) return "Preflight failed";
    return `Run ${taskCount} tasks`;
  };

  const handleClick = () => {
    if (!isDisabled) {
      onStart(columnStatus);
    }
  };

  return (
    <button
      data-testid="factory-column-run-btn"
      title={getTitle()}
      disabled={isDisabled}
      onClick={handleClick}
      className={cn(
        "flex items-center justify-center w-5 h-5 rounded transition-colors",
        isDisabled
          ? "text-muted-foreground/30 cursor-not-allowed"
          : "text-muted-foreground hover:text-primary hover:bg-primary/10"
      )}
    >
      {isLoading ? (
        <Loader2
          data-testid="factory-column-run-spinner"
          className="h-3 w-3 animate-spin"
        />
      ) : (
        <Play className="h-3 w-3" />
      )}
    </button>
  );
}
