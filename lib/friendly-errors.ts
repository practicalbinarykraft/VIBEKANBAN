/**
 * Human-readable Error Mapping
 *
 * Provides user-friendly error messages for all error codes.
 * No stack traces in UI - just clear titles and actionable hints.
 */

export interface FriendlyError {
  title: string;
  message: string;
  action?: string;
  actionUrl?: string;
}

const ERROR_MAP: Record<string, FriendlyError> = {
  // AI Errors
  AI_NOT_CONFIGURED: {
    title: "AI Not Configured",
    message: "No AI provider is set up.",
    action: "Add API key in Settings",
    actionUrl: "/settings",
  },
  AINotConfiguredError: {
    title: "AI Not Configured",
    message: "No AI provider is set up.",
    action: "Add API key in Settings",
    actionUrl: "/settings",
  },
  AI_UNAUTHORIZED: {
    title: "Invalid API Key",
    message: "Your AI API key was rejected (401 Unauthorized).",
    action: "Check your API key in Settings",
    actionUrl: "/settings",
  },
  AI_RATE_LIMIT: {
    title: "Rate Limit Exceeded",
    message: "Too many AI requests. Please wait a moment.",
    action: "Wait and try again",
  },
  AI_ERROR: {
    title: "AI Error",
    message: "The AI service returned an error.",
    action: "Try again or check your API key",
    actionUrl: "/settings",
  },
  AIAPIError: {
    title: "AI API Error",
    message: "The AI service returned an error.",
    action: "Try again or check your API key",
    actionUrl: "/settings",
  },

  // Repo Errors
  REPO_NOT_READY: {
    title: "Repository Not Ready",
    message: "The git repository is not cloned yet.",
    action: "Clone the repo in project settings",
  },
  REPO_NOT_FOUND: {
    title: "Repository Not Found",
    message: "The repository path does not exist.",
    action: "Re-clone the repository",
  },
  DIRTY_WORKTREE: {
    title: "Uncommitted Changes",
    message: "The repository has uncommitted changes.",
    action: "Commit or stash changes before running",
  },
  NO_REMOTE: {
    title: "No Remote Origin",
    message: "The repository has no remote 'origin' configured.",
    action: "Configure git remote",
  },
  GIT_AUTH_FAILED: {
    title: "Git Authentication Failed",
    message: "Could not authenticate with the git remote.",
    action: "Check your git credentials or access token",
  },
  GIT_ERROR: {
    title: "Git Error",
    message: "A git operation failed.",
    action: "Check the repository status",
  },

  // Execution Errors
  EMPTY_DIFF: {
    title: "No Changes Made",
    message: "The agent produced no code changes.",
    action: "Try refining the task description",
  },
  NO_DIFF: {
    title: "No Changes Made",
    message: "The agent produced no code changes.",
    action: "Try refining the task description",
  },

  // Generic
  UNKNOWN: {
    title: "Unknown Error",
    message: "An unexpected error occurred.",
    action: "Try again or contact support",
  },
  PERMISSION_DENIED: {
    title: "Permission Denied",
    message: "You don't have permission to perform this action.",
  },
};

/**
 * Get a friendly error for a given error code
 */
export function getFriendlyError(code: string): FriendlyError {
  return ERROR_MAP[code] || ERROR_MAP.UNKNOWN;
}

/**
 * Parse error code from error message or object
 */
export function parseErrorCode(error: unknown): string {
  if (!error) return "UNKNOWN";

  // If it's an object with a code
  if (typeof error === "object" && error !== null) {
    const obj = error as Record<string, unknown>;
    if (typeof obj.code === "string") return obj.code;
    if (typeof obj.name === "string" && ERROR_MAP[obj.name]) return obj.name;

    // Check message for known patterns
    const message = String(obj.message || "");
    if (message.includes("401") || message.includes("Unauthorized")) return "AI_UNAUTHORIZED";
    if (message.includes("429") || message.includes("rate limit")) return "AI_RATE_LIMIT";
    if (message.includes("not configured")) return "AI_NOT_CONFIGURED";
  }

  // If it's a string
  if (typeof error === "string") {
    if (ERROR_MAP[error]) return error;
    if (error.includes("401") || error.includes("Unauthorized")) return "AI_UNAUTHORIZED";
    if (error.includes("429") || error.includes("rate limit")) return "AI_RATE_LIMIT";
  }

  return "UNKNOWN";
}

/**
 * Get friendly error from any error input
 */
export function toFriendlyError(error: unknown): FriendlyError {
  const code = parseErrorCode(error);
  return getFriendlyError(code);
}
