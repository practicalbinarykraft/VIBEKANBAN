/**
 * ProductResult - Display AI Product итог with quality gate
 */
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { validatePlan } from "@/lib/plan-validation";
import { PlanQualityGate } from "./plan-quality-gate";

interface PlanStep {
  title: string;
  tasks: string[];
}

interface ProductResultData {
  mode: "QUESTIONS" | "PLAN";
  questions?: string[];
  steps?: PlanStep[];
}

type PipelinePhase = "IDLE" | "APPLYING" | "EXECUTING" | "PIPELINE_DONE" | "APPLY_FAILED" | "EXECUTE_FAILED";

interface ProductResultProps {
  result: ProductResultData;
  onApplyPlan?: () => void;
  onExecutePlan?: () => void;
  onApprovePlan?: () => void;
  onRetryApply?: () => void;
  onRetryExecute?: () => void;
  isApplying?: boolean;
  isExecuting?: boolean;
  pipelinePhase?: PipelinePhase;
}

export function ProductResult({
  result,
  onApplyPlan,
  onExecutePlan,
  onApprovePlan,
  onRetryApply,
  onRetryExecute,
  isApplying = false,
  isExecuting = false,
  pipelinePhase = "IDLE",
}: ProductResultProps) {
  const canApply = result.mode === "PLAN" && result.steps && result.steps.length > 0;

  // Validate plan quality using step titles
  const validation = useMemo(() => {
    if (result.mode !== "PLAN" || !result.steps) {
      return { ok: true, reasons: [] };
    }
    const planSteps = result.steps.map((s) => s.title);
    return validatePlan(planSteps);
  }, [result.mode, result.steps]);

  const canApprove = canApply && validation.ok;

  return (
    <div
      className="rounded-lg border border-border bg-card p-6"
      data-testid="product-result"
    >
      <h3 className="mb-4 text-lg font-semibold">AI Product итог</h3>

      {result.mode === "QUESTIONS" && result.questions && (
        <div data-testid="product-questions">
          <p className="mb-3 text-sm text-muted-foreground">
            Для продолжения планирования ответьте на вопросы:
          </p>
          <ul className="list-inside list-disc space-y-2">
            {result.questions.map((question, index) => (
              <li key={index} className="text-sm text-foreground">
                {question}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.mode === "PLAN" && result.steps && (
        <div data-testid="product-plan">
          <p className="mb-3 text-sm text-muted-foreground">
            План реализации:
          </p>
          <div className="space-y-4">
            {result.steps.map((step, index) => (
              <div
                key={index}
                className="rounded-md border border-border/50 p-4"
                data-testid="product-step"
              >
                <h4 className="mb-2 font-medium text-foreground">
                  {step.title}
                </h4>
                <ul className="list-inside list-disc space-y-1">
                  {step.tasks.map((task, taskIndex) => (
                    <li
                      key={taskIndex}
                      className="text-sm text-muted-foreground"
                    >
                      {task}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Plan Quality Gate & Actions */}
          {canApply && <div className="mt-4"><PlanQualityGate validation={validation} /></div>}
          {canApply && (
            <div className="mt-6 flex flex-col gap-4">
              {onApprovePlan && pipelinePhase === "IDLE" && (
                <Button
                  onClick={onApprovePlan}
                  disabled={!canApprove || isApplying || isExecuting}
                  data-testid="approve-plan-button"
                  className="w-full"
                >
                  Approve Plan
                </Button>
              )}
              {pipelinePhase === "APPLYING" && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="pipeline-applying">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Applying plan...
                </div>
              )}
              {pipelinePhase === "EXECUTING" && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="pipeline-executing">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Starting execution...
                </div>
              )}
              {pipelinePhase === "PIPELINE_DONE" && (
                <div className="text-sm text-green-600" data-testid="pipeline-done">
                  Pipeline complete!
                </div>
              )}
              {pipelinePhase === "APPLY_FAILED" && onRetryApply && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-destructive">Apply failed</span>
                  <Button onClick={onRetryApply} variant="outline" size="sm" data-testid="retry-apply-button">
                    Retry
                  </Button>
                </div>
              )}
              {pipelinePhase === "EXECUTE_FAILED" && onRetryExecute && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-destructive">Execute failed</span>
                  <Button onClick={onRetryExecute} variant="outline" size="sm" data-testid="retry-execute-button">
                    Retry
                  </Button>
                </div>
              )}
              {pipelinePhase === "IDLE" && (
                <div className="flex gap-2">
                  {onApplyPlan && (
                    <Button
                      onClick={onApplyPlan}
                      disabled={!canApprove || isApplying || isExecuting}
                      variant="outline"
                      data-testid="apply-plan-button"
                    >
                      {isApplying ? (
                        <span data-testid="apply-plan-loading">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                          Применение...
                        </span>
                      ) : (
                        "Apply Plan"
                      )}
                    </Button>
                  )}
                  {onExecutePlan && (
                    <Button
                      onClick={onExecutePlan}
                      disabled={!canApprove || isApplying || isExecuting}
                      data-testid="execute-plan-button"
                    >
                      {isExecuting ? (
                        <span data-testid="execute-plan-loading">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                          Запуск...
                        </span>
                      ) : (
                        "Execute Plan"
                      )}
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
