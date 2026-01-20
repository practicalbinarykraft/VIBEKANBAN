/** Factory Events Service (PR-84) - Snapshot and diff for SSE events */
import { db } from "@/server/db";
import { autopilotRuns, attempts, logs } from "@/server/db/schema";
import { eq, desc } from "drizzle-orm";

export interface AttemptSnapshot {
  id: string;
  taskId: string;
  status: string;
  lastLogLine: string | null;
}

export interface FactorySnapshot {
  runId: string;
  runStatus: string;
  attempts: AttemptSnapshot[];
  counts: { total: number; completed: number; failed: number; cancelled: number; running: number; queued: number };
}

export type FactoryEvent =
  | { type: "run"; runId: string; status: string }
  | { type: "attempt"; attemptId: string; taskId: string; status: string }
  | { type: "log"; attemptId: string; line: string }
  | { type: "summary"; counts: FactorySnapshot["counts"] };

interface RunRecord { id: string; status: string; }
interface AttemptRecord { id: string; taskId: string; status: string; }

export interface FactoryEventsDeps {
  getLatestRun: (projectId: string) => Promise<RunRecord | null>;
  getAttemptsByRunId: (runId: string) => Promise<AttemptRecord[]>;
  getLastLogLine: (attemptId: string) => Promise<string | null>;
}

async function defaultGetLatestRun(projectId: string): Promise<RunRecord | null> {
  const run = await db.select({ id: autopilotRuns.id, status: autopilotRuns.status })
    .from(autopilotRuns).where(eq(autopilotRuns.projectId, projectId))
    .orderBy(desc(autopilotRuns.startedAt)).limit(1).get();
  return run ?? null;
}

async function defaultGetAttemptsByRunId(runId: string): Promise<AttemptRecord[]> {
  return db.select({ id: attempts.id, taskId: attempts.taskId, status: attempts.status })
    .from(attempts).where(eq(attempts.autopilotRunId, runId));
}

async function defaultGetLastLogLine(attemptId: string): Promise<string | null> {
  const log = await db.select({ message: logs.message })
    .from(logs).where(eq(logs.attemptId, attemptId))
    .orderBy(desc(logs.timestamp)).limit(1).get();
  return log?.message ?? null;
}

const defaultDeps: FactoryEventsDeps = {
  getLatestRun: defaultGetLatestRun,
  getAttemptsByRunId: defaultGetAttemptsByRunId,
  getLastLogLine: defaultGetLastLogLine,
};

export async function getFactorySnapshot(
  projectId: string,
  deps: FactoryEventsDeps = defaultDeps
): Promise<FactorySnapshot | null> {
  const run = await deps.getLatestRun(projectId);
  if (!run) return null;

  const attemptRecords = await deps.getAttemptsByRunId(run.id);
  const attemptSnapshots: AttemptSnapshot[] = [];
  const counts = { total: 0, completed: 0, failed: 0, cancelled: 0, running: 0, queued: 0 };

  for (const att of attemptRecords) {
    const lastLogLine = await deps.getLastLogLine(att.id);
    attemptSnapshots.push({ id: att.id, taskId: att.taskId, status: att.status, lastLogLine });
    counts.total++;
    if (att.status === "completed") counts.completed++;
    else if (att.status === "failed") counts.failed++;
    else if (att.status === "stopped") counts.cancelled++;
    else if (att.status === "running") counts.running++;
    else if (att.status === "queued" || att.status === "pending") counts.queued++;
  }

  return { runId: run.id, runStatus: run.status, attempts: attemptSnapshots, counts };
}

export function diffSnapshots(prev: FactorySnapshot, next: FactorySnapshot): FactoryEvent[] {
  const events: FactoryEvent[] = [];

  if (prev.runStatus !== next.runStatus) {
    events.push({ type: "run", runId: next.runId, status: next.runStatus });
  }

  const prevAttempts = new Map(prev.attempts.map((a) => [a.id, a]));
  for (const att of next.attempts) {
    const prevAtt = prevAttempts.get(att.id);
    if (!prevAtt) {
      events.push({ type: "attempt", attemptId: att.id, taskId: att.taskId, status: att.status });
      if (att.lastLogLine) events.push({ type: "log", attemptId: att.id, line: att.lastLogLine });
    } else {
      if (prevAtt.status !== att.status) {
        events.push({ type: "attempt", attemptId: att.id, taskId: att.taskId, status: att.status });
      }
      if (prevAtt.lastLogLine !== att.lastLogLine && att.lastLogLine) {
        events.push({ type: "log", attemptId: att.id, line: att.lastLogLine });
      }
    }
  }

  if (JSON.stringify(prev.counts) !== JSON.stringify(next.counts)) {
    events.push({ type: "summary", counts: next.counts });
  }

  return events;
}
