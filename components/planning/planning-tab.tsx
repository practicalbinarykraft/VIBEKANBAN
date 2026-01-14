/**
 * PlanningTab - Planning interface with council chat
 *
 * Two-phase UX:
 * 1. DISCUSSION: User enters idea → council chat appears → finish button visible
 * 2. DONE: After finish → product result (questions or plan) appears
 * 3. APPLIED: After apply plan → tasks created, navigate to board
 */

"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CouncilChat } from "./council-chat";
import { ProductResult } from "./product-result";
import { usePlanningSession } from "@/hooks/usePlanningSession";
import { Loader2 } from "lucide-react";

interface PlanningTabProps {
  projectId: string;
  onApplyComplete?: (createdTaskIds: string[]) => void;
  onExecuteComplete?: (createdTaskIds: string[]) => void;
}

export function PlanningTab({ projectId, onApplyComplete, onExecuteComplete }: PlanningTabProps) {
  const {
    idea,
    setIdea,
    messages,
    status,
    productResult,
    error,
    isLoading,
    isFinishing,
    isApplying,
    isExecuting,
    handleStartCouncil,
    handleFinishDiscussion,
    handleApplyPlan,
    handleExecutePlan,
  } = usePlanningSession(projectId, onApplyComplete, onExecuteComplete);

  const isStartDisabled = !idea.trim() || isLoading || status !== "IDLE";

  return (
    <div className="flex h-full flex-col gap-6 overflow-auto p-6">
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
          onClick={handleStartCouncil}
          disabled={isStartDisabled}
          data-testid="planning-start-button"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running Council...
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
          isApplying={isApplying}
          isExecuting={isExecuting}
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
