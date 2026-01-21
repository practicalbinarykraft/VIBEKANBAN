/** Factory Error Normalizer (PR-92) - Convert any error to FactoryError */
import {
  FactoryErrorCode,
  type FactoryError,
  isFactoryError,
  createFactoryError,
} from "@/types/factory-errors";

const MAX_DETAILS_LENGTH = 200;

/** Pattern matchers for error classification */
const ERROR_PATTERNS: Array<{ pattern: RegExp; code: FactoryErrorCode }> = [
  { pattern: /budget/i, code: FactoryErrorCode.BUDGET_EXCEEDED },
  { pattern: /ai.*(not|un).*config/i, code: FactoryErrorCode.AI_NOT_CONFIGURED },
  { pattern: /provider.*not.*config/i, code: FactoryErrorCode.AI_NOT_CONFIGURED },
  { pattern: /queue.*(corrupt|invalid|broken)/i, code: FactoryErrorCode.QUEUE_CORRUPTED },
  { pattern: /fail.*start.*attempt/i, code: FactoryErrorCode.ATTEMPT_START_FAILED },
  { pattern: /fail.*cancel.*attempt/i, code: FactoryErrorCode.ATTEMPT_CANCEL_FAILED },
  { pattern: /worker.*(crash|died|exit)/i, code: FactoryErrorCode.WORKER_CRASHED },
];

/** Detect error code from message */
function detectErrorCode(message: string): FactoryErrorCode {
  for (const { pattern, code } of ERROR_PATTERNS) {
    if (pattern.test(message)) {
      return code;
    }
  }
  return FactoryErrorCode.UNKNOWN;
}

/** Extract message from unknown error */
function extractMessage(err: unknown): string {
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null) {
    const obj = err as Record<string, unknown>;
    if (typeof obj.message === "string") return obj.message;
  }
  return "Unknown error occurred";
}

/** Extract truncated stack trace for details */
function extractDetails(err: unknown): string | undefined {
  if (!(err instanceof Error) || !err.stack) return undefined;
  const stack = err.stack;
  if (stack.length <= MAX_DETAILS_LENGTH) return stack;
  return stack.slice(0, MAX_DETAILS_LENGTH - 3) + "...";
}

/**
 * Convert any error to a normalized FactoryError
 * - Passes through existing FactoryError unchanged
 * - Classifies errors by message patterns
 * - Never exposes raw stack traces in message
 */
export function toFactoryError(err: unknown): FactoryError {
  // Pass through existing FactoryError
  if (isFactoryError(err)) {
    return err;
  }

  const message = extractMessage(err);
  const code = detectErrorCode(message);
  const details = extractDetails(err);

  return createFactoryError(code, message, details);
}
