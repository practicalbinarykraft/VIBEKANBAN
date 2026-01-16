/**
 * Repo Preconditions
 *
 * Validates that a project repo is ready for agent execution.
 * Fail fast if conditions are not met.
 */

import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import { ExecutionResult, errorResult, successResult } from "@/types/execution-result";

const execAsync = promisify(exec);

export interface RepoPreconditionsResult {
  ok: boolean;
  repoPath?: string;
  defaultBranch?: string;
  error?: { code: string; message: string };
}

/**
 * Check all repo preconditions before execution
 */
export async function checkRepoPreconditions(
  repoPath: string | null | undefined
): Promise<RepoPreconditionsResult> {
  // 1. Check repoPath exists in project
  if (!repoPath) {
    return {
      ok: false,
      error: {
        code: "REPO_NOT_READY",
        message: "Repo not cloned. Go to project settings and click Clone/Sync.",
      },
    };
  }

  // 2. Check path exists
  if (!fs.existsSync(repoPath)) {
    return {
      ok: false,
      error: {
        code: "REPO_NOT_FOUND",
        message: `Repo path does not exist: ${repoPath}`,
      },
    };
  }

  // 3. Check .git directory exists
  const gitDir = path.join(repoPath, ".git");
  if (!fs.existsSync(gitDir)) {
    return {
      ok: false,
      error: {
        code: "REPO_NOT_READY",
        message: "Not a git repository. Clone the repo first.",
      },
    };
  }

  // 4. Check remote origin exists
  try {
    await execAsync("git remote get-url origin", { cwd: repoPath });
  } catch {
    return {
      ok: false,
      error: {
        code: "NO_REMOTE",
        message: "No remote 'origin' configured in git repo.",
      },
    };
  }

  // 5. Check for dirty worktree (optional but recommended)
  try {
    const { stdout } = await execAsync("git status --porcelain", { cwd: repoPath });
    if (stdout.trim()) {
      return {
        ok: false,
        error: {
          code: "DIRTY_WORKTREE",
          message: "Worktree has uncommitted changes. Commit or stash them first.",
        },
      };
    }
  } catch (err: any) {
    return {
      ok: false,
      error: {
        code: "GIT_ERROR",
        message: `Git status failed: ${err.message}`,
      },
    };
  }

  // 6. Get default branch
  let defaultBranch = "main";
  try {
    const { stdout } = await execAsync(
      "git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null || echo refs/heads/main",
      { cwd: repoPath }
    );
    const match = stdout.trim().match(/refs\/heads\/(.+)$/);
    if (match) defaultBranch = match[1];
  } catch {
    // Ignore, use main as default
  }

  return { ok: true, repoPath, defaultBranch };
}

/**
 * Create a workspace branch for task execution
 */
export async function createWorkspaceBranch(
  repoPath: string,
  taskId: string,
  baseBranch: string = "main"
): Promise<{ ok: boolean; branchName?: string; error?: string }> {
  const timestamp = Date.now();
  const branchName = `vibe/task-${taskId.slice(0, 8)}-${timestamp}`;

  try {
    // Fetch latest from origin
    await execAsync(`git fetch origin ${baseBranch}`, { cwd: repoPath, timeout: 30000 });

    // Checkout base branch and pull
    await execAsync(`git checkout ${baseBranch}`, { cwd: repoPath });
    await execAsync(`git pull origin ${baseBranch}`, { cwd: repoPath, timeout: 30000 });

    // Create and checkout new branch
    await execAsync(`git checkout -b ${branchName}`, { cwd: repoPath });

    return { ok: true, branchName };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

/**
 * Check if there are staged changes (non-empty diff)
 */
export async function hasStagedChanges(repoPath: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync("git diff --cached --name-only", { cwd: repoPath });
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Get diff summary for staged changes
 */
export async function getDiffSummary(
  repoPath: string
): Promise<{ summary: string; files: Array<{ path: string; additions: number; deletions: number }> }> {
  try {
    const { stdout } = await execAsync("git diff --cached --numstat", { cwd: repoPath });
    const lines = stdout.trim().split("\n").filter(Boolean);

    const files = lines.map((line) => {
      const [add, del, path] = line.split("\t");
      return {
        path,
        additions: parseInt(add, 10) || 0,
        deletions: parseInt(del, 10) || 0,
      };
    });

    const totalAdd = files.reduce((sum, f) => sum + f.additions, 0);
    const totalDel = files.reduce((sum, f) => sum + f.deletions, 0);
    const summary = `${files.length} file${files.length !== 1 ? "s" : ""} changed, ${totalAdd} insertion${totalAdd !== 1 ? "s" : ""}, ${totalDel} deletion${totalDel !== 1 ? "s" : ""}`;

    return { summary, files };
  } catch {
    return { summary: "No changes", files: [] };
  }
}
