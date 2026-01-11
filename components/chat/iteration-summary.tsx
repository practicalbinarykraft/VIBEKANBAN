/**
 * IterationSummary - Display iteration plan with confirmation
 *
 * Shows summary and task list
 * Allows user to confirm and create tasks
 */

"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ListChecks } from "lucide-react";

interface IterationPlan {
  summary: string;
  tasks: Array<{
    title: string;
    description: string;
    type: "backend" | "frontend" | "qa";
  }>;
}

interface IterationSummaryProps {
  plan: IterationPlan | null;
  onConfirm: () => void;
  confirming: boolean;
}

const typeColors = {
  backend: "bg-green-500/10 text-green-700 border-green-500/30",
  frontend: "bg-blue-500/10 text-blue-700 border-blue-500/30",
  qa: "bg-purple-500/10 text-purple-700 border-purple-500/30",
};

export function IterationSummary({ plan, onConfirm, confirming }: IterationSummaryProps) {
  if (!plan) return null;

  return (
    <div className="rounded-lg border bg-card p-4" data-testid="iteration-summary">
      <div className="mb-3 flex items-start gap-2">
        <ListChecks className="mt-0.5 h-5 w-5 text-primary" />
        <div className="flex-1">
          <h4 className="text-sm font-semibold">Iteration Plan</h4>
          <p className="mt-1 text-xs text-muted-foreground">{plan.summary}</p>
        </div>
      </div>

      <div className="mb-4 space-y-2">
        {plan.tasks.map((task, idx) => (
          <div key={idx} className="rounded-md border bg-muted/30 p-2">
            <div className="mb-1 flex items-center gap-2">
              <Badge className={`text-xs ${typeColors[task.type]}`}>
                {task.type}
              </Badge>
              <span className="text-xs font-medium">{task.title}</span>
            </div>
            <p className="text-xs text-muted-foreground">{task.description}</p>
          </div>
        ))}
      </div>

      <Button
        onClick={onConfirm}
        disabled={confirming}
        className="w-full"
        data-testid="iterate-button"
      >
        <CheckCircle2 className="mr-2 h-4 w-4" />
        {confirming ? "Creating tasks..." : "Confirm & Create Tasks"}
      </Button>
    </div>
  );
}
