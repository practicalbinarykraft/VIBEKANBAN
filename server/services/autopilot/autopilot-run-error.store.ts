/**
 * Autopilot Run Error Store (PR-77)
 * Serialize/deserialize AutopilotError to/from string for DB storage.
 */
import { isAutopilotError, type AutopilotError } from "@/types/autopilot-errors";

/**
 * Serialize AutopilotError to JSON string for storage in autopilot_runs.error
 */
export function serializeRunError(err: AutopilotError): string {
  return JSON.stringify(err);
}

/**
 * Deserialize error string from autopilot_runs.error to AutopilotError.
 * - If null → return null
 * - If valid JSON with valid code → return AutopilotError
 * - If plain string or invalid JSON → return {code: "UNKNOWN", message: raw}
 */
export function deserializeRunError(raw: string | null): AutopilotError | null {
  if (raw === null) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);

    if (isAutopilotError(parsed)) {
      return parsed;
    }

    // JSON but not valid AutopilotError structure
    if (typeof parsed === "object" && parsed !== null && typeof parsed.message === "string") {
      return {
        code: "UNKNOWN",
        message: parsed.message,
      };
    }

    // JSON but no message field
    return {
      code: "UNKNOWN",
      message: raw,
    };
  } catch {
    // Not valid JSON, treat as plain string message
    return {
      code: "UNKNOWN",
      message: raw,
    };
  }
}
