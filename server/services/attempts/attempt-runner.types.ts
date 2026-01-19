/**
 * Attempt Runner Types (PR-62)
 * DTOs and interfaces for attempt execution service
 */

export type AttemptStatus = "pending" | "queued" | "running" | "completed" | "failed" | "stopped";

export interface StartAttemptParams {
  projectId: string;
  taskId: string;
  command?: string[];
  mode?: "autopilot" | "manual";
}

export interface StartAttemptResult {
  attemptId: string;
  status: AttemptStatus;
}

export interface AttemptStatusResult {
  attemptId: string;
  status: AttemptStatus;
  startedAt: Date | null;
  finishedAt: Date | null;
  exitCode: number | null;
  error?: string;
}

export interface GetLogsParams {
  attemptId: string;
  cursor?: number;
  limit?: number;
}

export interface LogLine {
  timestamp: Date;
  level: "info" | "warning" | "error";
  message: string;
}

export interface GetLogsResult {
  lines: LogLine[];
  nextCursor?: number;
}

export interface RunAttemptResult {
  ok: boolean;
  error?: string;
}
