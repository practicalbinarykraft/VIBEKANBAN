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
    if (!plan || plan.status !== "approved") return;

    setIsCreating(true);
    setError(null);

    try {
      const taskPromises = plan.tasks.map((task) =>
        fetch(`/api/projects/${projectId}/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: task.title,
            description: task.description,
            estimate: task.estimate,
          }),
        })
      );

      const responses = await Promise.all(taskPromises);
      const taskIds: string[] = [];

      for (const res of responses) {
        if (res.ok) {
          const data = await res.json();
          taskIds.push(data.id);
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
              taskIds, // Pass created task IDs
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

      setPhase("tasks_created");
      onApplyComplete?.(taskIds);
    } catch (err: any) {
      setError(err.message);
    } finally {
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
          <div className="rounded-md bg-green-100 p-3 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-200">
            Tasks created successfully! Check the Tasks tab.
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
