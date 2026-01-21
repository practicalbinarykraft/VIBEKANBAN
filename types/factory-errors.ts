/** Factory error types (PR-92) */

export enum FactoryErrorCode {
  BUDGET_EXCEEDED = "BUDGET_EXCEEDED",
  AI_NOT_CONFIGURED = "AI_NOT_CONFIGURED",
  QUEUE_CORRUPTED = "QUEUE_CORRUPTED",
  ATTEMPT_START_FAILED = "ATTEMPT_START_FAILED",
  ATTEMPT_CANCEL_FAILED = "ATTEMPT_CANCEL_FAILED",
  WORKER_CRASHED = "WORKER_CRASHED",
  UNKNOWN = "UNKNOWN",
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
