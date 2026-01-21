/** factory-runs.service (PR-91) - Factory run history management */
import { db } from "@/server/db";
import { factoryRuns, attempts } from "@/server/db/schema";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

export type FactoryRunStatus = "running" | "completed" | "failed" | "cancelled";
export type FactoryRunMode = "column" | "selection";

export interface FactoryRunRecord {
  id: string;
  projectId: string;
  status: FactoryRunStatus;
  mode: FactoryRunMode;
  maxParallel: number;
  selectedTaskIds: string | null;
  columnId: string | null;
  startedAt: Date;
  finishedAt: Date | null;
  error: string | null;
}

export interface FactoryRunAttempt {
  id: string;
  taskId: string;
  status: string;
  prUrl: string | null;
  updatedAt: Date;
}

export interface FactoryRunCounts {
  total: number;
  completed: number;
  failed: number;
  running: number;
  queued: number;
}

export interface FactoryRunWithDetails extends FactoryRunRecord {
  counts: FactoryRunCounts;
  attempts: FactoryRunAttempt[];
}

interface InsertRunData {
  id: string;
  projectId: string;
  status: FactoryRunStatus;
  mode: FactoryRunMode;
  maxParallel: number;
  selectedTaskIds: string | null;
  columnId: string | null;
  startedAt: Date;
}

interface UpdateRunData {
  status: FactoryRunStatus;
  finishedAt?: Date;
  error?: string;
}

export interface FactoryRunsDeps {
  insertRun: (data: InsertRunData) => Promise<string>;
  updateRun: (id: string, data: UpdateRunData) => Promise<boolean>;
  getRun: (id: string) => Promise<FactoryRunRecord | null>;
  listRuns: (projectId: string, limit: number) => Promise<FactoryRunRecord[]>;
  getAttemptsByRunId: (runId: string) => Promise<FactoryRunAttempt[]>;
}

async function defaultInsertRun(data: InsertRunData): Promise<string> {
  await db.insert(factoryRuns).values(data);
  return data.id;
}

async function defaultUpdateRun(id: string, data: UpdateRunData): Promise<boolean> {
  await db.update(factoryRuns).set(data).where(eq(factoryRuns.id, id));
  return true;
}

async function defaultGetRun(id: string): Promise<FactoryRunRecord | null> {
  const row = await db.select().from(factoryRuns).where(eq(factoryRuns.id, id)).get();
  if (!row) return null;
  return {
    id: row.id,
    projectId: row.projectId,
    status: row.status as FactoryRunStatus,
    mode: row.mode as FactoryRunMode,
    maxParallel: row.maxParallel,
    selectedTaskIds: row.selectedTaskIds,
    columnId: row.columnId,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
    error: row.error,
  };
}

async function defaultListRuns(projectId: string, limit: number): Promise<FactoryRunRecord[]> {
  const rows = await db.select().from(factoryRuns)
    .where(eq(factoryRuns.projectId, projectId))
    .orderBy(desc(factoryRuns.startedAt))
    .limit(limit);
  return rows.map((r) => ({
    id: r.id,
    projectId: r.projectId,
    status: r.status as FactoryRunStatus,
    mode: r.mode as FactoryRunMode,
    maxParallel: r.maxParallel,
    selectedTaskIds: r.selectedTaskIds,
    columnId: r.columnId,
    startedAt: r.startedAt,
    finishedAt: r.finishedAt,
    error: r.error,
  }));
}

async function defaultGetAttemptsByRunId(runId: string): Promise<FactoryRunAttempt[]> {
  const rows = await db.select({
    id: attempts.id,
    taskId: attempts.taskId,
    status: attempts.status,
    prUrl: attempts.prUrl,
    finishedAt: attempts.finishedAt,
    startedAt: attempts.startedAt,
  }).from(attempts).where(eq(attempts.factoryRunId, runId));
  return rows.map((r) => ({
    id: r.id,
    taskId: r.taskId,
    status: r.status,
    prUrl: r.prUrl,
    updatedAt: r.finishedAt ?? r.startedAt,
  }));
}

const defaultDeps: FactoryRunsDeps = {
  insertRun: defaultInsertRun,
  updateRun: defaultUpdateRun,
  getRun: defaultGetRun,
  listRuns: defaultListRuns,
  getAttemptsByRunId: defaultGetAttemptsByRunId,
};

type CreateResult = { ok: true; runId: string } | { ok: false; error: string };
type FinishResult = { ok: true } | { ok: false; error: string };

export interface CreateFactoryRunParams {
  projectId: string;
  mode: FactoryRunMode;
  maxParallel: number;
  selectedTaskIds?: string[];
  columnId?: string;
}

export async function createFactoryRun(
  params: CreateFactoryRunParams,
  deps: FactoryRunsDeps = defaultDeps
): Promise<CreateResult> {
  const id = randomUUID();
  const runId = await deps.insertRun({
    id,
    projectId: params.projectId,
    status: "running",
    mode: params.mode,
    maxParallel: params.maxParallel,
    selectedTaskIds: params.selectedTaskIds ? JSON.stringify(params.selectedTaskIds) : null,
    columnId: params.columnId ?? null,
    startedAt: new Date(),
  });
  return { ok: true, runId };
}

export async function finishFactoryRun(
  runId: string,
  status: "completed" | "failed" | "cancelled",
  error?: string,
  deps: FactoryRunsDeps = defaultDeps
): Promise<FinishResult> {
  await deps.updateRun(runId, { status, finishedAt: new Date(), error });
  return { ok: true };
}

export async function getFactoryRun(
  runId: string,
  deps: FactoryRunsDeps = defaultDeps
): Promise<{ run: FactoryRunWithDetails | null }> {
  const run = await deps.getRun(runId);
  if (!run) return { run: null };
  const attemptsList = await deps.getAttemptsByRunId(runId);
  const counts = countAttempts(attemptsList);
  return { run: { ...run, counts, attempts: attemptsList } };
}

export async function listFactoryRuns(
  projectId: string,
  limit = 20,
  deps: FactoryRunsDeps = defaultDeps
): Promise<{ runs: FactoryRunRecord[] }> {
  const runs = await deps.listRuns(projectId, limit);
  return { runs };
}

export async function countAttemptsByRun(
  runId: string,
  deps: FactoryRunsDeps = defaultDeps
): Promise<FactoryRunCounts> {
  const attemptsList = await deps.getAttemptsByRunId(runId);
  return countAttempts(attemptsList);
}

function countAttempts(attemptsList: { status: string }[]): FactoryRunCounts {
  return {
    total: attemptsList.length,
    completed: attemptsList.filter((a) => a.status === "completed").length,
    failed: attemptsList.filter((a) => a.status === "failed").length,
    running: attemptsList.filter((a) => a.status === "running").length,
    queued: attemptsList.filter((a) => a.status === "queued").length,
  };
}
