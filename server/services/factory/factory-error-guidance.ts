/** Factory Error Guidance (PR-92) - Actionable guidance for factory errors */
import { FactoryErrorCode, type FactoryError } from "@/types/factory-errors";

export type GuidanceSeverity = "info" | "warning" | "critical";

export interface FactoryGuidance {
  severity: GuidanceSeverity;
  title: string;
  steps: string[];
}

interface GuidanceConfig {
  severity: GuidanceSeverity;
  titlePrefix: string;
  steps: string[];
}

const GUIDANCE_CONFIG: Record<FactoryErrorCode, GuidanceConfig> = {
  [FactoryErrorCode.BUDGET_EXCEEDED]: {
    severity: "critical",
    titlePrefix: "Budget Limit Reached",
    steps: [
      "Check your current budget usage in Settings",
      "Increase budget limit if needed",
      "Wait for the next billing cycle",
      "Contact support if this is unexpected",
    ],
  },
  [FactoryErrorCode.AI_NOT_CONFIGURED]: {
    severity: "critical",
    titlePrefix: "AI Provider Not Configured",
    steps: [
      "Go to Settings > AI Configuration",
      "Add your API key for the AI provider",
      "Verify the key is valid and has credits",
      "Restart the factory after configuration",
    ],
  },
  [FactoryErrorCode.QUEUE_CORRUPTED]: {
    severity: "warning",
    titlePrefix: "Queue State Error",
    steps: [
      "The task queue encountered an error",
      "Try restarting the factory",
      "If the issue persists, refresh the page",
      "Check for pending tasks that need cleanup",
    ],
  },
  [FactoryErrorCode.ATTEMPT_START_FAILED]: {
    severity: "warning",
    titlePrefix: "Failed to Start Task",
    steps: [
      "The task could not be started",
      "Check the task configuration",
      "Retry the failed task manually",
      "Review logs for more details",
    ],
  },
  [FactoryErrorCode.ATTEMPT_CANCEL_FAILED]: {
    severity: "warning",
    titlePrefix: "Failed to Cancel Task",
    steps: [
      "The task cancellation failed",
      "The task may still be running",
      "Wait for it to complete or timeout",
      "Check the task status manually",
    ],
  },
  [FactoryErrorCode.WORKER_CRASHED]: {
    severity: "critical",
    titlePrefix: "Worker Process Crashed",
    steps: [
      "The factory worker encountered a fatal error",
      "Refresh the page to restart the worker",
      "Check server logs for crash details",
      "Contact support if crashes persist",
    ],
  },
  [FactoryErrorCode.UNKNOWN]: {
    severity: "info",
    titlePrefix: "Unexpected Error",
    steps: [
      "An unexpected error occurred",
      "Try restarting the factory",
      "If the issue persists, check logs",
      "Report the issue if it continues",
    ],
  },
  // PR-101: Preflight & guardrail error guidance
  [FactoryErrorCode.FACTORY_ALREADY_RUNNING]: {
    severity: "warning",
    titlePrefix: "Factory Already Running",
    steps: [
      "A factory run is already in progress for this project",
      "Wait for the current run to complete",
      "Or stop the current run first",
    ],
  },
  [FactoryErrorCode.FACTORY_PREFLIGHT_FAILED]: {
    severity: "critical",
    titlePrefix: "Preflight Checks Failed",
    steps: [
      "One or more preflight checks failed",
      "Review the check details below",
      "Fix the issues and try again",
    ],
  },
  [FactoryErrorCode.FACTORY_BUDGET_EXCEEDED]: {
    severity: "critical",
    titlePrefix: "Budget Exceeded",
    steps: [
      "Your AI budget limit has been reached",
      "Increase budget limit in Settings",
      "Wait for the next billing cycle",
    ],
  },
  [FactoryErrorCode.FACTORY_REPO_DIRTY]: {
    severity: "warning",
    titlePrefix: "Uncommitted Changes",
    steps: [
      "Your repository has uncommitted changes",
      "Commit or stash your changes first",
      "Run 'git status' to see what needs attention",
    ],
  },
  [FactoryErrorCode.FACTORY_GH_NOT_AUTHED]: {
    severity: "critical",
    titlePrefix: "GitHub CLI Not Authenticated",
    steps: [
      "GitHub CLI is not authenticated",
      "Run 'gh auth login' in your terminal",
      "Verify with 'gh auth status'",
    ],
  },
  [FactoryErrorCode.FACTORY_PERMISSION_DENIED]: {
    severity: "critical",
    titlePrefix: "No Push Permission",
    steps: [
      "You don't have push access to this repository",
      "Check your repository permissions",
      "Contact the repository owner for access",
    ],
  },
  [FactoryErrorCode.FACTORY_INVALID_CONFIG]: {
    severity: "warning",
    titlePrefix: "Invalid Configuration",
    steps: [
      "The factory configuration is invalid",
      "Check maxParallel is between 1 and 20",
      "Verify project settings are correct",
    ],
  },
  [FactoryErrorCode.FACTORY_NO_DEFAULT_BRANCH]: {
    severity: "warning",
    titlePrefix: "Default Branch Missing",
    steps: [
      "Could not find main or master branch",
      "Ensure your repository has a default branch",
      "Run 'git branch' to check available branches",
    ],
  },
};

/**
 * Get actionable guidance for a factory error
 * Returns severity level, user-friendly title, and action steps
 */
export function getFactoryGuidance(error: FactoryError): FactoryGuidance {
  const config = GUIDANCE_CONFIG[error.code] || GUIDANCE_CONFIG[FactoryErrorCode.UNKNOWN];

  // Build title from prefix, include error context if available
  let title = config.titlePrefix;
  if (error.code === FactoryErrorCode.BUDGET_EXCEEDED && error.message.toLowerCase().includes("budget")) {
    title = "Budget Limit Reached";
  }

  return {
    severity: config.severity,
    title,
    steps: [...config.steps],
  };
}
