/**
 * PR Creator
 *
 * Creates pull requests via GitHub API or CLI.
 */

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface CreatePRInput {
  repoPath: string;
  branchName: string;
  baseBranch: string;
  title: string;
  body: string;
}

export interface CreatePRResult {
  ok: boolean;
  prUrl?: string;
  prNumber?: number;
  error?: string;
}

/**
 * Create PR using gh CLI
 */
export async function createPullRequest(input: CreatePRInput): Promise<CreatePRResult> {
  const { repoPath, branchName, baseBranch, title, body } = input;

  try {
    // Use gh CLI to create PR
    const escapedTitle = title.replace(/"/g, '\\"');
    const escapedBody = body.replace(/"/g, '\\"').replace(/\n/g, "\\n");

    const { stdout } = await execAsync(
      `gh pr create --head "${branchName}" --base "${baseBranch}" --title "${escapedTitle}" --body "${escapedBody}"`,
      { cwd: repoPath, timeout: 30000 }
    );

    // Parse PR URL from output
    const urlMatch = stdout.match(/https:\/\/github\.com\/[^\s]+\/pull\/\d+/);
    if (urlMatch) {
      const prUrl = urlMatch[0];
      const prNumberMatch = prUrl.match(/\/pull\/(\d+)/);
      const prNumber = prNumberMatch ? parseInt(prNumberMatch[1], 10) : undefined;
      return { ok: true, prUrl, prNumber };
    }

    // gh pr create might return just the URL on a single line
    const trimmed = stdout.trim();
    if (trimmed.includes("github.com") && trimmed.includes("/pull/")) {
      const prNumberMatch = trimmed.match(/\/pull\/(\d+)/);
      return {
        ok: true,
        prUrl: trimmed,
        prNumber: prNumberMatch ? parseInt(prNumberMatch[1], 10) : undefined,
      };
    }

    return { ok: false, error: "Could not parse PR URL from gh output" };
  } catch (err: any) {
    // Check if gh CLI is not installed
    if (err.message?.includes("command not found") || err.message?.includes("not recognized")) {
      return { ok: false, error: "GitHub CLI (gh) not installed. Install it to create PRs." };
    }

    // Check for auth issues
    if (err.message?.includes("not logged in") || err.message?.includes("auth")) {
      return { ok: false, error: "Not authenticated with GitHub. Run 'gh auth login' first." };
    }

    return { ok: false, error: err.message };
  }
}

/**
 * Check if gh CLI is available
 */
export async function isGhCliAvailable(): Promise<boolean> {
  try {
    await execAsync("gh --version");
    return true;
  } catch {
    return false;
  }
}
