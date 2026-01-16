/**
 * usePlanningQuestions - Hook for analyzing ideas and handling clarifying questions
 *
 * Determines if an idea needs clarifying questions before starting the council.
 */

"use client";

import { useState, useCallback } from "react";

interface UsePlanningQuestionsReturn {
  questions: string[];
  isAnalyzing: boolean;
  isSubmittingAnswers: boolean;
  needsQuestions: boolean;
  analyzeIdea: (projectId: string, ideaText: string) => Promise<boolean>;
  submitAnswers: (
    projectId: string,
    sessionId: string,
    answers: Record<string, string>
  ) => Promise<boolean>;
  resetQuestions: () => void;
}

export function usePlanningQuestions(): UsePlanningQuestionsReturn {
  const [questions, setQuestions] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmittingAnswers, setIsSubmittingAnswers] = useState(false);
  const [needsQuestions, setNeedsQuestions] = useState(false);

  const analyzeIdea = useCallback(
    async (projectId: string, ideaText: string): Promise<boolean> => {
      setIsAnalyzing(true);
      try {
        const response = await fetch(
          `/api/projects/${projectId}/planning/analyze`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ideaText }),
          }
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to analyze");

        if (data.needsQuestions && data.questions?.length > 0) {
          setQuestions(data.questions);
          setNeedsQuestions(true);
          return true; // needs questions
        }
        setNeedsQuestions(false);
        return false; // can proceed directly
      } finally {
        setIsAnalyzing(false);
      }
    },
    []
  );

  const submitAnswers = useCallback(
    async (
      projectId: string,
      sessionId: string,
      answers: Record<string, string>
    ): Promise<boolean> => {
      setIsSubmittingAnswers(true);
      try {
        const response = await fetch(
          `/api/projects/${projectId}/planning/answer`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId, answers }),
          }
        );
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to save answers");
        }
        return true;
      } finally {
        setIsSubmittingAnswers(false);
      }
    },
    []
  );

  const resetQuestions = useCallback(() => {
    setQuestions([]);
    setNeedsQuestions(false);
  }, []);

  return {
    questions,
    isAnalyzing,
    isSubmittingAnswers,
    needsQuestions,
    analyzeIdea,
    submitAnswers,
    resetQuestions,
  };
}
