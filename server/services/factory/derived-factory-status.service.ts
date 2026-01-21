/** Derived Factory Status Service (PR-109) - Compute status from DB state */
import { db } from "@/server/db";
import { factoryRuns, attempts } from "@/server/db/schema";
import { eq, desc, and, inArray } from "drizzle-orm";

export type DerivedFactoryStatus = "idle" | "running" | "completed" | "failed" | "cancelled";

export interface DerivedStatusResult {
  status: DerivedFactoryStatus;
  runId: string | null;
  hasFailedAttempts: boolean;
}

export interface DerivedStatusDeps {
  getLatestRun: (projectId: string) => Promise<{ id: string; status: string } | null>;
  hasFailedAttempts: (runId: string) => Promise<boolean>;
}

async function defaultGetLatestRun(projectId: string): Promise<{ id: string; status: string } | null> {
  const run = await db
    .select({ id: factoryRuns.id, status: factoryRuns.status })
    .from(factoryRuns)
    .where(eq(factoryRuns.projectId, projectId))
    .orderBy(desc(factoryRuns.startedAt))
    .limit(1)
    .get();
  return run ?? null;
}

async function defaultHasFailedAttempts(runId: string): Promise<boolean> {
  const failed = await db
    .select({ id: attempts.id })
    .from(attempts)
    .where(and(eq(attempts.factoryRunId, runId), eq(attempts.status, "failed")))
    .limit(1)
    .get();
  return !!failed;
}

const defaultDeps: DerivedStatusDeps = {
  getLatestRun: defaultGetLatestRun,
  hasFailedAttempts: defaultHasFailedAttempts,
};

/**
 * Derive factory status from database state
 * Status is computed, not stored - ensures consistency
 */
export async function getDerivedFactoryStatus(
  projectId: string,
  deps: DerivedStatusDeps = defaultDeps
): Promise<DerivedStatusResult> {
  const run = await deps.getLatestRun(projectId);

  // No runs → IDLE
  if (!run) {
    return { status: "idle", runId: null, hasFailedAttempts: false };
  }

  const runId = run.id;
  const runStatus = run.status;

  // Running → RUNNING
  if (runStatus === "running") {
    return { status: "running", runId, hasFailedAttempts: false };
  }

  // Cancelled → CANCELLED
  if (runStatus === "cancelled") {
    return { status: "cancelled", runId, hasFailedAttempts: false };
  }

  // Failed → FAILED
  if (runStatus === "failed") {
    return { status: "failed", runId, hasFailedAttempts: true };
  }

  // Completed: check for failed attempts
  if (runStatus === "completed") {
    const hasFailed = await deps.hasFailedAttempts(runId);
    if (hasFailed) {
      return { status: "failed", runId, hasFailedAttempts: true };
    }
    return { status: "completed", runId, hasFailedAttempts: false };
  }

  // Unknown status → treat as idle
  return { status: "idle", runId, hasFailedAttempts: false };
}
