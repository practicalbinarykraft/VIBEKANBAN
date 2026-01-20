/**
 * Derived Autopilot Status Service (PR-76)
 * Computes autopilot status deterministically from database state.
 * Single source of truth - no in-memory state machine.
 */
import { db } from "@/server/db";
import { autopilotRuns, attempts } from "@/server/db/schema";
import { eq, desc } from "drizzle-orm";

export type DerivedAutopilotStatus =
  | "IDLE"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export interface DerivedAutopilotStatusResult {
  status: DerivedAutopilotStatus;
  runId: string | null;
  activeAttempts: number;
  failedAttempts: number;
  completedAttempts: number;
}

// Attempt statuses considered "active" (still in progress)
const ACTIVE_STATUSES = ["running", "queued", "pending"];

/**
 * Get derived autopilot status for a project.
 * Status is computed from:
 * - autopilot_runs table (latest run by startedAt)
 * - attempts table (linked by autopilotRunId)
 */
export async function getDerivedAutopilotStatus(
  projectId: string
): Promise<DerivedAutopilotStatusResult> {
  // 1. Find latest autopilot run for this project
  const runs = await db
    .select()
    .from(autopilotRuns)
    .where(eq(autopilotRuns.projectId, projectId))
    .orderBy(desc(autopilotRuns.startedAt))
    .limit(1);

  // No runs found → IDLE
  if (runs.length === 0) {
    return {
      status: "IDLE",
      runId: null,
      activeAttempts: 0,
      failedAttempts: 0,
      completedAttempts: 0,
    };
  }

  const run = runs[0];

  // 2. Get all attempts for this run
  const runAttempts = await db
    .select()
    .from(attempts)
    .where(eq(attempts.autopilotRunId, run.id));

  // Count attempt statuses
  const activeAttempts = runAttempts.filter((a) =>
    ACTIVE_STATUSES.includes(a.status)
  ).length;
  const failedAttempts = runAttempts.filter((a) => a.status === "failed").length;
  const completedAttempts = runAttempts.filter(
    (a) => a.status === "completed"
  ).length;

  // 3. Compute derived status based on rules
  let status: DerivedAutopilotStatus;

  switch (run.status) {
    case "running":
      // Run is running → RUNNING (even if no active attempts - transitional state)
      status = "RUNNING";
      break;

    case "completed":
      // Run completed: check if any failed
      if (failedAttempts > 0) {
        status = "FAILED";
      } else {
        status = "COMPLETED";
      }
      break;

    case "failed":
      status = "FAILED";
      break;

    case "cancelled":
      status = "CANCELLED";
      break;

    default:
      // Unknown status → IDLE
      status = "IDLE";
  }

  return {
    status,
    runId: run.id,
    activeAttempts,
    failedAttempts,
    completedAttempts,
  };
}
