/**
 * ChatPage - Complete chat interface for project
 *
 * Two-column layout:
 * - Left: ProjectChat (user ↔ AI Product)
 * - Right: CouncilPanel + IterationSummary
 */

"use client";

import { useState } from "react";
import { ProjectChat } from "./project-chat";
import { CouncilPanel } from "./council-panel";
import { IterationSummary } from "./iteration-summary";

interface ChatPageProps {
  projectId: string;
}

interface CouncilThread {
  id: string;
  messages: Array<{
    id: string;
    role: "product" | "architect" | "backend" | "frontend" | "qa";
    content: string;
    createdAt: Date;
  }>;
  iterationNumber: number;
}

interface IterationPlan {
  summary: string;
  tasks: Array<{
    title: string;
    description: string;
    type: "backend" | "frontend" | "qa";
  }>;
}

export function ChatPage({ projectId }: ChatPageProps) {
  const [councilThread, setCouncilThread] = useState<CouncilThread | null>(null);
  const [iterationPlan, setIterationPlan] = useState<IterationPlan | null>(null);
  const [confirming, setConfirming] = useState(false);

  const handleMessageSent = (data: any) => {
    // Update council thread and plan from POST response
    if (data.councilThread) {
      setCouncilThread(data.councilThread);
    }
    if (data.iterationPlan) {
      setIterationPlan(data.iterationPlan);
    }
  };

  const handleConfirmIteration = async () => {
    if (!iterationPlan) return;

    setConfirming(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/iterate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: iterationPlan }),
      });

      if (response.ok) {
        // Clear plan after confirmation
        setIterationPlan(null);
        // Optionally trigger a refetch or notification
      }
    } catch (error) {
      console.error("Failed to apply iteration:", error);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="flex h-full">
      {/* Left: Project Chat */}
      <div className="w-1/2 border-r">
        <ProjectChat
          projectId={projectId}
          onMessageSent={handleMessageSent}
        />
      </div>

      {/* Right: Council + Iteration */}
      <div className="flex w-1/2 flex-col">
        <div className="flex-1 overflow-hidden">
          <CouncilPanel thread={councilThread} />
        </div>
        {iterationPlan && (
          <div className="border-t p-4">
            <IterationSummary
              plan={iterationPlan}
              onConfirm={handleConfirmIteration}
              confirming={confirming}
            />
          </div>
        )}
      </div>
    </div>
  );
}
