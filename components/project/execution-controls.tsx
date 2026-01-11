/**
 * ExecutionControls - Project execution orchestrator controls
 *
 * Responsibility: Display Run All, Pause, Resume buttons and execution status
 * Props-driven, handles user actions via callbacks
 */

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, RotateCw } from "lucide-react";

interface ExecutionControlsProps {
  executionStatus: "idle" | "running" | "paused" | "completed" | "failed";
  loading: boolean;
  onRunAll: () => void;
  onPause: () => void;
  onResume: () => void;
}

export function ExecutionControls({
  executionStatus,
  loading,
  onRunAll,
  onPause,
  onResume,
}: ExecutionControlsProps) {
  const getStatusBadge = () => {
    const statusConfig = {
      idle: { variant: "outline" as const, label: "IDLE" },
      running: { variant: "default" as const, label: "RUNNING" },
      paused: { variant: "secondary" as const, label: "PAUSED" },
      completed: { variant: "secondary" as const, label: "COMPLETED" },
      failed: { variant: "destructive" as const, label: "FAILED" },
    };

    const config = statusConfig[executionStatus];

    return (
      <Badge
        variant={config.variant}
        className="text-[9px] h-5 px-2 font-semibold"
        data-testid="execution-status"
      >
        {config.label}
      </Badge>
    );
  };

  const showRunAll = executionStatus === "idle" || executionStatus === "completed" || executionStatus === "failed";
  const showPause = executionStatus === "running";
  const showResume = executionStatus === "paused";

  return (
    <div className="flex items-center gap-2">
      {getStatusBadge()}

      {showRunAll && (
        <Button
          onClick={onRunAll}
          disabled={loading}
          size="sm"
          className="h-8 text-xs"
          data-testid="run-all-button"
        >
          <Play className="mr-1 h-3.5 w-3.5" />
          Run All
        </Button>
      )}

      {showPause && (
        <Button
          onClick={onPause}
          disabled={loading}
          size="sm"
          variant="secondary"
          className="h-8 text-xs"
          data-testid="pause-button"
        >
          <Pause className="mr-1 h-3.5 w-3.5" />
          Pause
        </Button>
      )}

      {showResume && (
        <Button
          onClick={onResume}
          disabled={loading}
          size="sm"
          className="h-8 text-xs"
          data-testid="resume-button"
        >
          <RotateCw className="mr-1 h-3.5 w-3.5" />
          Resume
        </Button>
      )}
    </div>
  );
}
