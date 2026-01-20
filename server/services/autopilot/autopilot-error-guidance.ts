/**
 * Autopilot Error Guidance (PR-77)
 * Maps errors to actionable user guidance.
 */
import type { AutopilotError, AutopilotErrorCode } from "@/types/autopilot-errors";

export interface ErrorGuidance {
  title: string;
  nextSteps: string[];
  severity: "info" | "warning" | "critical";
}

type GuidanceMap = Record<AutopilotErrorCode, ErrorGuidance>;

const guidanceMap: GuidanceMap = {
  AI_NOT_CONFIGURED: {
    title: "AI not configured",
    nextSteps: [
      "Add ANTHROPIC_API_KEY to your environment",
      "Or enable BYOK (Bring Your Own Key) in Settings",
    ],
    severity: "critical",
  },
  BUDGET_EXCEEDED: {
    title: "Budget limit exceeded",
    nextSteps: [
      "Increase ANTHROPIC_MONTHLY_LIMIT_USD in settings",
      "Or disable Real AI mode temporarily",
      "Check current spend in the Budget panel",
    ],
    severity: "warning",
  },
  EMPTY_DIFF: {
    title: "No changes generated",
    nextSteps: [
      "Make the task description more specific",
      "Add clear Definition of Done (DoD)",
      "Check if the task is already completed",
    ],
    severity: "info",
  },
  REPO_NOT_READY: {
    title: "Repository not ready",
    nextSteps: [
      "Connect the repository in project settings",
      "Verify the default branch exists",
      "Check repository permissions",
    ],
    severity: "critical",
  },
  OPEN_PR_LIMIT: {
    title: "Too many open PRs",
    nextSteps: [
      "Close or merge existing pull requests",
      "Review and cleanup stale PRs",
    ],
    severity: "warning",
  },
  GIT_ERROR: {
    title: "Git operation failed",
    nextSteps: [
      "Check repository access permissions",
      "Verify SSH keys or tokens are valid",
      "Try pulling latest changes manually",
    ],
    severity: "critical",
  },
  CANCELLED_BY_USER: {
    title: "Run cancelled",
    nextSteps: [
      "You can start a new run when ready",
      "Previous progress has been saved",
    ],
    severity: "info",
  },
  UNKNOWN: {
    title: "Unexpected error",
    nextSteps: [
      "Check the attempt logs for details",
      "Review the error artifact if available",
      "Try running the task again",
    ],
    severity: "warning",
  },
};

export function getGuidanceForError(err: AutopilotError): ErrorGuidance {
  return guidanceMap[err.code] ?? guidanceMap.UNKNOWN;
}
