/**
 * PhaseBanner - Explicit phase indicator for Planning flow
 *
 * Shows current phase, what user can do, and what's locked.
 * Solves UX Problem #2, #6, #8: User doesn't know where they are in the flow.
 */

"use client";

import {
  Lightbulb,
  MessageSquare,
  FileText,
  CheckCircle,
  Rocket,
  Lock,
  ArrowRight
} from "lucide-react";

export type PlanningPhase =
  | "idle"
  | "kickoff"
  | "awaiting_response"
  | "plan_ready"
  | "approved"
  | "tasks_created";

interface PhaseConfig {
  icon: React.ReactNode;
  title: string;
  description: string;
  canDo: string[];
  locked: string[];
  color: string;
  bgColor: string;
}

const PHASE_CONFIG: Record<PlanningPhase, PhaseConfig> = {
  idle: {
    icon: <Lightbulb className="h-5 w-5" />,
    title: "Ready to Plan",
    description: "Describe your idea and start the AI council discussion.",
    canDo: ["Enter project idea", "Start council discussion"],
    locked: [],
    color: "text-blue-700 dark:text-blue-300",
    bgColor: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800",
  },
  kickoff: {
    icon: <MessageSquare className="h-5 w-5 animate-pulse" />,
    title: "Council Discussing",
    description: "AI team is analyzing your idea and formulating questions.",
    canDo: ["Wait for council to finish", "View discussion in console"],
    locked: ["Edit idea", "Start new session"],
    color: "text-amber-700 dark:text-amber-300",
    bgColor: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
  },
  awaiting_response: {
    icon: <MessageSquare className="h-5 w-5" />,
    title: "Your Input Needed",
    description: "Council has questions. Answer them to refine the plan.",
    canDo: ["Answer council questions", "View discussion"],
    locked: ["Edit original idea", "Skip to plan"],
    color: "text-purple-700 dark:text-purple-300",
    bgColor: "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800",
  },
  plan_ready: {
    icon: <FileText className="h-5 w-5" />,
    title: "Plan Ready for Review",
    description: "Council reached consensus. Review and approve the plan.",
    canDo: ["Review plan", "Request revisions", "Approve plan"],
    locked: ["Edit idea", "Restart discussion"],
    color: "text-indigo-700 dark:text-indigo-300",
    bgColor: "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800",
  },
  approved: {
    icon: <CheckCircle className="h-5 w-5" />,
    title: "Plan Approved",
    description: "Plan is locked. Create tasks to start execution.",
    canDo: ["Create tasks from plan", "Start new session"],
    locked: ["Edit plan", "Request revisions"],
    color: "text-green-700 dark:text-green-300",
    bgColor: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800",
  },
  tasks_created: {
    icon: <Rocket className="h-5 w-5" />,
    title: "Tasks Created",
    description: "Plan converted to tasks. Ready for Factory execution.",
    canDo: ["View tasks", "Start Factory", "Create new plan"],
    locked: ["Edit this plan", "Modify created tasks here"],
    color: "text-emerald-700 dark:text-emerald-300",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800",
  },
};

interface PhaseBannerProps {
  phase: PlanningPhase;
  className?: string;
}

export function PhaseBanner({ phase, className = "" }: PhaseBannerProps) {
  const config = PHASE_CONFIG[phase];

  return (
    <div
      className={`rounded-lg border p-4 ${config.bgColor} ${className}`}
      data-testid="phase-banner"
      data-phase={phase}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className={config.color}>{config.icon}</span>
        <h3 className={`font-semibold ${config.color}`}>{config.title}</h3>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground mb-3">
        {config.description}
      </p>

      {/* What you can do */}
      {config.canDo.length > 0 && (
        <div className="mb-2">
          <p className="text-xs font-medium text-muted-foreground mb-1">You can:</p>
          <ul className="text-sm space-y-0.5">
            {config.canDo.map((item, i) => (
              <li key={i} className="flex items-center gap-1.5">
                <ArrowRight className="h-3 w-3 text-green-600" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* What's locked */}
      {config.locked.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Locked:</p>
          <ul className="text-sm space-y-0.5 text-muted-foreground">
            {config.locked.map((item, i) => (
              <li key={i} className="flex items-center gap-1.5">
                <Lock className="h-3 w-3" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
