/** Factory Resume Service (PR-85) - Restore factory state from DB */
import { db } from "@/server/db";
import { autopilotRuns, attempts } from "@/server/db/schema";
import { eq, desc } from "drizzle-orm";

export type ResumeStatus = "running" | "cancelled" | "completed" | "failed" | "idle";

export interface ResumeState {
  runId: string | null;
  status: ResumeStatus;
  maxParallel: number;
  queuedTaskIds: string[];
  runningTaskIds: string[];
}

interface RunRecord {
  id: string;
  status: string;
}

interface AttemptRecord {
  id: string;
  taskId: string;
  status: string;
}

export interface FactoryResumeDeps {
  getLatestRun: (projectId: string) => Promise<RunRecord | null>;
  getAttemptsByRun: (runId: string) => Promise<AttemptRecord[]>;
}

const DEFAULT_MAX_PARALLEL = 3;

async function defaultGetLatestRun(projectId: string): Promise<RunRecord | null> {
  const run = await db.select({ id: autopilotRuns.id, status: autopilotRuns.status })
    .from(autopilotRuns)
    .where(eq(autopilotRuns.projectId, projectId))
    .orderBy(desc(autopilotRuns.startedAt))
    .limit(1)
    .get();
  return run ?? null;
}

async function defaultGetAttemptsByRun(runId: string): Promise<AttemptRecord[]> {
  const rows = await db.select({
    id: attempts.id,
    taskId: attempts.taskId,
    status: attempts.status,
  })
    .from(attempts)
    .where(eq(attempts.autopilotRunId, runId));
  return rows;
}

const defaultDeps: FactoryResumeDeps = {
  getLatestRun: defaultGetLatestRun,
  getAttemptsByRun: defaultGetAttemptsByRun,
};

/**
 * Get resume state from database for factory recovery after restart
 */
export async function getResumeState(
  projectId: string,
  deps: FactoryResumeDeps = defaultDeps
): Promise<ResumeState> {
  const run = await deps.getLatestRun(projectId);

  if (!run) {
    return {
      runId: null,
      status: "idle",
      maxParallel: DEFAULT_MAX_PARALLEL,
      queuedTaskIds: [],
      runningTaskIds: [],
    };
  }

  const attemptRecords = await deps.getAttemptsByRun(run.id);

  const queuedTaskIds: string[] = [];
  const runningTaskIds: string[] = [];

  for (const att of attemptRecords) {
    if (att.status === "queued" || att.status === "pending") {
      queuedTaskIds.push(att.taskId);
    } else if (att.status === "running") {
      runningTaskIds.push(att.taskId);
    }
  }

  return {
    runId: run.id,
    status: run.status as ResumeStatus,
    maxParallel: DEFAULT_MAX_PARALLEL,
    queuedTaskIds,
    runningTaskIds,
  };
}
