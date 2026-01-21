/** Factory error types (PR-92, PR-101) */

export enum FactoryErrorCode {
  // PR-92: Runtime errors
  BUDGET_EXCEEDED = "BUDGET_EXCEEDED",
  AI_NOT_CONFIGURED = "AI_NOT_CONFIGURED",
  QUEUE_CORRUPTED = "QUEUE_CORRUPTED",
  ATTEMPT_START_FAILED = "ATTEMPT_START_FAILED",
  ATTEMPT_CANCEL_FAILED = "ATTEMPT_CANCEL_FAILED",
  WORKER_CRASHED = "WORKER_CRASHED",
  UNKNOWN = "UNKNOWN",
  // PR-101: Preflight & guardrail errors
  FACTORY_ALREADY_RUNNING = "FACTORY_ALREADY_RUNNING",
  FACTORY_PREFLIGHT_FAILED = "FACTORY_PREFLIGHT_FAILED",
  FACTORY_BUDGET_EXCEEDED = "FACTORY_BUDGET_EXCEEDED",
  FACTORY_REPO_DIRTY = "FACTORY_REPO_DIRTY",
  FACTORY_GH_NOT_AUTHED = "FACTORY_GH_NOT_AUTHED",
  FACTORY_PERMISSION_DENIED = "FACTORY_PERMISSION_DENIED",
  FACTORY_INVALID_CONFIG = "FACTORY_INVALID_CONFIG",
  FACTORY_NO_DEFAULT_BRANCH = "FACTORY_NO_DEFAULT_BRANCH",
}

export interface FactoryError {
  code: FactoryErrorCode;
  message: string;
  details?: string;
}

/** Type guard for FactoryError */
export function isFactoryError(value: unknown): value is FactoryError {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.code === "string" &&
    Object.values(FactoryErrorCode).includes(obj.code as FactoryErrorCode) &&
    typeof obj.message === "string"
  );
}

/** Type guard for FactoryErrorCode */
export function isFactoryErrorCode(value: unknown): value is FactoryErrorCode {
  return typeof value === "string" && Object.values(FactoryErrorCode).includes(value as FactoryErrorCode);
}

/** Create a FactoryError from code and message */
export function createFactoryError(
  code: FactoryErrorCode,
  message: string,
  details?: string
): FactoryError {
  return { code, message, ...(details ? { details } : {}) };
}

/** Human-readable messages for preflight error codes (PR-101) */
export const FACTORY_ERROR_MESSAGES: Partial<Record<FactoryErrorCode, string>> = {
  [FactoryErrorCode.FACTORY_ALREADY_RUNNING]: "Factory is already running for this project",
  [FactoryErrorCode.FACTORY_PREFLIGHT_FAILED]: "Preflight checks failed",
  [FactoryErrorCode.FACTORY_BUDGET_EXCEEDED]: "Budget limit exceeded",
  [FactoryErrorCode.FACTORY_REPO_DIRTY]: "Repository has uncommitted changes",
  [FactoryErrorCode.FACTORY_GH_NOT_AUTHED]: "GitHub CLI is not authenticated",
  [FactoryErrorCode.FACTORY_PERMISSION_DENIED]: "No push permission to repository",
  [FactoryErrorCode.FACTORY_INVALID_CONFIG]: "Invalid configuration",
  [FactoryErrorCode.FACTORY_NO_DEFAULT_BRANCH]: "Default branch does not exist",
};
