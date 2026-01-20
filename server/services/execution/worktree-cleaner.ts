/**
 * Worktree Cleaner Service (PR-71)
 * Cleans up git worktrees and directories after attempt completion.
 */
import { spawn } from "child_process";
import * as fs from "fs/promises";

export type CleanupResult =
  | { ok: true; removedWorktree: boolean; removedDir: boolean; removedBranch: boolean }
  | { ok: false; step: "worktree" | "dir" | "branch"; error: string };

export interface CleanupParams {
  attemptId: string;
  workspacePath: string;
  branchName?: string;
  repoRoot?: string;
}

export interface CleanupDeps {
  runGit: (args: string[], cwd?: string) => Promise<number>;
  removeDir: (path: string) => Promise<void>;
}

const PROTECTED_BRANCHES = ["main", "master", "develop", "staging", "production"];

/**
 * Default git runner using spawn
 */
export function defaultRunGit(args: string[], cwd?: string): Promise<number> {
  return new Promise((resolve) => {
    const proc = spawn("git", args, { cwd, stdio: "pipe" });
    proc.on("close", (code) => resolve(code ?? 1));
    proc.on("error", () => resolve(1));
  });
}

/**
 * Default directory remover
 */
export async function defaultRemoveDir(path: string): Promise<void> {
  await fs.rm(path, { recursive: true, force: true });
}

/**
 * Clean up a single attempt's workspace
 */
export async function cleanupAttemptWorkspace(
  params: CleanupParams,
  deps: CleanupDeps = { runGit: defaultRunGit, removeDir: defaultRemoveDir }
): Promise<CleanupResult> {
  const { workspacePath, branchName, repoRoot } = params;
  const { runGit, removeDir } = deps;

  // Step 1: Remove git worktree
  const worktreeCode = await runGit(
    ["worktree", "remove", "--force", workspacePath],
    repoRoot
  );

  if (worktreeCode !== 0) {
    return { ok: false, step: "worktree", error: `git worktree remove failed with code ${worktreeCode}` };
  }

  // Step 2: Remove directory if it still exists
  try {
    await removeDir(workspacePath);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, step: "dir", error: msg };
  }

  // Step 3: Optionally remove branch (non-critical)
  let removedBranch = false;
  if (branchName && !PROTECTED_BRANCHES.includes(branchName)) {
    const branchCode = await runGit(["branch", "-D", branchName], repoRoot);
    removedBranch = branchCode === 0;
  }

  return { ok: true, removedWorktree: true, removedDir: true, removedBranch };
}
