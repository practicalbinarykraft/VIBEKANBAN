/**
 * PlanningTab - Planning interface with Council Console (EPIC-9)
 *
 * Two-column layout:
 * - Left: User input and response area
 * - Right: Council Console (dialogue + plan tabs)
 *
 * Phases: idle → kickoff → awaiting_response → plan_ready → approved → tasks_created
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AiModeBanner } from "@/components/banners/ai-mode-banner";
import { CouncilConsole } from "@/components/council/council-console";
import { CouncilThread, CouncilMessage, PlanArtifact } from "@/components/council/types";
import { AutopilotPanel } from "@/components/planning/autopilot-panel";
import { useAutopilot } from "@/hooks/useAutopilot";
import { Loader2, Send, RotateCcw } from "lucide-react";

interface PlanningTabProps {
  projectId: string;
  enableAutopilotV2?: boolean;
  onApplyComplete?: (createdTaskIds: string[]) => void;
  onExecuteComplete?: (createdTaskIds: string[]) => void;
  onPipelineComplete?: (createdTaskIds: string[]) => void;
  onAutopilotComplete?: () => void;
}

type Phase = "idle" | "kickoff" | "awaiting_response" | "plan_ready" | "approved" | "tasks_created";

export function PlanningTab({ projectId, enableAutopilotV2 = false, onApplyComplete, onAutopilotComplete }: PlanningTabProps) {
  const [idea, setIdea] = useState("");
  const [response, setResponse] = useState("");
  const [thread, setThread] = useState<CouncilThread | null>(null);
  const [plan, setPlan] = useState<PlanArtifact | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [canRunAi, setCanRunAi] = useState(true);

  // Autopilot integration (FEATURE_AUTOPILOT_V2)
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [createdTaskIds, setCreatedTaskIds] = useState<string[]>([]);
  const showAutopilot = enableAutopilotV2;

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isResponding, setIsResponding] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Debug state for E2E diagnostics
  const [debugCreateTasks, setDebugCreateTasks] = useState<{
    clicked: boolean;
    loopStarted: boolean;
    tasksCreated: number;
    status: number | null;
    phaseSet: boolean;
    error: string | null;
  }>({ clicked: false, loopStarted: false, tasksCreated: 0, status: null, phaseSet: false, error: null });

  // Autopilot hook
  const autopilot = useAutopilot(
    projectId,
    sessionId,
    undefined, // onBatchComplete
    onAutopilotComplete, // onAllComplete
    undefined // onTaskComplete
  );

  // Fetch AI config on mount
  useEffect(() => {
    const fetchAiConfig = async () => {
      try {
        const res = await fetch("/api/settings/ai-provider");
        if (res.ok) {
          const data = await res.json();
          setCanRunAi(data.canRunAi);
        }
      } catch (err) {
        console.error("Failed to fetch AI config:", err);
      }
    };
    fetchAiConfig();
  }, []);

  // Load existing council on mount
  useEffect(() => {
    loadExistingCouncil();
  }, [projectId]);

  const loadExistingCouncil = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/council`);
      if (res.ok) {
        const data = await res.json();
        if (data.thread) {
          setThread(data.thread);
          setIdea(data.thread.ideaText || "");
          // Map thread status to phase
          const statusMap: Record<string, Phase> = {
            discussing: "kickoff",
            awaiting_response: "awaiting_response",
            plan_ready: "plan_ready",
            approved: "approved",
            completed: "tasks_created",
          };
          setPhase(statusMap[data.thread.status] || "idle");
          if (data.plan) {
            setPlan(data.plan);
            if (data.plan.status === "approved") {
              setPhase("approved");
            }
          }
        }
      }
    } catch (err) {
      console.error("Failed to load council:", err);
    }
  };

  // Phase 1: Start council kickoff
  const handleStartCouncil = async () => {
    if (!idea.trim()) return;

    setIsLoading(true);
    setError(null);
    setPhase("kickoff");

    try {
      const res = await fetch(`/api/projects/${projectId}/council/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: idea.trim() }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to start council");
      }

      const data = await res.json();
      setThread(data.thread);
      setPhase("awaiting_response");
    } catch (err: any) {
      setError(err.message);
      setPhase("idle");
    } finally {
      setIsLoading(false);
    }
  };

  // Phase 2: Submit response to council
  const handleSubmitResponse = async () => {
    if (!response.trim() || !thread) return;

    setIsResponding(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/council/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: thread.id, response: response.trim() }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit response");
      }

      const data = await res.json();
      setThread(data.thread);
      setPhase("plan_ready");
      setResponse("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsResponding(false);
    }
  };

  // Phase 3: Generate plan
  const handleGeneratePlan = async () => {
    if (!thread) return;

    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/plan/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: thread.id }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate plan");
      }

      const data = await res.json();
      setPlan(data.plan);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Revise plan
  const handleRevisePlan = async (revision: string) => {
    if (!thread) return;

    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/plan/revise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: thread.id, revision }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to revise plan");
      }

      const data = await res.json();
      setPlan(data.plan);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Approve plan
  const handleApprovePlan = async () => {
    if (!plan) return;

    setIsApproving(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/plan/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to approve plan");
      }

      const data = await res.json();
      setPlan(data.plan);
      setPhase("approved");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsApproving(false);
    }
  };

  // Create tasks from approved plan
  const handleCreateTasks = async () => {
    // Debug marker: clicked - reset all markers
    setDebugCreateTasks({ clicked: true, loopStarted: false, tasksCreated: 0, status: null, phaseSet: false, error: null });
    console.log("[DEBUG] handleCreateTasks called, plan:", plan?.id, "status:", plan?.status);

    // Validate plan exists and is approved
    if (!plan || plan.status !== "approved") {
      const errMsg = `PLAN_NOT_APPROVED:plan=${!!plan}:status=${plan?.status}`;
      console.log("[DEBUG] handleCreateTasks early return -", errMsg);
      setDebugCreateTasks(prev => ({ ...prev, error: errMsg }));
      setError("Plan must be approved before creating tasks");
      return;
    }

    // Validate plan.tasks is an array
    const tasks = Array.isArray(plan.tasks) ? plan.tasks : null;
    console.log("[DEBUG] handleCreateTasks tasks validation:", tasks ? tasks.length : "NOT_ARRAY");

    if (!tasks) {
      const errMsg = `PLAN_TASKS_NOT_ARRAY:type=${typeof plan.tasks}`;
      console.log("[DEBUG] handleCreateTasks error -", errMsg);
      setDebugCreateTasks(prev => ({ ...prev, error: errMsg }));
      setError("Plan tasks are not available");
      return;
    }

    // If no tasks to create, still transition to tasks_created phase
    if (tasks.length === 0) {
      console.log("[DEBUG] handleCreateTasks - no tasks to create, setting phase directly");
      setDebugCreateTasks(prev => ({ ...prev, phaseSet: true }));
      setPhase("tasks_created");
      onApplyComplete?.([]);
      return;
    }

    console.log("[DEBUG] handleCreateTasks starting task creation for", tasks.length, "tasks");
    setIsCreating(true);
    setError(null);

    try {
      // Use shorter timeout - demo mode API should be fast
      // Note: process.env.NEXT_PUBLIC_* is available client-side
      const timeout = 10000; // 10s per task max
      const taskIds: string[] = [];

      // Mark loop started
      setDebugCreateTasks(prev => ({ ...prev, loopStarted: true }));
      console.log("[DEBUG] Loop started, about to create", tasks.length, "tasks");

      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        console.log("[DEBUG] Creating task", i + 1, "of", tasks.length, ":", task.title?.substring(0, 30));

        try {
          const res = await fetch(`/api/projects/${projectId}/tasks`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: task.title,
              description: task.description,
              estimate: task.estimate,
            }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          // Debug marker: capture response status on first response
          if (i === 0) {
            setDebugCreateTasks(prev => ({ ...prev, status: res.status }));
          }

          if (res.ok) {
            const data = await res.json();
            taskIds.push(data.id);
            // Update progress
            setDebugCreateTasks(prev => ({ ...prev, tasksCreated: taskIds.length }));
            console.log("[DEBUG] Task", i + 1, "created successfully, id:", data.id);
          } else {
            console.warn("[DEBUG] Task creation failed:", res.status, await res.text());
          }
        } catch (fetchErr: any) {
          clearTimeout(timeoutId);
          console.error("[DEBUG] Fetch error for task", i + 1, ":", fetchErr.name, fetchErr.message);
          if (fetchErr.name === "AbortError") {
            throw new Error("CREATE_TASKS_TIMEOUT");
          }
          throw fetchErr;
        }
      }

      // Create planning session for autopilot (if feature enabled)
      if (showAutopilot && taskIds.length > 0) {
        try {
          const sessionRes = await fetch(`/api/projects/${projectId}/planning/start`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              idea: idea.trim(),
              taskIds,
            }),
          });
          if (sessionRes.ok) {
            const sessionData = await sessionRes.json();
            setSessionId(sessionData.sessionId);
            setCreatedTaskIds(taskIds);
          }
        } catch (sessionErr) {
          console.error("Failed to create autopilot session:", sessionErr);
        }
      }

      console.log("[DEBUG] Setting phase to tasks_created, taskIds:", taskIds.length);
      setDebugCreateTasks(prev => ({ ...prev, phaseSet: true }));
      setPhase("tasks_created");
      // Only call onApplyComplete if autopilot is NOT enabled
      // When autopilot is enabled, we want to stay on Planning tab to show AutopilotPanel
      if (!showAutopilot) {
        onApplyComplete?.(taskIds);
      }
    } catch (err: any) {
      const errMsg = err.message || "UNKNOWN_ERROR";
      console.error("[DEBUG] handleCreateTasks error:", errMsg);
      setDebugCreateTasks(prev => ({ ...prev, error: errMsg }));
      setError(errMsg);
    } finally {
      console.log("[DEBUG] handleCreateTasks finally block");
      setIsCreating(false);
    }
  };

  // Reset to start new session
  const handleReset = () => {
    setThread(null);
    setPlan(null);
    setIdea("");
    setResponse("");
    setPhase("idle");
    setError(null);
    // Reset autopilot state
    setSessionId(null);
    setCreatedTaskIds([]);
  };

  // Autopilot handlers
  const handleStartAutopilotStep = async () => {
    if (!sessionId || createdTaskIds.length === 0) return;
    await autopilot.start("STEP", createdTaskIds);
  };

  const handleStartAutopilotAuto = async () => {
    if (!sessionId || createdTaskIds.length === 0) return;
    await autopilot.start("AUTO", createdTaskIds);
  };

  const messages = thread?.messages || [];
  const isStartDisabled = !idea.trim() || isLoading || phase !== "idle" || !canRunAi;

  return (
    <div className="flex h-full gap-4 overflow-hidden p-4">
      {/* Left Column: User Input */}
      <div className="flex w-1/2 flex-col space-y-4 overflow-y-auto">
        <AiModeBanner />

        <div className="rounded-lg border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Project Planning</h2>
            {phase !== "idle" && (
              <Button variant="ghost" size="sm" onClick={handleReset}>
                <RotateCcw className="mr-1 h-3 w-3" />
                New Session
              </Button>
            )}
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            Describe your idea and the AI council will discuss and create a plan.
          </p>

          {/* Idea Input */}
          <Textarea
            placeholder="Enter your project idea..."
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            className="mb-3 min-h-[100px] resize-none"
            data-testid="planning-idea-input"
            disabled={phase !== "idle"}
          />

          {phase === "idle" && (
            <Button
              onClick={handleStartCouncil}
              disabled={isStartDisabled}
              data-testid="planning-start-button"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting Council...
                </>
              ) : (
                "Start Council Discussion"
              )}
            </Button>
          )}
        </div>

        {/* Response Input - show when awaiting response */}
        {phase === "awaiting_response" && (
          <div className="rounded-lg border bg-card p-4">
            <h3 className="mb-2 font-medium">Your Response</h3>
            <p className="mb-3 text-sm text-muted-foreground">
              Answer the council's questions to clarify your requirements.
            </p>
            <Textarea
              placeholder="Type your response..."
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              className="mb-3 min-h-[80px] resize-none"
              data-testid="response-input"
            />
            <Button
              onClick={handleSubmitResponse}
              disabled={!response.trim() || isResponding}
              data-testid="submit-response-btn"
            >
              {isResponding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Response
                </>
              )}
            </Button>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Status Messages */}
        {phase === "plan_ready" && !plan && (
          <div className="rounded-md bg-blue-100 p-3 text-sm dark:bg-blue-900/30">
            Council reached consensus. Click "Generate Plan (draft)" in the console.
          </div>
        )}

        {phase === "approved" && (
          <div className="rounded-md bg-green-100 p-3 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-200">
            Plan approved! Click "Confirm & Create Tasks" to proceed.
          </div>
        )}

        {phase === "tasks_created" && (
          <div
            className="rounded-md bg-green-100 p-3 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-200"
            data-testid="phase-tasks-created"
          >
            Tasks created successfully! Check the Tasks tab.
          </div>
        )}

        {/* Debug markers for E2E diagnostics */}
        {/* Plan status marker - always rendered when plan exists */}
        {plan && (
          <div
            data-testid="debug-plan-status"
            data-status={plan.status}
            className="hidden"
          />
        )}
        {/* Plan tasks length marker - for E2E diagnostics */}
        {plan && (
          <div
            data-testid="debug-plan-tasks-len"
            data-len={Array.isArray(plan.tasks) ? plan.tasks.length : -1}
            className="hidden"
          />
        )}

        {/* Debug markers for Create Tasks flow */}
        {debugCreateTasks.clicked && (
          <div data-testid="debug-create-tasks-clicked" className="hidden" />
        )}
        {debugCreateTasks.loopStarted && (
          <div data-testid="debug-create-tasks-loop-started" className="hidden" />
        )}
        {debugCreateTasks.tasksCreated > 0 && (
          <div data-testid="debug-tasks-created-count" data-count={debugCreateTasks.tasksCreated} className="hidden" />
        )}
        {debugCreateTasks.status !== null && (
          <div data-testid={`debug-create-tasks-status-${debugCreateTasks.status}`} className="hidden" />
        )}
        {debugCreateTasks.phaseSet && (
          <div data-testid="debug-create-tasks-phase-set" className="hidden" />
        )}
        {debugCreateTasks.error && (
          <div data-testid="debug-create-tasks-error" data-error={debugCreateTasks.error} className="hidden" />
        )}

        {/* Debug markers for E2E tests - only rendered when conditions partially met */}
        {phase === "tasks_created" && !showAutopilot && (
          <div data-testid="debug-autopilot-disabled" className="hidden">
            Autopilot flag is OFF (enableAutopilotV2={String(showAutopilot)})
          </div>
        )}
        {phase === "tasks_created" && showAutopilot && !sessionId && (
          <div data-testid="debug-no-session" className="hidden">
            No sessionId for autopilot
          </div>
        )}

        {/* Autopilot Panel - shown after tasks created (FEATURE_AUTOPILOT_V2) */}
        {phase === "tasks_created" && showAutopilot && sessionId && (
          <AutopilotPanel
            status={autopilot.status}
            mode={autopilot.mode}
            currentBatch={autopilot.currentBatch}
            progress={autopilot.progress}
            totalBatches={autopilot.totalBatches}
            taskProgress={autopilot.taskProgress}
            totalTasks={createdTaskIds.length}
            completedTasks={autopilot.completedTasks}
            currentTaskId={autopilot.currentTaskId}
            pauseReason={autopilot.pauseReason}
            error={autopilot.error}
            isStarting={autopilot.isStarting}
            isApproving={autopilot.isApproving}
            isCanceling={autopilot.isCanceling}
            isExecuting={autopilot.isExecuting}
            onStartStep={handleStartAutopilotStep}
            onStartAuto={handleStartAutopilotAuto}
            onResume={autopilot.resume}
            onApprove={autopilot.approve}
            onCancel={autopilot.cancel}
          />
        )}
      </div>

      {/* Right Column: Council Console */}
      <div className="w-1/2 overflow-hidden rounded-lg border">
        <CouncilConsole
          messages={messages}
          plan={plan}
          threadStatus={phase}
          iterationNumber={thread?.iterationNumber || 1}
          onGeneratePlan={handleGeneratePlan}
          onRevisePlan={handleRevisePlan}
          onApprovePlan={handleApprovePlan}
          onCreateTasks={handleCreateTasks}
          isGenerating={isGenerating}
          isApproving={isApproving}
          isCreating={isCreating}
        />
      </div>
    </div>
  );
}
