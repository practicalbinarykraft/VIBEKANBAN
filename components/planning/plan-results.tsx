"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface PlanResultsProps {
  draft: any;
  councilMessages: any[];
  isConfirming: boolean;
  onConfirm: () => void;
}

export function PlanResults({ draft, councilMessages, isConfirming, onConfirm }: PlanResultsProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-card p-6" data-testid="plan-draft">
          <h2 className="mb-4 text-xl font-semibold">Plan Draft</h2>
          {draft && (
            <>
              <div className="mb-4">
                <h3 className="mb-2 text-sm font-semibold">Goals</h3>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {draft.goals.map((goal: string, i: number) => (
                    <li key={i}>{goal}</li>
                  ))}
                </ul>
              </div>
              <div className="mb-4">
                <h3 className="mb-2 text-sm font-semibold">Milestones</h3>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {draft.milestones.map((milestone: string, i: number) => (
                    <li key={i}>{milestone}</li>
                  ))}
                </ul>
              </div>
              <div className="mb-4">
                <h3 className="mb-2 text-sm font-semibold">Tasks</h3>
                <div className="max-h-64 space-y-2 overflow-y-auto" data-testid="draft-tasks">
                  {draft.tasks.map((task: any, i: number) => (
                    <div key={i} className="rounded border border-border bg-muted/20 p-2" data-testid={`draft-task-${i}`}>
                      <p className="text-xs font-medium">{task.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{task.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          <Button onClick={onConfirm} disabled={isConfirming} className="mt-4 w-full" data-testid="confirm-button">
            {isConfirming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Project...
              </>
            ) : (
              'Confirm & Create Project'
            )}
          </Button>
        </div>
      </div>
      <div>
        <div className="rounded-lg border border-border bg-card p-6" data-testid="council-messages">
          <h2 className="mb-4 text-xl font-semibold">AI Council</h2>
          <div className="max-h-[600px] space-y-3 overflow-y-auto">
            {councilMessages.map((msg, i) => (
              <div key={i} className="rounded border border-border bg-muted/20 p-3" data-testid={`council-message-${i}`}>
                <div className="mb-1 flex items-center gap-2">
                  <Badge variant="outline" className="text-xs" data-testid="message-role">
                    {msg.role.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{msg.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
