/**
 * Autopilot Error Normalizer (PR-77)
 * Normalizes unknown errors to structured AutopilotError.
 */
import {
  isAutopilotError,
  isAutopilotErrorCode,
  type AutopilotError,
} from "@/types/autopilot-errors";

/**
 * Normalize any input to a structured AutopilotError.
 * Rules:
 * - Already AutopilotError → return as-is
 * - Error → {code: "UNKNOWN", message: err.message}
 * - string → {code: "UNKNOWN", message: string}
 * - object with valid code → accept
 * - otherwise → UNKNOWN + "Unknown error"
 */
export function normalizeAutopilotError(input: unknown): AutopilotError {
  // Already valid AutopilotError
  if (isAutopilotError(input)) {
    return input;
  }

  // Error instance
  if (input instanceof Error) {
    return {
      code: "UNKNOWN",
      message: input.message,
    };
  }

  // String
  if (typeof input === "string") {
    return {
      code: "UNKNOWN",
      message: input,
    };
  }

  // Object with potential code/message
  if (typeof input === "object" && input !== null) {
    const obj = input as Record<string, unknown>;

    if (typeof obj.message === "string") {
      // Has message, check if code is valid
      if (isAutopilotErrorCode(obj.code)) {
        return {
          code: obj.code,
          message: obj.message,
          meta: typeof obj.meta === "object" ? (obj.meta as Record<string, unknown>) : undefined,
        };
      }
      // Invalid code but has message
      return {
        code: "UNKNOWN",
        message: obj.message,
      };
    }
  }

  // Fallback for garbage
  return {
    code: "UNKNOWN",
    message: "Unknown error",
  };
}
