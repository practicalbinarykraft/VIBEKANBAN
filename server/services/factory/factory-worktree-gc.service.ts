/** Factory Worktree GC Service (PR-108) - Clean up orphaned git worktrees */
import { db } from "@/server/db";
import { attempts, tasks, projects } from "@/server/db/schema";
import { eq, and, inArray, isNotNull, lte } from "drizzle-orm";
import { execSync } from "child_process";
import { existsSync } from "fs";

/** GC delay: 30 minutes after finish before cleanup */
export const GC_DELAY_MS = 30 * 60 * 1000;

/** Attempt record for GC processing */
export interface OrphanedAttempt {
  id: string;
  status: string;
  finishedAt: Date | null;
  worktreePath: string | null;
  branchName: string | null;
  repoPath: string | null;
}

/** Dependencies for testability */
export interface WorktreeGCDeps {
  getOrphanedAttempts: (projectId: string) => Promise<OrphanedAttempt[]>;
  pathExists: (path: string) => boolean;
  removeWorktree: (repoPath: string, worktreePath: string) => Promise<{ ok: boolean; error?: string }>;
  deleteBranch: (repoPath: string, branchName: string) => Promise<{ ok: boolean; error?: string }>;
  log: (message: string) => void;
  now: () => number;
}

/** In-memory lock to prevent concurrent GC per project */
const gcLocks = new Set<string>();

/** Default: get orphaned attempts from DB */
async function defaultGetOrphanedAttempts(projectId: string): Promise<OrphanedAttempt[]> {
  const rows = await db
    .select({
      id: attempts.id,
      status: attempts.status,
      finishedAt: attempts.finishedAt,
      worktreePath: attempts.worktreePath,
      branchName: attempts.branchName,
      repoPath: projects.repoPath,
    })
    .from(attempts)
    .innerJoin(tasks, eq(attempts.taskId, tasks.id))
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .where(
      and(
        eq(tasks.projectId, projectId),
        inArray(attempts.status, ["completed", "failed", "cancelled", "stopped"]),
        isNotNull(attempts.worktreePath),
        isNotNull(attempts.finishedAt)
      )
    );
  return rows;
}

/** Default: check if path exists */
function defaultPathExists(path: string): boolean {
  return existsSync(path);
}

/** Default: remove worktree using git CLI */
async function defaultRemoveWorktree(
  repoPath: string,
  worktreePath: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    execSync(`git -C "${repoPath}" worktree remove --force "${worktreePath}"`, {
      encoding: "utf-8",
      timeout: 30000,
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: message };
  }
}

/** Default: delete local branch */
async function defaultDeleteBranch(
  repoPath: string,
  branchName: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    execSync(`git -C "${repoPath}" branch -D "${branchName}"`, {
      encoding: "utf-8",
      timeout: 10000,
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: message };
  }
}

const defaultDeps: WorktreeGCDeps = {
  getOrphanedAttempts: defaultGetOrphanedAttempts,
  pathExists: defaultPathExists,
  removeWorktree: defaultRemoveWorktree,
  deleteBranch: defaultDeleteBranch,
  log: (msg) => console.log(`[WorktreeGC] ${msg}`),
  now: () => Date.now(),
};

/**
 * Run worktree GC for a project
 * Finds and removes orphaned worktrees from finished attempts
 */
export async function runWorktreeGC(
  projectId: string,
  deps: WorktreeGCDeps = defaultDeps
): Promise<{ cleaned: number }> {
  const candidates = await deps.getOrphanedAttempts(projectId);
  const now = deps.now();
  const cutoff = now - GC_DELAY_MS;
  let cleaned = 0;

  for (const attempt of candidates) {
    // Skip if not in terminal status
    if (!["completed", "failed", "cancelled", "stopped"].includes(attempt.status)) {
      continue;
    }

    // Skip if not finished yet or finished too recently
    if (!attempt.finishedAt || attempt.finishedAt.getTime() > cutoff) {
      continue;
    }

    // Skip if worktreePath is null or doesn't exist
    if (!attempt.worktreePath || !deps.pathExists(attempt.worktreePath)) {
      continue;
    }

    // Skip if no repo path
    if (!attempt.repoPath) {
      continue;
    }

    // Remove worktree
    const removeResult = await deps.removeWorktree(attempt.repoPath, attempt.worktreePath);
    if (!removeResult.ok) {
      deps.log(`Failed to remove worktree ${attempt.worktreePath}: ${removeResult.error}`);
      continue;
    }

    // Delete branch if exists
    if (attempt.branchName) {
      const branchResult = await deps.deleteBranch(attempt.repoPath, attempt.branchName);
      if (!branchResult.ok) {
        deps.log(`Failed to delete branch ${attempt.branchName}: ${branchResult.error}`);
      }
    }

    cleaned++;
  }

  return { cleaned };
}

/**
 * Maybe run worktree GC (with lock protection)
 * Returns skipped=true if another GC is already running for this project
 */
export async function maybeRunWorktreeGC(
  projectId: string,
  deps: WorktreeGCDeps = defaultDeps
): Promise<{ skipped: boolean; cleaned: number }> {
  // Check lock
  if (gcLocks.has(projectId)) {
    return { skipped: true, cleaned: 0 };
  }

  // Acquire lock
  gcLocks.add(projectId);

  try {
    const result = await runWorktreeGC(projectId, deps);
    return { skipped: false, cleaned: result.cleaned };
  } finally {
    // Release lock
    gcLocks.delete(projectId);
  }
}
