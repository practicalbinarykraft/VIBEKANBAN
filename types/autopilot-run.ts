/** Autopilot Run Types (PR-65) - Run history and details */

export type RunStatus = "idle" | "running" | "stopped" | "failed" | "done";

export type AttemptStatus = "pending" | "queued" | "running" | "completed" | "failed" | "stopped";

export interface RunSummary {
  runId: string;
  projectId: string;
  status: RunStatus;
  startedAt: string | null;
  finishedAt: string | null;
  totalTasks: number;
  doneTasks: number;
  failedTasks: number;
}

export interface AttemptSummary {
  attemptId: string;
  taskId: string;
  taskTitle: string;
  status: AttemptStatus;
  startedAt: string | null;
  finishedAt: string | null;
  exitCode: number | null;
  error: string | null;
}

export interface RunError {
  code: string;
  message: string;
  attemptId?: string;
  taskTitle?: string;
}

export interface RunDetails extends RunSummary {
  attempts: AttemptSummary[];
  errors: RunError[];
}

export interface ListRunsResponse {
  runs: RunSummary[];
}

export interface GetRunResponse {
  run: RunDetails | null;
  error?: string;
}
