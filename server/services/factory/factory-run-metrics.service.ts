/** Factory Run Metrics Service (PR-94) - Timeline + Throughput analytics */
import { db } from "@/server/db";
import { attempts, factoryRuns } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export interface AttemptRecord {
  id: string;
  status: string;
  startedAt: Date | null;
  finishedAt: Date | null;
}

export interface FactoryRunMetricsDeps {
  getAttemptsByRunId: (runId: string) => Promise<AttemptRecord[]>;
  getFactoryRun: (runId: string) => Promise<{ id: string; startedAt: Date | null } | null>;
}

interface TimelineBucket {
  t: string;
  started: number;
  completed: number;
  failed: number;
}

interface MetricsData {
  runId: string;
  counts: { total: number; completed: number; failed: number; running: number; queued: number };
  durationsSec: { avg: number | null; p50: number | null; p90: number | null };
  throughput: { completedPerMinute: number; windowStart: string | null; windowEnd: string | null };
  timeline: TimelineBucket[];
}

export type FactoryRunMetricsResult =
  | { ok: true; data: MetricsData }
  | { ok: false; error: "RUN_NOT_FOUND" | "INVALID_INPUT" };

interface GetMetricsParams {
  projectId: string;
  runId: string;
  bucketSeconds?: number;
}

async function defaultGetAttemptsByRunId(runId: string): Promise<AttemptRecord[]> {
  return db
    .select({ id: attempts.id, status: attempts.status, startedAt: attempts.startedAt, finishedAt: attempts.finishedAt })
    .from(attempts)
    .where(eq(attempts.factoryRunId, runId));
}

async function defaultGetFactoryRun(runId: string): Promise<{ id: string; startedAt: Date | null } | null> {
  const rows = await db.select({ id: factoryRuns.id, startedAt: factoryRuns.startedAt }).from(factoryRuns).where(eq(factoryRuns.id, runId));
  return rows[0] ?? null;
}

const defaultDeps: FactoryRunMetricsDeps = {
  getAttemptsByRunId: defaultGetAttemptsByRunId,
  getFactoryRun: defaultGetFactoryRun,
};

function computePercentile(sortedArr: number[], p: number): number {
  if (sortedArr.length === 0) return 0;
  const idx = Math.floor(p * (sortedArr.length - 1));
  return sortedArr[idx];
}

function bucketTime(date: Date, bucketSeconds: number): string {
  const ms = date.getTime();
  const bucketMs = Math.floor(ms / (bucketSeconds * 1000)) * (bucketSeconds * 1000);
  return new Date(bucketMs).toISOString();
}

export async function getFactoryRunMetrics(
  params: GetMetricsParams,
  deps: FactoryRunMetricsDeps = defaultDeps
): Promise<FactoryRunMetricsResult> {
  const { runId, bucketSeconds = 60 } = params;

  const run = await deps.getFactoryRun(runId);
  if (!run) {
    return { ok: false, error: "RUN_NOT_FOUND" };
  }

  const attemptRecords = await deps.getAttemptsByRunId(runId);

  // Compute counts
  const counts = { total: attemptRecords.length, completed: 0, failed: 0, running: 0, queued: 0 };
  for (const att of attemptRecords) {
    if (att.status === "completed") counts.completed++;
    else if (att.status === "failed") counts.failed++;
    else if (att.status === "running") counts.running++;
    else counts.queued++; // queued, pending, etc.
  }

  // Compute durations for finished attempts
  const durations: number[] = [];
  for (const att of attemptRecords) {
    if (att.startedAt && att.finishedAt) {
      const sec = Math.round((att.finishedAt.getTime() - att.startedAt.getTime()) / 1000);
      durations.push(sec);
    }
  }
  durations.sort((a, b) => a - b);

  const durationsSec = {
    avg: durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null,
    p50: durations.length > 0 ? computePercentile(durations, 0.5) : null,
    p90: durations.length > 0 ? computePercentile(durations, 0.9) : null,
  };

  // Compute throughput window
  let windowStart: Date | null = run.startedAt;
  let windowEnd: Date | null = null;

  for (const att of attemptRecords) {
    if (att.startedAt && (!windowStart || att.startedAt < windowStart)) {
      windowStart = att.startedAt;
    }
    if (att.finishedAt && (!windowEnd || att.finishedAt > windowEnd)) {
      windowEnd = att.finishedAt;
    }
  }
  if (!windowEnd) windowEnd = new Date();

  const windowMinutes = windowStart && windowEnd ? Math.max(1, (windowEnd.getTime() - windowStart.getTime()) / 60000) : 1;
  const completedPerMinute = Math.round((counts.completed / windowMinutes) * 10) / 10;

  // Build timeline buckets
  const bucketMap = new Map<string, TimelineBucket>();

  for (const att of attemptRecords) {
    if (att.startedAt) {
      const t = bucketTime(att.startedAt, bucketSeconds);
      if (!bucketMap.has(t)) bucketMap.set(t, { t, started: 0, completed: 0, failed: 0 });
      bucketMap.get(t)!.started++;
    }
    if (att.finishedAt) {
      const t = bucketTime(att.finishedAt, bucketSeconds);
      if (!bucketMap.has(t)) bucketMap.set(t, { t, started: 0, completed: 0, failed: 0 });
      if (att.status === "completed") bucketMap.get(t)!.completed++;
      else if (att.status === "failed") bucketMap.get(t)!.failed++;
    }
  }

  const timeline = Array.from(bucketMap.values()).sort((a, b) => a.t.localeCompare(b.t));

  return {
    ok: true,
    data: {
      runId,
      counts,
      durationsSec,
      throughput: {
        completedPerMinute,
        windowStart: windowStart?.toISOString() ?? null,
        windowEnd: windowEnd?.toISOString() ?? null,
      },
      timeline,
    },
  };
}
