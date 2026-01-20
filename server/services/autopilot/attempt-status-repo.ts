/** Attempt Status Repo (PR-66) - Update attempt status in DB */
import { db } from "@/server/db";
import { attempts } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export type AttemptStatus = "pending" | "queued" | "running" | "completed" | "failed" | "stopped";

export class AttemptStatusRepo {
  async markRunning(attemptId: string, startedAt: Date): Promise<void> {
    await db.update(attempts)
      .set({
        status: "running",
        startedAt,
      })
      .where(eq(attempts.id, attemptId));
  }

  async markSucceeded(attemptId: string, finishedAt: Date, exitCode: number): Promise<void> {
    await db.update(attempts)
      .set({
        status: "completed",
        finishedAt,
        exitCode,
      })
      .where(eq(attempts.id, attemptId));
  }

  async markFailed(attemptId: string, finishedAt: Date, error: string, exitCode: number): Promise<void> {
    await db.update(attempts)
      .set({
        status: "failed",
        finishedAt,
        exitCode,
        applyError: error,
      })
      .where(eq(attempts.id, attemptId));
  }

  async markCanceled(attemptId: string, finishedAt: Date): Promise<void> {
    await db.update(attempts)
      .set({
        status: "stopped",
        finishedAt,
      })
      .where(eq(attempts.id, attemptId));
  }
}
