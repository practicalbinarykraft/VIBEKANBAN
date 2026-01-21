/** Factory Diagnostics Service (PR-109) - Operator visibility into factory state */
import { db } from "@/server/db";
import { factoryRuns, attempts, logs } from "@/server/db/schema";
import { eq, desc, and, inArray, gte } from "drizzle-orm";
import { getGlobalWorkerRegistry } from "./factory-worker-registry";

export type StuckReason =
  | "NO_RUNNABLE_TASKS"
  | "PREFLIGHT_FAILED"
  | "WORKER_NOT_ACTIVE"
  | "NO_LOGS_RECENTLY"
  | null;

export interface DiagnosticsResult {
  lastEventAt: Date | null;
  stuckReason: StuckReason;
  workerActive: boolean;
  queuedCount: number;
  runningCount: number;
}

export interface DiagnosticsDeps {
  getLatestRun: (projectId: string) => Promise<{ id: string; status: string; error: string | null } | null>;
  getAttemptCounts: (runId: string) => Promise<{ queued: number; running: number; total: number }>;
  getLastLogTime: (runId: string) => Promise<Date | null>;
  isWorkerActive: (projectId: string) => boolean;
}

const STALE_LOG_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

async function defaultGetLatestRun(projectId: string) {
  const run = await db
    .select({ id: factoryRuns.id, status: factoryRuns.status, error: factoryRuns.error })
    .from(factoryRuns)
    .where(eq(factoryRuns.projectId, projectId))
    .orderBy(desc(factoryRuns.startedAt))
    .limit(1)
    .get();
  return run ?? null;
}

async function defaultGetAttemptCounts(runId: string) {
  const rows = await db
    .select({ status: attempts.status })
    .from(attempts)
    .where(eq(attempts.factoryRunId, runId));

  let queued = 0, running = 0, total = 0;
  for (const row of rows) {
    total++;
    if (row.status === "queued") queued++;
    if (row.status === "running") running++;
  }
  return { queued, running, total };
}

async function defaultGetLastLogTime(runId: string): Promise<Date | null> {
  const attemptIds = await db
    .select({ id: attempts.id })
    .from(attempts)
    .where(eq(attempts.factoryRunId, runId));

  if (attemptIds.length === 0) return null;

  const ids = attemptIds.map((a) => a.id);
  const lastLog = await db
    .select({ timestamp: logs.timestamp })
    .from(logs)
    .where(inArray(logs.attemptId, ids))
    .orderBy(desc(logs.timestamp))
    .limit(1)
    .get();

  return lastLog?.timestamp ?? null;
}

function defaultIsWorkerActive(projectId: string): boolean {
  const registry = getGlobalWorkerRegistry();
  return registry.has(projectId);
}

const defaultDeps: DiagnosticsDeps = {
  getLatestRun: defaultGetLatestRun,
  getAttemptCounts: defaultGetAttemptCounts,
  getLastLogTime: defaultGetLastLogTime,
  isWorkerActive: defaultIsWorkerActive,
};

/**
 * Get diagnostics for a factory run
 * Only facts - no guesses
 */
export async function getFactoryDiagnostics(
  projectId: string,
  deps: DiagnosticsDeps = defaultDeps
): Promise<DiagnosticsResult> {
  const run = await deps.getLatestRun(projectId);

  if (!run || run.status !== "running") {
    return {
      lastEventAt: null,
      stuckReason: null,
      workerActive: false,
      queuedCount: 0,
      runningCount: 0,
    };
  }

  const workerActive = deps.isWorkerActive(projectId);
  const counts = await deps.getAttemptCounts(run.id);
  const lastLogTime = await deps.getLastLogTime(run.id);
  const now = Date.now();

  // Determine stuck reason (facts only)
  let stuckReason: StuckReason = null;

  if (!workerActive) {
    stuckReason = "WORKER_NOT_ACTIVE";
  } else if (run.error?.includes("preflight")) {
    stuckReason = "PREFLIGHT_FAILED";
  } else if (counts.total === 0) {
    stuckReason = "NO_RUNNABLE_TASKS";
  } else if (lastLogTime && now - lastLogTime.getTime() > STALE_LOG_THRESHOLD_MS) {
    stuckReason = "NO_LOGS_RECENTLY";
  }

  return {
    lastEventAt: lastLogTime,
    stuckReason,
    workerActive,
    queuedCount: counts.queued,
    runningCount: counts.running,
  };
}
