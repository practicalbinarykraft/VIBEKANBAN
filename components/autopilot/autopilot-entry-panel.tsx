/** AutopilotEntryPanel (PR-80) - Entry point for starting/stopping autopilot */
"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Play, Square, AlertCircle } from "lucide-react";

interface AutopilotEntryPanelProps {
  projectId: string;
  onStarted?: () => void;
  onStopped?: () => void;
}

type AutopilotStatus = "IDLE" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
type DisabledReason = "ai_not_configured" | "budget_exceeded" | "no_tasks" | null;

const HINT_MESSAGES: Record<Exclude<DisabledReason, null>, string> = {
  ai_not_configured: "AI not configured",
  budget_exceeded: "AI budget exceeded",
  no_tasks: "No tasks ready to run",
};

export function AutopilotEntryPanel({ projectId, onStarted, onStopped }: AutopilotEntryPanelProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [status, setStatus] = useState<AutopilotStatus>("IDLE");
  const [runId, setRunId] = useState<string | null>(null);
  const [disabledReason, setDisabledReason] = useState<DisabledReason>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const [aiRes, autopilotRes, tasksRes] = await Promise.all([
        fetch("/api/ai/status"),
        fetch(`/api/projects/${projectId}/planning/autopilot/status`),
        fetch(`/api/projects/${projectId}/tasks`),
      ]);
      const aiData = await aiRes.json();
      const autopilotData = await autopilotRes.json();
      const tasksData = await tasksRes.json();
      setStatus(autopilotData.status as AutopilotStatus || "IDLE");
      setRunId(autopilotData.runId || null);
      if (autopilotData.status === "RUNNING") { setDisabledReason(null); return; }
      const tasks = tasksData.tasks || [];
      const readyTasks = tasks.filter((t: any) => t.status === "todo" || t.status === "in_progress");
      if (readyTasks.length === 0) { setDisabledReason("no_tasks"); return; }
      if (!aiData.realAiEligible) {
        setDisabledReason(aiData.reason === "BUDGET_LIMIT_EXCEEDED" ? "budget_exceeded" : "ai_not_configured");
        return;
      }
      setDisabledReason(null);
    } catch { setError("Failed to fetch status"); }
    finally { setIsLoading(false); }
  }, [projectId]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleStart = async () => {
    if (disabledReason || isStarting) return;
    setIsStarting(true);
    setError(null);
    try {
      const res = await fetch(`/api/autopilot/runs/${projectId}/start`, {
        method: "POST", headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start autopilot");
      setStatus("RUNNING");
      onStarted?.();
    } catch (err: any) { setError(err.message); await fetchStatus(); }
    finally { setIsStarting(false); }
  };

  const handleStop = async () => {
    if (!runId || isStopping) return;
    setIsStopping(true);
    setError(null);
    try {
      const res = await fetch(`/api/autopilot/runs/${runId}/stop`, {
        method: "POST", headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to stop autopilot");
      onStopped?.();
      await fetchStatus();
    } catch (err: any) { setError(err.message); }
    finally { setIsStopping(false); }
  };

  const isRunning = status === "RUNNING";
  const canRerun = ["COMPLETED", "FAILED", "CANCELLED"].includes(status);
  const startButtonText = isStarting ? "Starting..." : canRerun ? "Run Again" : "Start Autopilot";
  const isStartDisabled = isLoading || isStarting || disabledReason !== null;

  return (
    <div className="rounded-lg border bg-card p-4" data-testid="autopilot-entry-panel">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-medium">Autopilot</h3>
          <p className="text-sm text-muted-foreground">
            Run AI agents to execute tasks automatically
          </p>
        </div>

        {isRunning ? (
          <Button
            onClick={handleStop}
            disabled={isStopping}
            variant="destructive"
            data-testid="autopilot-stop-button"
            className="w-full sm:w-auto"
          >
            {isStopping ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Square className="mr-2 h-4 w-4" />
            )}
            {isStopping ? "Stopping..." : "Stop Autopilot"}
          </Button>
        ) : (
          <Button
            onClick={handleStart}
            disabled={isStartDisabled}
            data-testid="autopilot-start-button"
            className="w-full sm:w-auto"
          >
            {isStarting || isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            {startButtonText}
          </Button>
        )}
      </div>

      {!isRunning && disabledReason && (
        <div
          className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"
          data-testid="autopilot-hint"
        >
          <AlertCircle className="h-4 w-4" />
          <span>{HINT_MESSAGES[disabledReason]}</span>
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-md bg-destructive/10 p-2 text-sm text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}
