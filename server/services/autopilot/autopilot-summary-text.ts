/**
 * Autopilot Summary Text (PR-79)
 * Generates summary text based on run status and error.
 */
import { deserializeRunError } from "./autopilot-run-error.store";
import { getGuidanceForError } from "./autopilot-error-guidance";

export type SummaryStatus = "COMPLETED" | "FAILED" | "CANCELLED" | "RUNNING" | "IDLE";

export interface SummaryTextInput {
  status: SummaryStatus;
  runError?: string | null;
}

/**
 * Get summary text for autopilot run based on status and error.
 * Uses error guidance from PR-77 for structured errors.
 */
export function getAutopilotSummaryText(input: SummaryTextInput): string {
  const { status, runError } = input;

  switch (status) {
    case "COMPLETED":
      return "Review results and merge when ready.";

    case "CANCELLED":
      return "You can start again anytime.";

    case "FAILED": {
      // Try to get guidance from structured error
      if (runError) {
        try {
          // Only use guidance if it's valid JSON with a known error code
          const parsed = JSON.parse(runError);
          if (parsed && typeof parsed.code === "string") {
            const error = deserializeRunError(runError);
            if (error) {
              const guidance = getGuidanceForError(error);
              return guidance.title;
            }
          }
        } catch {
          // Invalid JSON - use fallback
        }
      }
      return "Open details to see logs and guidance.";
    }

    case "RUNNING":
    case "IDLE":
    default:
      return "";
  }
}
