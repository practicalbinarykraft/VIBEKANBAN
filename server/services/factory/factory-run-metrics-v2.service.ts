/** Factory Run Metrics V2 Service (PR-95) - Timeline + Throughput with peakRunning */
import { db } from "@/server/db";
import { attempts, autopilotRuns } from "@/server/db/schema";
import { eq } from "drizzle-orm";

const WINDOW_MINUTES = 5;
const BUCKET_MS = WINDOW_MINUTES * 60 * 1000;
const MIN_P95_SAMPLES = 5;

export interface AttemptRecordV2 {
  id: string;
  status: string;
  startedAt: Date | null;
  finishedAt: Date | null;
}

export interface FactoryRunMetricsV2Deps {
  getAttemptsByRunId: (runId: string) => Promise<AttemptRecordV2[]>;
  getAutopilotRun: (runId: string) => Promise<{ id: string; startedAt: Date | null; finishedAt: Date | null } | null>;
}

interface TimelineBucket {
  t: string;
  started: number;
  completed: number;
  failed: number;
}

export interface FactoryRunMetricsV2 {
  runId: string;
  windowMinutes: number;
  startedAtISO: string | null;
  finishedAtISO: string | null;
  totals: { started: number; completed: number; failed: number; cancelled: number };
  timing: { avgDurationSec: number | null; p95DurationSec: number | null; throughputPerMin: number | null; peakRunning: number };
  timeline: TimelineBucket[];
}

export type FactoryRunMetricsV2Result = { ok: true; data: FactoryRunMetricsV2 } | { ok: false; error: "RUN_NOT_FOUND" };

async function defaultGetAttemptsByRunId(runId: string): Promise<AttemptRecordV2[]> {
  return db
    .select({ id: attempts.id, status: attempts.status, startedAt: attempts.startedAt, finishedAt: attempts.finishedAt })
    .from(attempts)
    .where(eq(attempts.autopilotRunId, runId));
}

async function defaultGetAutopilotRun(runId: string) {
  const rows = await db.select({ id: autopilotRuns.id, startedAt: autopilotRuns.startedAt, finishedAt: autopilotRuns.finishedAt })
    .from(autopilotRuns).where(eq(autopilotRuns.id, runId));
  return rows[0] ?? null;
}

const defaultDeps: FactoryRunMetricsV2Deps = { getAttemptsByRunId: defaultGetAttemptsByRunId, getAutopilotRun: defaultGetAutopilotRun };

function bucketKey(date: Date): string {
  const ms = Math.floor(date.getTime() / BUCKET_MS) * BUCKET_MS;
  return new Date(ms).toISOString();
}

function computePercentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.floor(p * (sorted.length - 1));
  return sorted[idx];
}

function computePeakRunning(records: AttemptRecordV2[]): number {
  const events: { time: number; delta: number }[] = [];
  for (const r of records) {
    if (r.startedAt) events.push({ time: r.startedAt.getTime(), delta: 1 });
    if (r.finishedAt && ["completed", "failed", "cancelled"].includes(r.status)) {
      events.push({ time: r.finishedAt.getTime(), delta: -1 });
    }
  }
  events.sort((a, b) => a.time - b.time || b.delta - a.delta);
  let current = 0, peak = 0;
  for (const e of events) {
    current += e.delta;
    if (current > peak) peak = current;
  }
  return peak;
}

export async function getFactoryRunMetricsV2(
  runId: string,
  deps: FactoryRunMetricsV2Deps = defaultDeps
): Promise<FactoryRunMetricsV2Result> {
  const run = await deps.getAutopilotRun(runId);
  if (!run) return { ok: false, error: "RUN_NOT_FOUND" };

  const records = await deps.getAttemptsByRunId(runId);

  // Totals
  const totals = { started: 0, completed: 0, failed: 0, cancelled: 0 };
  for (const r of records) {
    if (r.startedAt) totals.started++;
    if (r.status === "completed") totals.completed++;
    else if (r.status === "failed") totals.failed++;
    else if (r.status === "cancelled") totals.cancelled++;
  }

  // Durations
  const durations: number[] = [];
  for (const r of records) {
    if (r.startedAt && r.finishedAt) {
      durations.push(Math.round((r.finishedAt.getTime() - r.startedAt.getTime()) / 1000));
    }
  }
  durations.sort((a, b) => a - b);
  const avgDurationSec = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null;
  const p95DurationSec = durations.length >= MIN_P95_SAMPLES ? computePercentile(durations, 0.95) : null;

  // Throughput
  let throughputPerMin: number | null = null;
  if (totals.completed > 0) {
    let minTime: number | null = null, maxTime: number | null = null;
    for (const r of records) {
      if (r.startedAt) {
        const t = r.startedAt.getTime();
        if (minTime === null || t < minTime) minTime = t;
      }
      if (r.finishedAt) {
        const t = r.finishedAt.getTime();
        if (maxTime === null || t > maxTime) maxTime = t;
      }
    }
    if (minTime !== null && maxTime !== null) {
      const minutes = Math.max(1, (maxTime - minTime) / 60000);
      throughputPerMin = Math.round((totals.completed / minutes) * 10) / 10;
    }
  }

  // Peak running
  const peakRunning = computePeakRunning(records);

  // Timeline buckets
  const bucketMap = new Map<string, TimelineBucket>();
  for (const r of records) {
    if (r.startedAt) {
      const k = bucketKey(r.startedAt);
      if (!bucketMap.has(k)) bucketMap.set(k, { t: k, started: 0, completed: 0, failed: 0 });
      bucketMap.get(k)!.started++;
    }
    if (r.finishedAt) {
      const k = bucketKey(r.finishedAt);
      if (!bucketMap.has(k)) bucketMap.set(k, { t: k, started: 0, completed: 0, failed: 0 });
      if (r.status === "completed") bucketMap.get(k)!.completed++;
      else if (r.status === "failed") bucketMap.get(k)!.failed++;
    }
  }
  const timeline = Array.from(bucketMap.values()).sort((a, b) => a.t.localeCompare(b.t));

  return {
    ok: true,
    data: {
      runId,
      windowMinutes: WINDOW_MINUTES,
      startedAtISO: run.startedAt?.toISOString() ?? null,
      finishedAtISO: run.finishedAt?.toISOString() ?? null,
      totals,
      timing: { avgDurationSec, p95DurationSec, throughputPerMin, peakRunning },
      timeline,
    },
  };
}
