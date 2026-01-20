/** Factory Status Service (PR-83) - Get current factory status for a project */
import { db } from "@/server/db";
import { autopilotRuns, attempts } from "@/server/db/schema";
import { eq, desc, and, inArray, sql } from "drizzle-orm";

export type FactoryRunStatus = "idle" | "running" | "completed" | "failed" | "cancelled";

export interface FactoryStatus {
  hasRun: boolean;
  runId: string | null;
  status: FactoryRunStatus;
  total: number;
  completed: number;
  failed: number;
  cancelled: number;
  running: number;
  queued: number;
}

interface RunRecord { id: string; status: string; }
interface AttemptCounts { total: number; completed: number; failed: number; cancelled: number; running: number; queued: number; }

export interface FactoryStatusDeps {
  getLatestRun: (projectId: string) => Promise<RunRecord | null>;
  countAttemptsByStatus: (runId: string) => Promise<AttemptCounts>;
}

async function defaultGetLatestRun(projectId: string): Promise<RunRecord | null> {
  const run = await db.select({ id: autopilotRuns.id, status: autopilotRuns.status })
    .from(autopilotRuns)
    .where(eq(autopilotRuns.projectId, projectId))
    .orderBy(desc(autopilotRuns.startedAt))
    .limit(1)
    .get();
  return run ?? null;
}

async function defaultCountAttemptsByStatus(runId: string): Promise<AttemptCounts> {
  const rows = await db.select({ status: attempts.status })
    .from(attempts)
    .where(eq(attempts.autopilotRunId, runId));

  const counts: AttemptCounts = { total: 0, completed: 0, failed: 0, cancelled: 0, running: 0, queued: 0 };
  for (const row of rows) {
    counts.total++;
    if (row.status === "completed") counts.completed++;
    else if (row.status === "failed") counts.failed++;
    else if (row.status === "stopped") counts.cancelled++;
    else if (row.status === "running") counts.running++;
    else if (row.status === "queued" || row.status === "pending") counts.queued++;
  }
  return counts;
}

const defaultDeps: FactoryStatusDeps = {
  getLatestRun: defaultGetLatestRun,
  countAttemptsByStatus: defaultCountAttemptsByStatus,
};

export async function getFactoryStatus(
  projectId: string,
  deps: FactoryStatusDeps = defaultDeps
): Promise<FactoryStatus> {
  const run = await deps.getLatestRun(projectId);

  if (!run) {
    return {
      hasRun: false, runId: null, status: "idle",
      total: 0, completed: 0, failed: 0, cancelled: 0, running: 0, queued: 0,
    };
  }

  const counts = await deps.countAttemptsByStatus(run.id);

  return {
    hasRun: true,
    runId: run.id,
    status: run.status as FactoryRunStatus,
    ...counts,
  };
}
