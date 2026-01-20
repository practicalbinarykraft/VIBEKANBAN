/**
 * GC Attempts Service (PR-71)
 * Garbage collects stale attempt workspaces.
 */
import { db } from "@/server/db";
import { attempts } from "@/server/db/schema";
import { and, eq, lt, isNotNull, notInArray } from "drizzle-orm";
import {
  cleanupAttemptWorkspace,
  type CleanupResult,
  type CleanupParams,
} from "./worktree-cleaner";

export interface GcResult {
  checked: number;
  cleaned: number;
  failed: number;
  failures: Array<{ attemptId: string; reason: string }>;
}

export interface GcParams {
  minAgeMinutes?: number;
  limit?: number;
}

export interface StaleAttempt {
  id: string;
  worktreePath: string;
  branchName?: string;
}

export interface GcDeps {
  findStaleAttempts: (minAgeMinutes: number, limit: number) => Promise<StaleAttempt[]>;
  cleanup: (params: CleanupParams) => Promise<CleanupResult>;
}

/**
 * Default: find stale attempts from DB
 */
export async function defaultFindStaleAttempts(
  minAgeMinutes: number,
  limit: number
): Promise<StaleAttempt[]> {
  const cutoff = new Date(Date.now() - minAgeMinutes * 60 * 1000);
  const finalStatuses = ["completed", "failed", "stopped"];

  const rows = await db
    .select({
      id: attempts.id,
      worktreePath: attempts.worktreePath,
      branchName: attempts.branchName,
    })
    .from(attempts)
    .where(
      and(
        isNotNull(attempts.worktreePath),
        lt(attempts.finishedAt, cutoff),
        notInArray(attempts.status, ["running", "queued", "pending"])
      )
    )
    .limit(limit);

  return rows
    .filter((r) => r.worktreePath !== null)
    .map((r) => ({
      id: r.id,
      worktreePath: r.worktreePath!,
      branchName: r.branchName ?? undefined,
    }));
}

/**
 * Garbage collect stale attempt workspaces
 */
export async function gcAttemptWorkspaces(
  params: GcParams = {},
  deps?: GcDeps
): Promise<GcResult> {
  const { minAgeMinutes = 60, limit = 25 } = params;
  const {
    findStaleAttempts = defaultFindStaleAttempts,
    cleanup = cleanupAttemptWorkspace,
  } = deps || {};

  const staleAttempts = await findStaleAttempts(minAgeMinutes, limit);
  const result: GcResult = { checked: 0, cleaned: 0, failed: 0, failures: [] };

  for (const attempt of staleAttempts) {
    result.checked++;

    const cleanupResult = await cleanup({
      attemptId: attempt.id,
      workspacePath: attempt.worktreePath,
      branchName: attempt.branchName,
    });

    if (cleanupResult.ok) {
      result.cleaned++;
      // Clear worktreePath in DB after successful cleanup
      await db
        .update(attempts)
        .set({ worktreePath: null })
        .where(eq(attempts.id, attempt.id));
    } else {
      result.failed++;
      result.failures.push({ attemptId: attempt.id, reason: cleanupResult.error });
    }
  }

  return result;
}
