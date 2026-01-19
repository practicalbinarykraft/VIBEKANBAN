/**
 * Autopilot Types (PR-61)
 *
 * UI type contracts for Autopilot components.
 * These types are UI-only and don't depend on backend schemas.
 */

/** Status of the autopilot system */
export type AutopilotStatus = "IDLE" | "RUNNING" | "FAILED" | "DONE";

/** Status of a single attempt */
export type AutopilotAttemptStatus = "queued" | "running" | "done" | "failed";

/** Summary of an attempt (for list display) */
export type AutopilotAttemptSummary = {
  id: string;
  status: AutopilotAttemptStatus;
  createdAt: string; // ISO
};

/** Full attempt details (for modal) */
export type AutopilotAttemptDetails = AutopilotAttemptSummary & {
  logs?: string | null;
  resultSummary?: string | null;
};

/** Props for AutopilotPanel component */
export type AutopilotPanelProps = {
  status: AutopilotStatus;
  lastRunAt?: string | null; // ISO or null
  lastError?: string | null;
  attemptCount?: number | null;
  attempts?: AutopilotAttemptSummary[] | null;
  onStart?: () => void;
  onStop?: () => void;
  onOpenAttempt?: (attemptId: string) => void;
};

/** Props for AttemptsList component */
export type AttemptsListProps = {
  attempts: AutopilotAttemptSummary[];
  onOpen?: (attemptId: string) => void;
};

/** Props for AttemptLogModal component */
export type AttemptLogModalProps = {
  isOpen: boolean;
  attempt?: AutopilotAttemptDetails | null;
  onClose: () => void;
};
