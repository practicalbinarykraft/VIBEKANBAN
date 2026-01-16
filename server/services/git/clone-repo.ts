import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";

const execAsync = promisify(exec);

export interface CloneRepoParams {
  projectId: string;
  gitUrl: string;
  defaultBranch?: string;
}

export interface CloneRepoResult {
  repoPath: string;
  alreadyExists: boolean;
  error?: string;
}

/**
 * Get the deterministic repo path for a project
 */
export function getRepoPath(projectId: string): string {
  return path.join(process.cwd(), "data", "repos", projectId);
}

/**
 * Ensure a git repo is cloned and up-to-date for a project.
 * - If repo doesn't exist, clone it
 * - If repo exists, fetch and checkout the default branch
 */
export async function ensureRepoCloned(
  params: CloneRepoParams
): Promise<CloneRepoResult> {
  const { projectId, gitUrl, defaultBranch = "main" } = params;
  const repoPath = getRepoPath(projectId);

  // Ensure data/repos directory exists
  const reposDir = path.dirname(repoPath);
  if (!fs.existsSync(reposDir)) {
    fs.mkdirSync(reposDir, { recursive: true });
  }

  // Check if repo already exists
  const gitDir = path.join(repoPath, ".git");
  const alreadyExists = fs.existsSync(gitDir);

  try {
    if (!alreadyExists) {
      // Clone fresh
      await execAsync(`git clone "${gitUrl}" "${repoPath}"`, {
        timeout: 120000, // 2 min timeout for large repos
      });

      // Checkout default branch
      await execAsync(`git checkout ${defaultBranch}`, {
        cwd: repoPath,
        timeout: 30000,
      });
    } else {
      // Fetch latest and checkout
      await execAsync("git fetch origin", {
        cwd: repoPath,
        timeout: 60000,
      });

      // Reset to clean state and checkout default branch
      await execAsync(`git checkout ${defaultBranch}`, {
        cwd: repoPath,
        timeout: 30000,
      });

      await execAsync(`git pull origin ${defaultBranch}`, {
        cwd: repoPath,
        timeout: 60000,
      });
    }

    return { repoPath, alreadyExists };
  } catch (err: any) {
    // Parse common git errors
    const stderr = err.stderr || err.message || String(err);

    if (stderr.includes("Authentication failed") || stderr.includes("could not read Username")) {
      return {
        repoPath,
        alreadyExists,
        error: "Authentication failed. Check your git credentials or access token.",
      };
    }

    if (stderr.includes("Repository not found") || stderr.includes("not found")) {
      return {
        repoPath,
        alreadyExists,
        error: "Repository not found. Check the git URL.",
      };
    }

    if (stderr.includes("already exists and is not an empty directory")) {
      // Try to recover by removing and re-cloning
      try {
        fs.rmSync(repoPath, { recursive: true, force: true });
        return ensureRepoCloned(params);
      } catch {
        return {
          repoPath,
          alreadyExists: true,
          error: "Failed to clean existing directory. Remove manually: " + repoPath,
        };
      }
    }

    return {
      repoPath,
      alreadyExists,
      error: `Git operation failed: ${stderr.slice(0, 200)}`,
    };
  }
}

/**
 * Check if a repo is cloned and has a valid .git directory
 */
export function isRepoCloned(projectId: string): boolean {
  const repoPath = getRepoPath(projectId);
  const gitDir = path.join(repoPath, ".git");
  return fs.existsSync(gitDir);
}

/**
 * Remove a cloned repo (for cleanup)
 */
export async function removeRepo(projectId: string): Promise<void> {
  const repoPath = getRepoPath(projectId);
  if (fs.existsSync(repoPath)) {
    fs.rmSync(repoPath, { recursive: true, force: true });
  }
}
