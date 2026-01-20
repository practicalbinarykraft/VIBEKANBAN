/**
 * Attempt Cleanup Helper (PR-71)
 * Cleans up worktree after attempt finalization.
 */
import { db } from "@/server/db";
import { attempts, artifacts } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { cleanupAttemptWorkspace } from "./worktree-cleaner";

/**
 * Cleanup attempt worktree and log errors as artifacts
 */
export async function cleanupAttemptWithLogging(attemptId: string): Promise<void> {
  const attempt = await db.select()
    .from(attempts)
    .where(eq(attempts.id, attemptId))
    .get();

  if (!attempt?.worktreePath) return;

  const result = await cleanupAttemptWorkspace({
    attemptId,
    workspacePath: attempt.worktreePath,
    branchName: attempt.branchName ?? undefined,
  });

  if (!result.ok) {
    await db.insert(artifacts).values({
      id: randomUUID(),
      attemptId,
      type: "cleanup_error",
      content: JSON.stringify({ step: result.step, error: result.error }),
    });
  } else {
    await db.update(attempts)
      .set({ worktreePath: null })
      .where(eq(attempts.id, attemptId));
  }
}
