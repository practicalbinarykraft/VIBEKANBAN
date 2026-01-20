/**
 * AutopilotEntryPanel (PR-78) - Entry point for starting autopilot
 *
 * Single button to start autopilot from Planning tab.
 * Disabled when: running, AI not configured, budget exceeded, repo not ready.
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Play, AlertCircle } from "lucide-react";

interface AutopilotEntryPanelProps {
  projectId: string;
  onStarted?: () => void;
}

type DisabledReason =
  | "running"
  | "ai_not_configured"
  | "budget_exceeded"
  | "repo_not_ready"
  | null;

const DISABLED_MESSAGES: Record<Exclude<DisabledReason, null>, string> = {
  running: "Autopilot is currently running",
  ai_not_configured: "Configure AI provider in Settings to run Autopilot",
  budget_exceeded: "AI budget limit reached. Increase limit in Settings",
  repo_not_ready: "Repository is not ready for execution",
};

export function AutopilotEntryPanel({ projectId, onStarted }: AutopilotEntryPanelProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [disabledReason, setDisabledReason] = useState<DisabledReason>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const [aiRes, autopilotRes] = await Promise.all([
        fetch("/api/ai/status"),
        fetch(`/api/projects/${projectId}/planning/autopilot/status`),
      ]);

      const aiData = await aiRes.json();
      const autopilotData = await autopilotRes.json();

      // Check autopilot running first
      if (autopilotData.status === "RUNNING") {
        setDisabledReason("running");
        return;
      }

      // Check AI configuration
      if (!aiData.realAiEligible) {
        if (aiData.reason === "BUDGET_LIMIT_EXCEEDED") {
          setDisabledReason("budget_exceeded");
        } else if (aiData.reason === "MISSING_API_KEY") {
          setDisabledReason("ai_not_configured");
        } else {
          setDisabledReason("ai_not_configured");
        }
        return;
      }

      // All checks passed
      setDisabledReason(null);
    } catch {
      setError("Failed to fetch status");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchStatus();
    // Poll status every 5 seconds when running
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleStart = async () => {
    if (disabledReason || isStarting) return;

    setIsStarting(true);
    setError(null);
    // Optimistic UI: show as running immediately
    setDisabledReason("running");

    try {
      const res = await fetch(`/api/autopilot/runs/${projectId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to start autopilot");
      }

      onStarted?.();
    } catch (err: any) {
      setError(err.message);
      // Revert optimistic UI on error
      await fetchStatus();
    } finally {
      setIsStarting(false);
    }
  };

  const isDisabled = isLoading || isStarting || disabledReason !== null;
  const buttonText = isStarting
    ? "Starting..."
    : disabledReason === "running"
      ? "Autopilot is running"
      : "Run Autopilot";

  return (
    <div className="rounded-lg border bg-card p-4" data-testid="autopilot-entry-panel">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-medium">Autopilot</h3>
          <p className="text-sm text-muted-foreground">
            Autopilot will execute the current plan automatically
          </p>
        </div>

        <Button
          onClick={handleStart}
          disabled={isDisabled}
          data-testid="run-autopilot-btn"
          className="w-full sm:w-auto"
        >
          {isStarting || isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-2 h-4 w-4" />
          )}
          {buttonText}
        </Button>
      </div>

      {disabledReason && disabledReason !== "running" && (
        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4" />
          <span>{DISABLED_MESSAGES[disabledReason]}</span>
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
