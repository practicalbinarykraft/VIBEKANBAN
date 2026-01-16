/**
 * Execution Result Contract
 *
 * Standard result type for all agent/task execution operations.
 * Used across task runner, autopilot, and manual execution.
 */

export interface ExecutionError {
  code:
    | "REPO_NOT_READY"
    | "REPO_NOT_FOUND"
    | "DIRTY_WORKTREE"
    | "NO_REMOTE"
    | "EMPTY_DIFF"
    | "GIT_ERROR"
    | "AI_ERROR"
    | "UNKNOWN";
  message: string;
}

export interface ChangedFile {
  path: string;
  additions?: number;
  deletions?: number;
  status?: "added" | "modified" | "deleted";
}

export interface ExecutionResult {
  ok: boolean;
  error?: ExecutionError;
  repoPath?: string;
  branchName?: string;
  changedFiles?: ChangedFile[];
  diffSummary?: string; // e.g., "3 files changed, 42 insertions, 10 deletions"
  commitSha?: string;
  prUrl?: string;
  prNumber?: number;
  logs?: string[];
}

/**
 * Create a success result
 */
export function successResult(data: Omit<ExecutionResult, "ok">): ExecutionResult {
  return { ok: true, ...data };
}

/**
 * Create an error result
 */
export function errorResult(
  code: ExecutionError["code"],
  message: string,
  logs?: string[]
): ExecutionResult {
  return {
    ok: false,
    error: { code, message },
    logs,
  };
}
