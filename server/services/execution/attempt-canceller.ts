/**
 * Attempt Canceller Service (PR-72)
 * Handles real cancellation of running attempts.
 */
import { db } from "@/server/db";
import { attempts, logs } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  getAttemptRuntime,
  unregisterAttemptRuntime,
  type RuntimeHandle,
} from "./attempt-runtime-registry";

export type CancelAttemptResult =
  | { ok: true; status: "stopped"; attemptId: string; message: string }
  | {
      ok: false;
      code: "NOT_FOUND" | "NOT_RUNNING" | "ALREADY_FINISHED" | "CANCEL_FAILED";
      message: string;
    };

interface AttemptRecord {
  id: string;
  status: string;
}

export interface CancellerDeps {
  getAttempt: (id: string) => Promise<AttemptRecord | null>;
  updateAttemptStatus: (id: string, status: string) => Promise<void>;
  addLog: (attemptId: string, message: string) => Promise<void>;
  getRuntime: (id: string) => RuntimeHandle | null;
  unregisterRuntime: (id: string) => void;
}

const FINISHED_STATUSES = ["completed", "failed", "stopped"];
const SOFT_CANCEL_STATUSES = ["queued", "pending"];

async function defaultGetAttempt(id: string): Promise<AttemptRecord | null> {
  const row = await db
    .select({ id: attempts.id, status: attempts.status })
    .from(attempts)
    .where(eq(attempts.id, id))
    .get();
  return row ?? null;
}

async function defaultUpdateAttemptStatus(
  id: string,
  status: string
): Promise<void> {
  await db
    .update(attempts)
    .set({ status, finishedAt: new Date() })
    .where(eq(attempts.id, id));
}

async function defaultAddLog(attemptId: string, message: string): Promise<void> {
  await db.insert(logs).values({
    id: randomUUID(),
    attemptId,
    timestamp: new Date(),
    level: "info",
    message,
  });
}

const defaultDeps: CancellerDeps = {
  getAttempt: defaultGetAttempt,
  updateAttemptStatus: defaultUpdateAttemptStatus,
  addLog: defaultAddLog,
  getRuntime: getAttemptRuntime,
  unregisterRuntime: unregisterAttemptRuntime,
};

/**
 * Cancel an attempt
 */
export async function cancelAttempt(
  attemptId: string,
  deps: CancellerDeps = defaultDeps
): Promise<CancelAttemptResult> {
  const attempt = await deps.getAttempt(attemptId);

  if (!attempt) {
    return { ok: false, code: "NOT_FOUND", message: "Attempt not found" };
  }

  if (FINISHED_STATUSES.includes(attempt.status)) {
    return {
      ok: false,
      code: "ALREADY_FINISHED",
      message: `Attempt already ${attempt.status}`,
    };
  }

  if (SOFT_CANCEL_STATUSES.includes(attempt.status)) {
    await deps.updateAttemptStatus(attemptId, "stopped");
    await deps.addLog(attemptId, "Cancelled before execution started");
    return {
      ok: true,
      status: "stopped",
      attemptId,
      message: "Cancelled before execution started",
    };
  }

  // Running status - need to stop the process
  const handle = deps.getRuntime(attemptId);

  if (!handle) {
    return {
      ok: false,
      code: "CANCEL_FAILED",
      message:
        "Runtime handle not found; attempt may have already finished or server restarted",
    };
  }

  try {
    await handle.stop();
    await deps.updateAttemptStatus(attemptId, "stopped");
    await deps.addLog(attemptId, "Cancelled by user");
    return {
      ok: true,
      status: "stopped",
      attemptId,
      message: "Attempt cancelled successfully",
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { ok: false, code: "CANCEL_FAILED", message: msg };
  } finally {
    deps.unregisterRuntime(attemptId);
  }
}
