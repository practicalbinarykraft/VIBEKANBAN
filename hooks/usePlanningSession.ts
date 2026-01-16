/**
 * usePlanningSession - Hook for managing planning session state
 *
 * Handles idea analysis, council discussion, finishing, applying plan.
 */

"use client";

import { useState, useCallback } from "react";
import { usePlanningPipeline, PipelinePhase } from "./usePlanningPipeline";
import { usePlanningQuestions } from "./usePlanningQuestions";

interface CouncilMessage {
  id: string;
  role: string;
  content: string;
}

interface ProductResultData {
  mode: "QUESTIONS" | "PLAN";
  questions?: string[];
  steps?: { title: string; tasks: string[] }[];
}

export type PlanningStatus = "IDLE" | "QUESTIONS" | "DISCUSSION" | "DONE" | "APPLIED";
export type { PipelinePhase };

export function usePlanningSession(
  projectId: string,
  onApplyComplete?: (createdTaskIds: string[]) => void,
  onExecuteComplete?: (createdTaskIds: string[]) => void,
  onPipelineComplete?: (createdTaskIds: string[]) => void
) {
  const [idea, setIdea] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [messages, setMessages] = useState<CouncilMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<PlanningStatus>("IDLE");
  const [productResult, setProductResult] = useState<ProductResultData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const questionsHook = usePlanningQuestions();
  const pipeline = usePlanningPipeline({
    projectId,
    sessionId,
    onComplete: onPipelineComplete,
    onStatusChange: (s) => setStatus(s),
  });

  // Start council and return sessionId
  const startCouncil = useCallback(async (): Promise<string> => {
    setIsLoading(true);
    const response = await fetch(`/api/projects/${projectId}/planning/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idea: idea.trim() }),
    });
    const data = await response.json();
    setIsLoading(false);
    if (!response.ok) throw new Error(data.error || "Failed to start council");
    setSessionId(data.sessionId);
    setMessages(data.councilMessages || data.messages);
    setStatus("DISCUSSION");
    return data.sessionId;
  }, [idea, projectId]);

  // Analyze idea and either show questions or start council
  const handleAnalyzeIdea = useCallback(async () => {
    if (!idea.trim()) return;
    setError(null);
    try {
      const needsQ = await questionsHook.analyzeIdea(projectId, idea.trim());
      if (needsQ) {
        setStatus("QUESTIONS");
      } else {
        await startCouncil();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  }, [idea, projectId, questionsHook, startCouncil]);

  // Submit answers and proceed to council
  const handleSubmitAnswers = useCallback(
    async (answers: Record<string, string>) => {
      setError(null);
      try {
        const newSessionId = await startCouncil();
        await questionsHook.submitAnswers(projectId, newSessionId, answers);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "An error occurred");
      }
    },
    [projectId, questionsHook, startCouncil]
  );

  const handleFinishDiscussion = useCallback(async () => {
    if (!sessionId) return;
    setIsFinishing(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/planning/finish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to finish");
      setProductResult(data.productResult);
      setSessionId(data.sessionId);
      setStatus("DONE");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsFinishing(false);
    }
  }, [sessionId, projectId]);

  const handleApplyPlan = useCallback(async () => {
    if (!sessionId) return;
    setIsApplying(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/planning/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to apply plan");
      const taskIds: string[] = data.taskIds ?? data.createdTaskIds ?? [];
      setStatus("APPLIED");
      onApplyComplete?.(taskIds);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsApplying(false);
    }
  }, [sessionId, projectId, onApplyComplete]);

  const handleExecutePlan = useCallback(async () => {
    if (!sessionId) return;
    setIsExecuting(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/planning/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to apply plan");
      const taskIds: string[] = data.taskIds ?? data.createdTaskIds ?? [];
      setStatus("APPLIED");
      onExecuteComplete?.(taskIds);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsExecuting(false);
    }
  }, [sessionId, projectId, onExecuteComplete]);

  return {
    idea,
    setIdea,
    messages,
    sessionId,
    status,
    questions: questionsHook.questions,
    productResult,
    error: error || pipeline.pipelineError,
    isLoading,
    isAnalyzing: questionsHook.isAnalyzing,
    isSubmittingAnswers: questionsHook.isSubmittingAnswers,
    isFinishing,
    isApplying,
    isExecuting,
    pipelinePhase: pipeline.pipelinePhase,
    handleAnalyzeIdea,
    handleSubmitAnswers,
    handleStartCouncil: startCouncil,
    handleFinishDiscussion,
    handleApplyPlan,
    handleExecutePlan,
    handleApproveAndRun: pipeline.handleApproveAndRun,
    handleRetryApply: pipeline.handleRetryApply,
    handleRetryExecute: pipeline.handleRetryExecute,
  };
}
