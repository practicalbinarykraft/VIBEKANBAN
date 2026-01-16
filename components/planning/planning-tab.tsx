/**
 * PlanningTab - Planning interface with council chat
 * Phases: IDLE → QUESTIONS (optional) → DISCUSSION → DONE → APPLIED
 */
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CouncilChat } from "./council-chat";
import { ProductResult } from "./product-result";
import { AutopilotPanel } from "./autopilot-panel";
import { QuestionsStep } from "./questions-step";
import { AiModeBanner } from "@/components/banners/ai-mode-banner";
import { usePlanningSession } from "@/hooks/usePlanningSession";
import { useAutopilot } from "@/hooks/useAutopilot";
import { Loader2 } from "lucide-react";

interface PlanningTabProps {
  projectId: string;
  onApplyComplete?: (createdTaskIds: string[]) => void;
  onExecuteComplete?: (createdTaskIds: string[]) => void;
  onPipelineComplete?: (createdTaskIds: string[]) => void;
  onAutopilotComplete?: () => void;
}

export function PlanningTab({ projectId, onApplyComplete, onExecuteComplete, onPipelineComplete, onAutopilotComplete }: PlanningTabProps) {
  const [canRunAi, setCanRunAi] = useState(true);

  useEffect(() => {
    const fetchAiConfig = async () => {
      try {
        const response = await fetch("/api/settings/ai-provider");
        if (response.ok) {
          const data = await response.json();
          setCanRunAi(data.canRunAi);
        }
      } catch (error) {
        console.error("Failed to fetch AI config:", error);
      }
    };
    fetchAiConfig();
  }, []);

  const {
    idea,
    setIdea,
    messages,
    sessionId,
    status,
    questions,
    productResult,
    error,
    isLoading,
    isAnalyzing,
    isSubmittingAnswers,
    isFinishing,
    isApplying,
    isExecuting,
    pipelinePhase,
    handleAnalyzeIdea,
    handleSubmitAnswers,
    handleFinishDiscussion,
    handleApplyPlan,
    handleExecutePlan,
    handleApproveAndRun,
    handleRetryApply,
    handleRetryExecute,
  } = usePlanningSession(projectId, onApplyComplete, onExecuteComplete, onPipelineComplete);

  const autopilot = useAutopilot(projectId, sessionId, undefined, onAutopilotComplete);

  const isStartDisabled = !idea.trim() || isLoading || isAnalyzing || status !== "IDLE" || !canRunAi;

  return (
    <div className="flex h-full flex-col gap-6 overflow-auto p-6">
      {/* AI Mode Banner */}
      <AiModeBanner />

      {/* Input Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Project Planning</h2>
        <p className="text-sm text-muted-foreground">
          Describe your project idea and let the AI council help you plan it out.
        </p>

        <Textarea
          placeholder="Enter your project idea..."
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          className="min-h-[120px] resize-none"
          data-testid="planning-idea-input"
          disabled={status !== "IDLE"}
        />

        <Button
          onClick={handleAnalyzeIdea}
          disabled={isStartDisabled}
          data-testid="planning-start-button"
        >
          {isLoading || isAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isAnalyzing ? "Analyzing..." : "Running Council..."}
            </>
          ) : (
            "Run Council"
          )}
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Questions Step - show before council when idea needs clarification */}
      {status === "QUESTIONS" && questions.length > 0 && (
        <QuestionsStep
          questions={questions}
          onContinue={handleSubmitAnswers}
          isSubmitting={isSubmittingAnswers || isLoading}
        />
      )}

      {/* Council Chat */}
      {messages.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            Council Discussion
          </h3>
          <CouncilChat messages={messages} />

          {/* Finish Button - only in DISCUSSION status */}
          {status === "DISCUSSION" && (
            <Button
              onClick={handleFinishDiscussion}
              disabled={isFinishing}
              variant="secondary"
              data-testid="planning-finish-button"
            >
              {isFinishing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Завершение...
                </>
              ) : (
                "Завершить обсуждение"
              )}
            </Button>
          )}
        </div>
      )}

      {/* Product Result - only in DONE status */}
      {status === "DONE" && productResult && (
        <ProductResult
          result={productResult}
          onApplyPlan={handleApplyPlan}
          onExecutePlan={handleExecutePlan}
          onApprovePlan={handleApproveAndRun}
          onRetryApply={handleRetryApply}
          onRetryExecute={handleRetryExecute}
          isApplying={isApplying}
          isExecuting={isExecuting}
          pipelinePhase={pipelinePhase}
        />
      )}

      {/* Autopilot Panel - show when plan exists */}
      {status === "DONE" && productResult?.mode === "PLAN" && productResult.steps && productResult.steps.length > 0 && (
        <AutopilotPanel
          status={autopilot.status}
          currentBatch={autopilot.currentBatch}
          progress={autopilot.progress}
          totalBatches={autopilot.totalBatches}
          error={autopilot.error}
          isStarting={autopilot.isStarting}
          isApproving={autopilot.isApproving}
          isCanceling={autopilot.isCanceling}
          onStart={autopilot.start}
          onApprove={autopilot.approve}
          onCancel={autopilot.cancel}
        />
      )}

      {/* Applied message */}
      {status === "APPLIED" && (
        <div className="rounded-md bg-green-100 dark:bg-green-900/30 p-4 text-sm text-green-800 dark:text-green-200">
          План успешно применён! Задачи созданы в TODO.
        </div>
      )}
    </div>
  );
}
