/**
 * CouncilConsole - Right panel showing council dialogue and plan
 *
 * Sections:
 * - Council Dialogue (default) - messages from agents
 * - Plan (collapsed) - plan with versions
 * - Controls - generate, revise, approve, create tasks
 */

"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, FileText, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { CouncilMessage, MessageKind, CouncilRole } from "./types";
import { PlanArtifact } from "./types";

interface CouncilConsoleProps {
  messages: CouncilMessage[];
  plan: PlanArtifact | null;
  threadStatus: string;
  iterationNumber: number;
  onGeneratePlan: () => void;
  onRevisePlan: (revision: string) => void;
  onApprovePlan: () => void;
  onCreateTasks: () => void;
  isGenerating?: boolean;
  isApproving?: boolean;
  isCreating?: boolean;
}

const ROLE_CONFIG: Record<CouncilRole, { label: string; color: string }> = {
  product: { label: "Product Manager", color: "bg-blue-500" },
  architect: { label: "Architect", color: "bg-purple-500" },
  backend: { label: "Backend", color: "bg-green-500" },
  frontend: { label: "Frontend", color: "bg-yellow-500" },
  qa: { label: "QA", color: "bg-red-500" },
};

const KIND_BADGE: Record<MessageKind, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  message: { label: "", variant: "default" },
  question: { label: "Question", variant: "secondary" },
  concern: { label: "Concern", variant: "destructive" },
  proposal: { label: "Proposal", variant: "outline" },
  consensus: { label: "Consensus", variant: "default" },
};

export function CouncilConsole({
  messages,
  plan,
  threadStatus,
  iterationNumber,
  onGeneratePlan,
  onRevisePlan,
  onApprovePlan,
  onCreateTasks,
  isGenerating,
  isApproving,
  isCreating,
}: CouncilConsoleProps) {
  const [showPlan, setShowPlan] = useState(false);
  const [revisionText, setRevisionText] = useState("");

  const canGeneratePlan = threadStatus === "plan_ready" && !plan;
  const canRevise = plan && plan.status !== "approved";
  const canApprove = plan && plan.status !== "approved";
  const canCreateTasks = plan && plan.status === "approved";

  return (
    <div className="flex h-full flex-col" data-testid="council-console">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold">Council Console</h3>
          </div>
          <Badge variant="outline">Iteration #{iterationNumber}</Badge>
        </div>

        {/* Tab buttons */}
        <div className="mt-3 flex gap-2">
          <Button
            variant={!showPlan ? "default" : "outline"}
            size="sm"
            onClick={() => setShowPlan(false)}
          >
            <Users className="mr-1 h-3 w-3" />
            Dialogue
          </Button>
          <Button
            variant={showPlan ? "default" : "outline"}
            size="sm"
            onClick={() => setShowPlan(true)}
            disabled={!plan}
          >
            <FileText className="mr-1 h-3 w-3" />
            Plan {plan && `v${plan.version}`}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {!showPlan ? (
          /* Dialogue View */
          <div className="space-y-3" data-testid="council-dialogue">
            {messages.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                Council discussion will appear here
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className="rounded-lg border bg-card p-3"
                  data-testid={`council-msg-${msg.role}`}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${ROLE_CONFIG[msg.role].color}`} />
                    <span className="text-xs font-semibold">{ROLE_CONFIG[msg.role].label}</span>
                    {msg.kind !== "message" && KIND_BADGE[msg.kind].label && (
                      <Badge variant={KIND_BADGE[msg.kind].variant} className="text-xs">
                        {KIND_BADGE[msg.kind].label}
                      </Badge>
                    )}
                    {msg.turnIndex > 0 && (
                      <span className="text-xs text-muted-foreground">Turn {msg.turnIndex + 1}</span>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                </div>
              ))
            )}
          </div>
        ) : (
          /* Plan View */
          <div className="space-y-4" data-testid="plan-view">
            {plan ? (
              <>
                <div className="rounded-lg border bg-card p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="font-medium">Plan v{plan.version}</h4>
                    <Badge variant={plan.status === "approved" ? "default" : "secondary"}>
                      {plan.status}
                    </Badge>
                  </div>
                  <p className="mb-2 text-sm"><strong>Summary:</strong> {plan.summary}</p>
                  <p className="mb-2 text-sm"><strong>Scope:</strong> {plan.scope}</p>
                  <p className="text-sm">
                    <strong>Tasks:</strong> {plan.taskCount} | <strong>Estimate:</strong> {plan.estimate}
                  </p>
                </div>

                {/* Task list */}
                <div className="space-y-2">
                  <h5 className="text-sm font-medium">Tasks</h5>
                  {plan.tasks.map((task, i) => (
                    <div key={i} className="rounded border bg-muted/50 p-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{task.type}</Badge>
                        <Badge variant="secondary" className="text-xs">{task.estimate}</Badge>
                        <span className="font-medium">{task.title}</span>
                      </div>
                      {task.description && (
                        <p className="mt-1 text-xs text-muted-foreground">{task.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                No plan generated yet
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="border-t p-4 space-y-3">
        {canGeneratePlan && (
          <Button
            onClick={onGeneratePlan}
            disabled={isGenerating}
            className="w-full"
            data-testid="generate-plan-btn"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Generate Plan (draft)
              </>
            )}
          </Button>
        )}

        {canRevise && (
          <div className="space-y-2">
            <textarea
              placeholder="Enter revision request..."
              value={revisionText}
              onChange={(e) => setRevisionText(e.target.value)}
              className="w-full rounded-md border bg-background p-2 text-sm"
              rows={2}
            />
            <Button
              onClick={() => {
                if (revisionText.trim()) {
                  onRevisePlan(revisionText.trim());
                  setRevisionText("");
                }
              }}
              variant="secondary"
              disabled={!revisionText.trim() || isGenerating}
              className="w-full"
            >
              Revise Plan
            </Button>
          </div>
        )}

        {canApprove && (
          <Button
            onClick={onApprovePlan}
            disabled={isApproving}
            variant="outline"
            className="w-full"
            data-testid="approve-plan-btn"
          >
            {isApproving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Approving...
              </>
            ) : (
              "Approve Plan"
            )}
          </Button>
        )}

        {canCreateTasks && (
          <Button
            onClick={onCreateTasks}
            disabled={isCreating}
            className="w-full"
            data-testid="create-tasks-btn"
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Tasks...
              </>
            ) : (
              "Confirm & Create Tasks"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
