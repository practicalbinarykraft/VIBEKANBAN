/** FactoryBatchStartPanel (PR-87, PR-103) - Batch factory start from Kanban */
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Play, Factory } from "lucide-react";
import { getAgentProfiles, getDefaultAgentProfile } from "@/server/services/agents/agent-profiles.registry";

export interface BatchStartRequest {
  source: "column" | "selection";
  columnStatus?: string;
  taskIds?: string[];
  maxParallel: number;
  agentProfileId: string;
}

const AGENT_PROFILES = getAgentProfiles();

interface FactoryBatchStartPanelProps {
  projectId: string;
  selectedTaskIds: string[];
  tasksByStatus: Record<string, number>;
  isFactoryRunning: boolean;
  isStarting: boolean;
  onStart: (params: BatchStartRequest) => void;
}

const COLUMN_OPTIONS = [
  { value: "todo", label: "Todo" },
  { value: "in_progress", label: "In Progress" },
  { value: "in_review", label: "In Review" },
];

export function FactoryBatchStartPanel({
  selectedTaskIds, tasksByStatus, isFactoryRunning, isStarting, onStart,
}: FactoryBatchStartPanelProps) {
  const [source, setSource] = useState<"column" | "selection">("column");
  const [columnStatus, setColumnStatus] = useState("todo");
  const [maxParallel, setMaxParallel] = useState(3);
  const [agentProfileId, setAgentProfileId] = useState(getDefaultAgentProfile().id);

  const taskCount = source === "selection"
    ? selectedTaskIds.length
    : tasksByStatus[columnStatus] ?? 0;

  const canStart = !isFactoryRunning && !isStarting && taskCount > 0;

  const handleStart = () => {
    if (source === "column") {
      onStart({ source: "column", columnStatus, maxParallel, agentProfileId });
    } else {
      onStart({ source: "selection", taskIds: selectedTaskIds, maxParallel, agentProfileId });
    }
  };

  return (
    <div className="rounded-lg border bg-card p-3" data-testid="factory-batch-start-panel">
      <div className="flex items-center gap-2 mb-2">
        <Factory className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Batch Start</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={source}
          onChange={(e) => setSource(e.target.value as "column" | "selection")}
          className="h-8 rounded border bg-background px-2 text-sm"
          data-testid="batch-source-select"
        >
          <option value="column">Run column</option>
          <option value="selection">Run selected</option>
        </select>

        {source === "column" && (
          <select
            value={columnStatus}
            onChange={(e) => setColumnStatus(e.target.value)}
            className="h-8 rounded border bg-background px-2 text-sm"
            data-testid="batch-column-select"
          >
            {COLUMN_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} ({tasksByStatus[opt.value] ?? 0})
              </option>
            ))}
          </select>
        )}

        <select
          value={agentProfileId}
          onChange={(e) => setAgentProfileId(e.target.value)}
          className="h-8 rounded border bg-background px-2 text-sm"
          data-testid="batch-agent-select"
        >
          {AGENT_PROFILES.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.label}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1">
          <Input
            type="number" min={1} max={20} value={maxParallel}
            onChange={(e) => setMaxParallel(Math.min(20, Math.max(1, Number(e.target.value))))}
            className="w-14 h-8 text-sm"
            data-testid="batch-max-parallel-input"
          />
          <span className="text-xs text-muted-foreground">×</span>
        </div>

        <Button
          onClick={handleStart}
          disabled={!canStart}
          size="sm"
          className="h-8"
          data-testid="batch-start-button"
        >
          {isStarting ? (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ) : (
            <Play className="mr-1 h-3 w-3" />
          )}
          Run {taskCount} tasks
        </Button>
      </div>
    </div>
  );
}
