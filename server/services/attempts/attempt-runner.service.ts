/**
 * AttemptRunnerService (PR-62)
 * Orchestrates attempt creation, execution, and status retrieval.
 * Uses SimpleRunner for actual command execution.
 */
import { db } from "@/server/db";
import { attempts, logs } from "@/server/db/schema";
import { eq, asc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { LocalRunner } from "@/server/services/execution/local-runner";
import { emitAttemptStatus, emitAttemptLog } from "@/server/services/events-hub";
import { cleanupAttemptWithLogging } from "@/server/services/execution/attempt-cleanup";
import type {
  StartAttemptParams,
  StartAttemptResult,
  AttemptStatusResult,
  GetLogsParams,
  GetLogsResult,
  RunAttemptResult,
} from "./attempt-runner.types";

/**
 * Create a new attempt in queued status
 */
export async function createAttempt(params: StartAttemptParams): Promise<StartAttemptResult> {
  const { projectId, taskId } = params;
  const attemptId = randomUUID();
  const now = new Date();

  await db.insert(attempts).values({
    id: attemptId,
    taskId,
    queuedAt: now,
    startedAt: now, // Required field, will update when actually running
    status: "queued",
    agent: "LocalRunner",
    baseBranch: "main",
  });

  emitAttemptStatus({ attemptId, status: "queued" });

  return { attemptId, status: "queued" };
}

interface RunAttemptParams {
  attemptId: string;
  command: string[];
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
}

/**
 * Start execution of a queued attempt (async, fire-and-forget)
 */
export async function runAttempt(params: RunAttemptParams): Promise<RunAttemptResult> {
  const { attemptId, command, cwd, env, timeout } = params;

  // Get attempt
  const attempt = await db.select()
    .from(attempts)
    .where(eq(attempts.id, attemptId))
    .get();

  if (!attempt) {
    return { ok: false, error: "Attempt not found" };
  }

  // Check if already running or completed
  if (attempt.status === "running") {
    return { ok: false, error: "Attempt already running" };
  }
  if (attempt.status === "completed" || attempt.status === "failed") {
    return { ok: false, error: "Attempt already finished" };
  }

  // Update status to running
  const startedAt = new Date();
  await db.update(attempts)
    .set({ status: "running", startedAt })
    .where(eq(attempts.id, attemptId));

  emitAttemptStatus({ attemptId, status: "running" });

  // Fire-and-forget execution
  executeAsync(attemptId, command, cwd, env, timeout);

  return { ok: true };
}

/**
 * Async execution - runs in background, updates DB on completion
 */
async function executeAsync(
  attemptId: string,
  command: string[],
  cwd?: string,
  env?: Record<string, string>,
  timeout?: number
): Promise<void> {
  const runner = new LocalRunner();

  // Store logs as they come
  runner.on("log", async (entry) => {
    try {
      await db.insert(logs).values({
        id: randomUUID(),
        attemptId,
        timestamp: entry.timestamp,
        level: entry.level,
        message: entry.message,
      });
      emitAttemptLog({
        attemptId,
        timestamp: entry.timestamp,
        level: entry.level,
        message: entry.message,
      });
    } catch {
      // Ignore FK errors if attempt was deleted
    }
  });

  let exitCode = 1;
  try {
    const result = await runner.run({ command, cwd, env, timeout });
    exitCode = result.exitCode;
  } catch {
    exitCode = 1;
  }

  const finishedAt = new Date();
  const finalStatus = exitCode === 0 ? "completed" : "failed";

  await db.update(attempts)
    .set({ status: finalStatus, finishedAt, exitCode })
    .where(eq(attempts.id, attemptId));

  emitAttemptStatus({ attemptId, status: finalStatus, exitCode });
  await runner.cleanup();
  await cleanupAttemptWithLogging(attemptId);
}

/**
 * Get current status of an attempt
 */
export async function getAttemptStatus(attemptId: string): Promise<AttemptStatusResult> {
  const attempt = await db.select()
    .from(attempts)
    .where(eq(attempts.id, attemptId))
    .get();

  if (!attempt) {
    return {
      attemptId,
      status: "pending",
      startedAt: null,
      finishedAt: null,
      exitCode: null,
      error: "Attempt not found",
    };
  }

  return {
    attemptId: attempt.id,
    status: attempt.status as AttemptStatusResult["status"],
    startedAt: attempt.startedAt ? new Date(attempt.startedAt) : null,
    finishedAt: attempt.finishedAt ? new Date(attempt.finishedAt) : null,
    exitCode: attempt.exitCode,
  };
}

/**
 * Get logs for an attempt with cursor pagination
 */
export async function getAttemptLogs(params: GetLogsParams): Promise<GetLogsResult> {
  const { attemptId, cursor = 0, limit = 100 } = params;

  const allLogs = await db.select()
    .from(logs)
    .where(eq(logs.attemptId, attemptId))
    .orderBy(asc(logs.timestamp));

  const sliced = allLogs.slice(cursor, cursor + limit);
  const hasMore = cursor + limit < allLogs.length;

  return {
    lines: sliced.map((l) => ({
      timestamp: new Date(l.timestamp),
      level: l.level as "info" | "warning" | "error",
      message: l.message,
    })),
    nextCursor: hasMore ? cursor + limit : undefined,
  };
}
