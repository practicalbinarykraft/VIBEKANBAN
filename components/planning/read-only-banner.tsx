/**
 * ReadOnlyBanner - Explains why plan is locked and what to do
 *
 * Solves UX Problem #5, #9: Read-only feels like punishment, not a state.
 * Shows clear reason and actionable alternatives.
 */

"use client";

import { Lock, ExternalLink, Plus, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export type LockReason =
  | "approved"           // Plan approved, waiting for task creation
  | "executing"          // Factory is running tasks from this plan
  | "completed"          // All tasks completed
  | "tasks_created";     // Tasks created, plan is historical

interface LockConfig {
  title: string;
  description: string;
  actions: Array<{
    label: string;
    href?: string;
    onClick?: () => void;
    icon: React.ReactNode;
    variant?: "default" | "outline" | "ghost";
  }>;
}

interface ReadOnlyBannerProps {
  reason: LockReason;
  projectId: string;
  factoryRunId?: string;
  onNewPlan?: () => void;
  className?: string;
}

export function ReadOnlyBanner({
  reason,
  projectId,
  factoryRunId,
  onNewPlan,
  className = "",
}: ReadOnlyBannerProps) {
  const configs: Record<LockReason, LockConfig> = {
    approved: {
      title: "Plan is approved and locked",
      description: "Create tasks to start execution, or start a new planning session.",
      actions: [
        {
          label: "Create Tasks",
          icon: <Plus className="h-4 w-4" />,
          variant: "default",
        },
        {
          label: "New Plan",
          onClick: onNewPlan,
          icon: <Plus className="h-4 w-4" />,
          variant: "outline",
        },
      ],
    },
    executing: {
      title: "Plan is being executed by Factory",
      description: "Tasks are running. View progress in Factory or wait for completion.",
      actions: [
        {
          label: "View Factory Run",
          href: factoryRunId
            ? `/projects/${projectId}/factory/runs/${factoryRunId}`
            : `/projects/${projectId}?tab=tasks`,
          icon: <ExternalLink className="h-4 w-4" />,
          variant: "default",
        },
        {
          label: "New Plan",
          onClick: onNewPlan,
          icon: <Plus className="h-4 w-4" />,
          variant: "outline",
        },
      ],
    },
    completed: {
      title: "Plan execution completed",
      description: "All tasks from this plan have been processed.",
      actions: [
        {
          label: "View Tasks",
          href: `/projects/${projectId}?tab=tasks`,
          icon: <Eye className="h-4 w-4" />,
          variant: "default",
        },
        {
          label: "New Plan",
          onClick: onNewPlan,
          icon: <Plus className="h-4 w-4" />,
          variant: "outline",
        },
      ],
    },
    tasks_created: {
      title: "Tasks created from this plan",
      description: "Plan converted to tasks. Start Factory to execute them.",
      actions: [
        {
          label: "View Tasks",
          href: `/projects/${projectId}?tab=tasks`,
          icon: <Eye className="h-4 w-4" />,
          variant: "default",
        },
        {
          label: "New Plan",
          onClick: onNewPlan,
          icon: <Plus className="h-4 w-4" />,
          variant: "outline",
        },
      ],
    },
  };

  const config = configs[reason];

  return (
    <div
      className={`rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30 ${className}`}
      data-testid="read-only-banner"
      data-reason={reason}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        <h3 className="font-semibold text-amber-800 dark:text-amber-200">
          {config.title}
        </h3>
      </div>

      {/* Description */}
      <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
        {config.description}
      </p>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {config.actions.map((action, i) => {
          if (action.href) {
            return (
              <Button
                key={i}
                variant={action.variant || "default"}
                size="sm"
                asChild
              >
                <Link href={action.href}>
                  {action.icon}
                  <span className="ml-1">{action.label}</span>
                </Link>
              </Button>
            );
          }
          return (
            <Button
              key={i}
              variant={action.variant || "default"}
              size="sm"
              onClick={action.onClick}
              disabled={!action.onClick}
            >
              {action.icon}
              <span className="ml-1">{action.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
