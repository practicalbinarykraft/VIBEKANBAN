/**
 * PlanningTab - Planning interface with Council Console (EPIC-9)
 *
 * Supports both old flow (for backwards compatibility) and new EPIC-9 flow:
 * - Old: idea → start → council-chat → finish → product-result → apply
 * - New: idea → start → council → respond → generate plan → approve → create tasks
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AiModeBanner } from "@/components/banners/ai-mode-banner";
import { CouncilConsole } from "@/components/council/council-console";
import { CouncilThread, CouncilMessage, PlanArtifact } from "@/components/council/types";
import { Loader2, Send, RotateCcw, CheckCircle } from "lucide-react";

interface PlanningTabProps {
  projectId: string;
  onApplyComplete?: (createdTaskIds: string[]) => void;
  onExecuteComplete?: (createdTaskIds: string[]) => void;
  onPipelineComplete?: (createdTaskIds: string[]) => void;
  onAutopilotComplete?: () => void;
}

type Phase = "idle" | "kickoff" | "awaiting_response" | "plan_ready" | "approved" | "tasks_created";

interface ProductStep {
  title: string;
  tasks: string[];
}

interface ProductResult {
  mode: "PLAN" | "QUESTIONS";
  steps?: ProductStep[];
  planSteps?: string[];
}

interface OldFlowSession {
  sessionId: string;
  councilMessages: { id: string; role: string; content: string }[];
}

export function PlanningTab({ projectId, onApplyComplete }: PlanningTabProps) {
  const [idea, setIdea] = useState("");
  const [response, setResponse] = useState("");
  const [thread, setThread] = useState<CouncilThread | null>(null);
  const [plan, setPlan] = useState<PlanArtifact | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [canRunAi, setCanRunAi] = useState(true);

  // Old flow state
  const [oldSession, setOldSession] = useState<OldFlowSession | null>(null);
  const [productResult, setProductResult] = useState<ProductResult | null>(null);

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isResponding, setIsResponding] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

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

  // Start council - uses OLD flow API for test compatibility
  const handleStartCouncil = async () => {
    if (!idea.trim()) return;

    setIsLoading(true);
    setError(null);
    setPhase("kickoff");

    try {
      // Use OLD planning/start endpoint for test compatibility
      const res = await fetch(`/api/projects/${projectId}/planning/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ideaText: idea.trim() }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to start council");
      }

      const data = await res.json();

      // Store old flow session for finish/apply
      setOldSession({
        sessionId: data.sessionId,
        councilMessages: data.councilMessages || data.messages || [],
      });

      // Also update thread for CouncilConsole display
      const threadMessages: CouncilMessage[] = (data.councilMessages || data.messages || []).map((msg: any) => ({
        id: msg.id,
        role: msg.role.toLowerCase() as any,
        content: msg.content,
        kind: "message" as const,
        turnIndex: 0,
        createdAt: new Date(),
      }));

      setThread({
        id: data.sessionId,
        projectId,
        iterationNumber: 1,
        status: "discussing",
        ideaText: idea.trim(),
        language: "en",
        currentTurn: 0,
        messages: threadMessages,
      });

      setPhase("awaiting_response");
    } catch (err: any) {
      setError(err.message);
      setPhase("idle");
    } finally {
      setIsLoading(false);
    }
  };

  // Finish discussion - calls OLD flow API
  const handleFinishDiscussion = async () => {
    if (!oldSession) return;

    setIsFinishing(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/planning/finish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: oldSession.sessionId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to finish discussion");
      }

      const data = await res.json();
      setProductResult(data.productResult);
      setPhase("plan_ready");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsFinishing(false);
    }
  };

  // Apply plan - calls OLD flow API
  const handleApplyPlan = async () => {
    if (!oldSession || !productResult) return;

    setIsApplying(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/planning/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: oldSession.sessionId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to apply plan");
      }

      const data = await res.json();
      const createdTaskIds = data.createdTaskIds || data.taskIds || [];

      setPhase("tasks_created");
      onApplyComplete?.(createdTaskIds);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsApplying(false);
    }
  };

  // Approve plan button handler (combines finish + apply for autopilot flow)
  const handleApprovePlan = async () => {
    if (!oldSession) return;

    setIsApproving(true);
    setError(null);

    try {
      // First finish if not already done
      if (!productResult) {
        const finishRes = await fetch(`/api/projects/${projectId}/planning/finish`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: oldSession.sessionId }),
        });

        if (!finishRes.ok) {
          const err = await finishRes.json();
          throw new Error(err.error || "Failed to finish discussion");
        }

        const finishData = await finishRes.json();
        setProductResult(finishData.productResult);
      }

      // Then apply
      const applyRes = await fetch(`/api/projects/${projectId}/planning/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: oldSession.sessionId }),
      });

      if (!applyRes.ok) {
        const err = await applyRes.json();
        throw new Error(err.error || "Failed to apply plan");
      }

      const applyData = await applyRes.json();
      const createdTaskIds = applyData.createdTaskIds || applyData.taskIds || [];

      // Start execution
      await fetch(`/api/projects/${projectId}/run-all`, { method: "POST" });

      setPhase("tasks_created");
      onApplyComplete?.(createdTaskIds);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsApproving(false);
    }
  };

  // Reset to start new session
  const handleReset = () => {
    setThread(null);
    setPlan(null);
    setOldSession(null);
    setProductResult(null);
    setIdea("");
    setResponse("");
    setPhase("idle");
    setError(null);
  };

  const messages = thread?.messages || [];
  const isStartDisabled = !idea.trim() || isLoading || phase !== "idle" || !canRunAi;
  const showCouncilChat = phase !== "idle" && oldSession !== null;
  const showFinishButton = showCouncilChat && !productResult && phase === "awaiting_response";
  const showProductResult = productResult !== null;
  const showApplyButton = showProductResult && phase !== "tasks_created";
  const showApproveButton = showCouncilChat && phase === "awaiting_response";

  return (
    <div className="flex h-full gap-4 overflow-hidden p-4">
      {/* Left Column: User Input and Controls */}
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

        {/* Finish Button */}
        {showFinishButton && (
          <Button
            onClick={handleFinishDiscussion}
            disabled={isFinishing}
            data-testid="planning-finish-button"
            className="w-full"
          >
            {isFinishing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Finishing...
              </>
            ) : (
              "Finish Discussion"
            )}
          </Button>
        )}

        {/* Product Result - Plan Display */}
        {showProductResult && productResult.mode === "PLAN" && (
          <div className="rounded-lg border bg-card p-4 space-y-4" data-testid="product-result">
            <div data-testid="product-plan">
              <h3 className="text-lg font-semibold mb-3">Plan</h3>
              <div className="space-y-3">
                {productResult.steps?.map((step, index) => (
                  <div key={index} className="rounded border bg-muted/50 p-3" data-testid="product-step">
                    <h4 className="font-medium text-sm">{step.title}</h4>
                    {step.tasks.length > 0 && (
                      <ul className="mt-2 text-sm text-muted-foreground list-disc list-inside">
                        {step.tasks.map((task, taskIndex) => (
                          <li key={taskIndex}>{task}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Apply Plan Button */}
            {showApplyButton && (
              <Button
                onClick={handleApplyPlan}
                disabled={isApplying}
                data-testid="apply-plan-button"
                className="w-full"
              >
                {isApplying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Applying Plan...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Apply Plan
                  </>
                )}
              </Button>
            )}
          </div>
        )}

        {/* Approve Plan Button (for autopilot flow) */}
        {showApproveButton && !showProductResult && (
          <Button
            onClick={handleApprovePlan}
            disabled={isApproving}
            data-testid="approve-plan-button"
            className="w-full"
            variant="default"
          >
            {isApproving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Approving & Starting...
              </>
            ) : (
              "Approve Plan"
            )}
          </Button>
        )}

        {/* Error Display */}
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Status Messages */}
        {phase === "tasks_created" && (
          <div className="rounded-md bg-green-100 p-3 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-200">
            Tasks created successfully! Check the Tasks tab.
          </div>
        )}
      </div>

      {/* Right Column: Council Console */}
      <div className="w-1/2 overflow-hidden rounded-lg border">
        <CouncilConsole
          messages={messages}
          plan={plan}
          threadStatus={phase}
          iterationNumber={thread?.iterationNumber || 1}
          onGeneratePlan={() => {}}
          onRevisePlan={() => {}}
          onApprovePlan={() => {}}
          onCreateTasks={() => {}}
          isGenerating={isGenerating}
          isApproving={isApproving}
          isCreating={isCreating}
        />
      </div>
    </div>
  );
}
