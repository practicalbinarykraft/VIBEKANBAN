/** Factory Constants (PR-105) - Shared constants for client/server */

export const RUNNABLE_STATUSES = ["todo", "in_progress", "in_review"] as const;

export type RunnableStatus = typeof RUNNABLE_STATUSES[number];

export function isRunnableStatus(status: string): status is RunnableStatus {
  return RUNNABLE_STATUSES.includes(status as RunnableStatus);
}
