/** attempt-summary.service (PR-90) - Get attempt summary for factory results */
import { db } from "@/server/db";
import { attempts, logs, artifacts } from "@/server/db/schema";
import { eq, desc } from "drizzle-orm";

export type AttemptStatus = "queued" | "running" | "completed" | "failed" | "stopped" | "pending";

export interface AttemptSummaryResponse {
  attemptId: string;
  status: AttemptStatus;
  lastLogLine: string | null;
  errorMessage: string | null;
  updatedAt: string;
}

interface AttemptRecord {
  id: string;
  status: string;
  queuedAt?: Date | null;
  startedAt?: Date | null;
  finishedAt?: Date | null;
}

interface LogRecord {
  message: string;
}

interface ArtifactRecord {
  content: string;
}

export interface AttemptSummaryDeps {
  getAttempt: (attemptId: string) => Promise<AttemptRecord | null>;
  getLastLog: (attemptId: string) => Promise<LogRecord | null>;
  getErrorArtifact: (attemptId: string) => Promise<ArtifactRecord | null>;
}

const MAX_LENGTH = 200;

function trimToMax(str: string | null | undefined): string | null {
  if (!str) return null;
  return str.length > MAX_LENGTH ? str.slice(0, MAX_LENGTH) : str;
}

function getUpdatedAt(attempt: AttemptRecord): string {
  const date = attempt.finishedAt ?? attempt.startedAt ?? attempt.queuedAt ?? new Date();
  return date.toISOString();
}

async function defaultGetAttempt(attemptId: string): Promise<AttemptRecord | null> {
  const result = await db
    .select({
      id: attempts.id,
      status: attempts.status,
      queuedAt: attempts.queuedAt,
      startedAt: attempts.startedAt,
      finishedAt: attempts.finishedAt,
    })
    .from(attempts)
    .where(eq(attempts.id, attemptId))
    .get();
  return result ?? null;
}

async function defaultGetLastLog(attemptId: string): Promise<LogRecord | null> {
  const result = await db
    .select({ message: logs.message })
    .from(logs)
    .where(eq(logs.attemptId, attemptId))
    .orderBy(desc(logs.timestamp))
    .limit(1)
    .get();
  return result ?? null;
}

async function defaultGetErrorArtifact(attemptId: string): Promise<ArtifactRecord | null> {
  const result = await db
    .select({ content: artifacts.content })
    .from(artifacts)
    .where(eq(artifacts.attemptId, attemptId))
    .get();
  // Filter for error type after query (drizzle doesn't support compound where easily)
  if (!result) return null;
  const errorArtifact = await db
    .select({ content: artifacts.content })
    .from(artifacts)
    .where(eq(artifacts.attemptId, attemptId))
    .all();
  const error = errorArtifact.find((a) => a.content.toLowerCase().includes("error"));
  return error ?? null;
}

const defaultDeps: AttemptSummaryDeps = {
  getAttempt: defaultGetAttempt,
  getLastLog: defaultGetLastLog,
  getErrorArtifact: defaultGetErrorArtifact,
};

export async function getAttemptSummary(
  attemptId: string,
  deps: AttemptSummaryDeps = defaultDeps
): Promise<AttemptSummaryResponse | null> {
  const attempt = await deps.getAttempt(attemptId);
  if (!attempt) return null;

  const [lastLog, errorArtifact] = await Promise.all([
    deps.getLastLog(attemptId),
    deps.getErrorArtifact(attemptId),
  ]);

  return {
    attemptId: attempt.id,
    status: attempt.status as AttemptStatus,
    lastLogLine: trimToMax(lastLog?.message),
    errorMessage: trimToMax(errorArtifact?.content),
    updatedAt: getUpdatedAt(attempt),
  };
}
