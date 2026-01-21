/** Factory Results Service (PR-89) - Get latest factory run results */
import { db } from "@/server/db";
import { autopilotRuns, attempts } from "@/server/db/schema";
import { eq, desc } from "drizzle-orm";

export type FactoryResultStatus = "idle" | "running" | "stopped" | "completed" | "failed";
export type AttemptStatus = "queued" | "running" | "completed" | "failed" | "stopped";

export interface FactoryAttemptResult {
  taskId: number;
  attemptId: string;
  status: AttemptStatus;
  prUrl: string | null;
  updatedAt: string;
}

export interface FactoryResultsResponse {
  runId: string | null;
  status: FactoryResultStatus;
  totals: { queued: number; running: number; completed: number; failed: number };
  attempts: FactoryAttemptResult[];
}

type RunRecord = { id: string; status: string };
type AttemptRecord = {
  id: string;
  taskId: string;
  status: string;
  prUrl: string | null;
  updatedAt: Date;
};

export interface FactoryResultsDeps {
  getLatestRun: (projectId: string) => Promise<RunRecord | null>;
  getAttemptsByRunId: (runId: string) => Promise<AttemptRecord[]>;
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

async function defaultGetAttemptsByRunId(runId: string): Promise<AttemptRecord[]> {
  const rows = await db.select({
    id: attempts.id,
    taskId: attempts.taskId,
    status: attempts.status,
    prUrl: attempts.prUrl,
    updatedAt: attempts.finishedAt,
  })
    .from(attempts)
    .where(eq(attempts.autopilotRunId, runId));

  return rows.map(r => ({
    id: r.id,
    taskId: r.taskId,
    status: r.status,
    prUrl: r.prUrl ?? null,
    updatedAt: r.updatedAt ?? new Date(),
  }));
}

const defaultDeps: FactoryResultsDeps = {
  getLatestRun: defaultGetLatestRun,
  getAttemptsByRunId: defaultGetAttemptsByRunId,
};

function mapStatus(status: string): AttemptStatus {
  const valid: AttemptStatus[] = ["queued", "running", "completed", "failed", "stopped"];
  if (valid.includes(status as AttemptStatus)) return status as AttemptStatus;
  if (status === "pending") return "queued";
  return "queued";
}

function mapRunStatus(status: string): FactoryResultStatus {
  if (status === "running") return "running";
  if (status === "completed") return "completed";
  if (status === "failed") return "failed";
  if (status === "cancelled" || status === "stopped") return "stopped";
  return "idle";
}

export async function getFactoryResults(
  projectId: string,
  deps: FactoryResultsDeps = defaultDeps
): Promise<FactoryResultsResponse> {
  const run = await deps.getLatestRun(projectId);

  if (!run) {
    return {
      runId: null,
      status: "idle",
      totals: { queued: 0, running: 0, completed: 0, failed: 0 },
      attempts: [],
    };
  }

  const attemptRecords = await deps.getAttemptsByRunId(run.id);

  // Sort by updatedAt desc (newest first)
  attemptRecords.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  // Compute totals
  const totals = { queued: 0, running: 0, completed: 0, failed: 0 };
  for (const a of attemptRecords) {
    const s = mapStatus(a.status);
    if (s === "queued") totals.queued++;
    else if (s === "running") totals.running++;
    else if (s === "completed") totals.completed++;
    else if (s === "failed" || s === "stopped") totals.failed++;
  }

  const resultAttempts: FactoryAttemptResult[] = attemptRecords.map(a => ({
    taskId: parseInt(a.taskId, 10) || 0,
    attemptId: a.id,
    status: mapStatus(a.status),
    prUrl: a.prUrl,
    updatedAt: a.updatedAt.toISOString(),
  }));

  return {
    runId: run.id,
    status: mapRunStatus(run.status),
    totals,
    attempts: resultAttempts,
  };
}
