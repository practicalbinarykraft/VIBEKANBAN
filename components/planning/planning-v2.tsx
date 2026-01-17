/**
 * PlanningV2 - New planning interface with Council Console (EPIC-9)
 *
 * Two-column layout:
 * - Left: User input and response area
 * - Right: Council Console (dialogue + plan)
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AiModeBanner } from "@/components/banners/ai-mode-banner";
import { CouncilConsole } from "@/components/council/council-console";
import { CouncilThread, CouncilMessage, PlanArtifact } from "@/components/council/types";
import { Loader2, Send } from "lucide-react";

interface PlanningV2Props {
  projectId: string;
  onTasksCreated?: (taskIds: string[]) => void;
}

type Phase = "idle" | "kickoff" | "awaiting_response" | "follow_up" | "plan_ready" | "approved";

export function PlanningV2({ projectId, onTasksCreated }: PlanningV2Props) {
  const [idea, setIdea] = useState("");
  const [response, setResponse] = useState("");
  const [thread, setThread] = useState<CouncilThread | null>(null);
  const [plan, setPlan] = useState<PlanArtifact | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResponding, setIsResponding] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

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
          setPhase(data.thread.status as Phase);
          if (data.plan) {
            setPlan(data.plan);
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
      // Create tasks using existing apply endpoint
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

      onTasksCreated?.(taskIds);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const messages = thread?.messages || [];

  return (
    <div className="flex h-full gap-4 p-4">
      {/* Left Column: User Input */}
      <div className="flex w-1/2 flex-col space-y-4">
        <AiModeBanner />

        <div className="rounded-lg border bg-card p-4">
          <h2 className="mb-2 text-lg font-semibold">Project Planning</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Describe your idea and the AI council will discuss it.
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
              disabled={!idea.trim() || isLoading}
              data-testid="start-council-btn"
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
              Answer the council's questions to help them understand your needs better.
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
          <div className="rounded-md bg-blue-100 dark:bg-blue-900/30 p-3 text-sm">
            Council reached consensus. Click "Generate Plan (draft)" in the console.
          </div>
        )}

        {phase === "approved" && (
          <div className="rounded-md bg-green-100 dark:bg-green-900/30 p-3 text-sm text-green-800 dark:text-green-200">
            Plan approved! Click "Confirm & Create Tasks" to proceed.
          </div>
        )}
      </div>

      {/* Right Column: Council Console */}
      <div className="w-1/2 rounded-lg border">
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
