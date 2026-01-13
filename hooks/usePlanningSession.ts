/**
 * usePlanningSession - Hook for managing planning session state
 *
 * Handles:
 * - Starting council discussion
 * - Finishing discussion
 * - Applying plan
 */

"use client";

import { useState, useCallback } from "react";

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

export type PlanningStatus = "IDLE" | "DISCUSSION" | "DONE" | "APPLIED";

interface UsePlanningSessionReturn {
  idea: string;
  setIdea: (idea: string) => void;
  messages: CouncilMessage[];
  sessionId: string | null;
  status: PlanningStatus;
  productResult: ProductResultData | null;
  error: string | null;
  isLoading: boolean;
  isFinishing: boolean;
  isApplying: boolean;
  handleStartCouncil: () => Promise<void>;
  handleFinishDiscussion: () => Promise<void>;
  handleApplyPlan: () => Promise<void>;
}

export function usePlanningSession(
  projectId: string,
  onApplyComplete?: () => void
): UsePlanningSessionReturn {
  const [idea, setIdea] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [messages, setMessages] = useState<CouncilMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<PlanningStatus>("IDLE");
  const [productResult, setProductResult] = useState<ProductResultData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleStartCouncil = useCallback(async () => {
    if (!idea.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/planning/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: idea.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to start council");
      }

      setSessionId(data.sessionId);
      setMessages(data.councilMessages || data.messages);
      setStatus("DISCUSSION");
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [idea, projectId]);

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

      if (!response.ok) {
        throw new Error(data.error || "Failed to finish discussion");
      }

      setProductResult(data.productResult);
      setSessionId(data.sessionId);
      setStatus("DONE");
    } catch (err: any) {
      setError(err.message || "An error occurred");
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

      if (!response.ok) {
        throw new Error(data.error || "Failed to apply plan");
      }

      setStatus("APPLIED");
      onApplyComplete?.();
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsApplying(false);
    }
  }, [sessionId, projectId, onApplyComplete]);

  return {
    idea,
    setIdea,
    messages,
    sessionId,
    status,
    productResult,
    error,
    isLoading,
    isFinishing,
    isApplying,
    handleStartCouncil,
    handleFinishDiscussion,
    handleApplyPlan,
  };
}
