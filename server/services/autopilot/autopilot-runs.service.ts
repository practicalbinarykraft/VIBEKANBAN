/**
 * Autopilot Runs Service (PR-73)
 * Manages autopilot execution sessions.
 */
import { db } from "@/server/db";
import { autopilotRuns, attempts } from "@/server/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { randomUUID } from "crypto";

export type RunStatus = "running" | "completed" | "failed" | "cancelled";

export interface AutopilotRun {
  id: string;
  projectId: string;
  status: RunStatus;
  startedAt: Date;
  finishedAt: Date | null;
  error: string | null;
}

export interface AutopilotRunWithCounts extends AutopilotRun {
  attemptsCount: number;
  failedAttempts: number;
}

interface InsertRunData {
  id: string;
  projectId: string;
  status: RunStatus;
  startedAt: Date;
}

interface UpdateRunData {
  status: RunStatus;
  finishedAt?: Date;
  error?: string;
}

export interface AutopilotRunsDeps {
  insertRun: (data: InsertRunData) => Promise<string>;
  updateRun: (id: string, data: UpdateRunData) => Promise<boolean>;
  getRun: (id: string) => Promise<AutopilotRun | null>;
  listRuns: (projectId: string, limit: number) => Promise<AutopilotRun[]>;
  linkAttempt: (attemptId: string, runId: string) => Promise<boolean>;
  countAttempts: (runId: string) => Promise<{ total: number; failed: number }>;
}

async function defaultInsertRun(data: InsertRunData): Promise<string> {
  await db.insert(autopilotRuns).values(data);
  return data.id;
}

async function defaultUpdateRun(id: string, data: UpdateRunData): Promise<boolean> {
  await db.update(autopilotRuns).set(data).where(eq(autopilotRuns.id, id));
  return true;
}

async function defaultGetRun(id: string): Promise<AutopilotRun | null> {
  const row = await db.select().from(autopilotRuns).where(eq(autopilotRuns.id, id)).get();
  if (!row) return null;
  return {
    id: row.id,
    projectId: row.projectId,
    status: row.status as RunStatus,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
    error: row.error,
  };
}

async function defaultListRuns(projectId: string, limit: number): Promise<AutopilotRun[]> {
  const rows = await db.select().from(autopilotRuns)
    .where(eq(autopilotRuns.projectId, projectId))
    .orderBy(desc(autopilotRuns.startedAt))
    .limit(limit);
  return rows.map((r) => ({
    id: r.id,
    projectId: r.projectId,
    status: r.status as RunStatus,
    startedAt: r.startedAt,
    finishedAt: r.finishedAt,
    error: r.error,
  }));
}

async function defaultLinkAttempt(attemptId: string, runId: string): Promise<boolean> {
  await db.update(attempts).set({ autopilotRunId: runId }).where(eq(attempts.id, attemptId));
  return true;
}

async function defaultCountAttempts(runId: string): Promise<{ total: number; failed: number }> {
  const rows = await db.select().from(attempts).where(eq(attempts.autopilotRunId, runId));
  const failed = rows.filter((r) => r.status === "failed").length;
  return { total: rows.length, failed };
}

const defaultDeps: AutopilotRunsDeps = {
  insertRun: defaultInsertRun,
  updateRun: defaultUpdateRun,
  getRun: defaultGetRun,
  listRuns: defaultListRuns,
  linkAttempt: defaultLinkAttempt,
  countAttempts: defaultCountAttempts,
};

type CreateResult = { ok: true; runId: string } | { ok: false; error: string };
type FinishResult = { ok: true } | { ok: false; error: string };
type LinkResult = { ok: true } | { ok: false; error: string };

export async function createRun(
  projectId: string,
  deps: AutopilotRunsDeps = defaultDeps
): Promise<CreateResult> {
  const id = randomUUID();
  const runId = await deps.insertRun({ id, projectId, status: "running", startedAt: new Date() });
  return { ok: true, runId };
}

export async function finishRun(
  runId: string,
  status: "completed" | "failed" | "cancelled",
  error?: string,
  deps: AutopilotRunsDeps = defaultDeps
): Promise<FinishResult> {
  await deps.updateRun(runId, { status, finishedAt: new Date(), error });
  return { ok: true };
}

export async function getRun(
  runId: string,
  deps: AutopilotRunsDeps = defaultDeps
): Promise<{ run: AutopilotRunWithCounts | null }> {
  const run = await deps.getRun(runId);
  if (!run) return { run: null };
  const counts = await deps.countAttempts(runId);
  return { run: { ...run, attemptsCount: counts.total, failedAttempts: counts.failed } };
}

export async function listRuns(
  projectId: string,
  limit = 20,
  deps: AutopilotRunsDeps = defaultDeps
): Promise<{ runs: AutopilotRunWithCounts[] }> {
  const runs = await deps.listRuns(projectId, limit);
  const result: AutopilotRunWithCounts[] = [];
  for (const run of runs) {
    const counts = await deps.countAttempts(run.id);
    result.push({ ...run, attemptsCount: counts.total, failedAttempts: counts.failed });
  }
  return { runs: result };
}

export async function linkAttemptToRun(
  attemptId: string,
  runId: string,
  deps: AutopilotRunsDeps = defaultDeps
): Promise<LinkResult> {
  await deps.linkAttempt(attemptId, runId);
  return { ok: true };
}
