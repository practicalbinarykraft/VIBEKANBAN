/**
 * ProductResult - Display AI Product итог (questions or plan)
 *
 * Shows either:
 * - List of questions (QUESTIONS mode)
 * - List of steps with tasks (PLAN mode) + Apply Plan button
 */

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface PlanStep {
  title: string;
  tasks: string[];
}

interface ProductResultData {
  mode: "QUESTIONS" | "PLAN";
  questions?: string[];
  steps?: PlanStep[];
}

interface ProductResultProps {
  result: ProductResultData;
  onApplyPlan?: () => void;
  isApplying?: boolean;
}

export function ProductResult({
  result,
  onApplyPlan,
  isApplying = false,
}: ProductResultProps) {
  const canApply = result.mode === "PLAN" && result.steps && result.steps.length > 0;

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

          {/* Apply Plan Button */}
          {canApply && onApplyPlan && (
            <div className="mt-6">
              <Button
                onClick={onApplyPlan}
                disabled={isApplying}
                data-testid="apply-plan-button"
              >
                {isApplying ? (
                  <span data-testid="apply-plan-loading">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                    Применение плана...
                  </span>
                ) : (
                  "Apply Plan"
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
