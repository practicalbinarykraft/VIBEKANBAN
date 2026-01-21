/** Factory Rerun Panel (PR-93) - Rerun action controls */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFactoryRerun } from "@/hooks/useFactoryRerun";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, RotateCcw } from "lucide-react";

interface FactoryRerunPanelProps {
  projectId: string;
  runId: string;
  failedCount: number;
  selectedTaskIds: string[];
}

export function FactoryRerunPanel({
  projectId,
  runId,
  failedCount,
  selectedTaskIds,
}: FactoryRerunPanelProps) {
  const router = useRouter();
  const { rerunFailed, rerunSelected, isLoading } = useFactoryRerun();
  const [maxParallel, setMaxParallel] = useState(3);

  const handleRerunFailed = async () => {
    const result = await rerunFailed({ projectId, sourceRunId: runId, maxParallel });
    if (result.started && result.newRunId) {
      router.push(`/projects/${projectId}/factory/runs/${result.newRunId}`);
    }
  };

  const handleRerunSelected = async () => {
    if (selectedTaskIds.length === 0) return;
    const result = await rerunSelected({
      projectId,
      sourceRunId: runId,
      selectedTaskIds,
      maxParallel,
    });
    if (result.started && result.newRunId) {
      router.push(`/projects/${projectId}/factory/runs/${result.newRunId}`);
    }
  };

  return (
    <div className="mb-4 flex items-center gap-4 p-4 rounded-lg border bg-muted/30" data-testid="rerun-panel">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Max parallel:</span>
        <Input
          type="number"
          min={1}
          max={20}
          value={maxParallel}
          onChange={(e) => setMaxParallel(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
          className="w-16 h-8"
          data-testid="max-parallel-input"
        />
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleRerunFailed}
        disabled={isLoading || failedCount === 0}
        data-testid="rerun-failed-button"
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RotateCcw className="h-4 w-4 mr-1" />}
        Rerun failed ({failedCount})
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleRerunSelected}
        disabled={isLoading || selectedTaskIds.length === 0}
        data-testid="rerun-selected-button"
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RotateCcw className="h-4 w-4 mr-1" />}
        Rerun selected ({selectedTaskIds.length})
      </Button>
    </div>
  );
}
