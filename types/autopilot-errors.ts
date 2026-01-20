/**
 * Autopilot Error Types (PR-77)
 * Structured error codes and types for autopilot/execution errors.
 */

export type AutopilotErrorCode =
  | "AI_NOT_CONFIGURED"
  | "BUDGET_EXCEEDED"
  | "EMPTY_DIFF"
  | "REPO_NOT_READY"
  | "OPEN_PR_LIMIT"
  | "GIT_ERROR"
  | "CANCELLED_BY_USER"
  | "UNKNOWN";

export interface AutopilotError {
  code: AutopilotErrorCode;
  message: string;
  meta?: Record<string, unknown>;
}

const validCodes: Set<string> = new Set([
  "AI_NOT_CONFIGURED",
  "BUDGET_EXCEEDED",
  "EMPTY_DIFF",
  "REPO_NOT_READY",
  "OPEN_PR_LIMIT",
  "GIT_ERROR",
  "CANCELLED_BY_USER",
  "UNKNOWN",
]);

export function isAutopilotErrorCode(code: unknown): code is AutopilotErrorCode {
  return typeof code === "string" && validCodes.has(code);
}

export function isAutopilotError(x: unknown): x is AutopilotError {
  if (typeof x !== "object" || x === null) return false;
  const obj = x as Record<string, unknown>;
  return (
    isAutopilotErrorCode(obj.code) &&
    typeof obj.message === "string"
  );
}
