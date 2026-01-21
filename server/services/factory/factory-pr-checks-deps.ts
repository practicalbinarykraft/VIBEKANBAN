/** Factory PR Checks Dependencies (PR-98) - Real implementations */
import { exec } from "child_process";
import { promisify } from "util";
import { db } from "@/server/db";
import { attempts } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import {
  getRunPrChecks,
  type FactoryPrChecksDeps,
  type FactoryPrCheckSnapshot,
} from "./factory-pr-checks.service";

const execAsync = promisify(exec);

/**
 * Parse owner/repo from GitHub PR URL
 */
function parseRepoFromUrl(prUrl: string): { owner: string; repo: string } | null {
  // https://github.com/owner/repo/pull/123
  const match = prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull/);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}

/**
 * Fetch check runs from GitHub API via gh CLI
 */
async function fetchCheckRuns(owner: string, repo: string, commitSha: string) {
  const cmd = `gh api repos/${owner}/${repo}/commits/${commitSha}/check-runs --jq '{total_count: .total_count, check_runs: [.check_runs[] | {id: .id, name: .name, status: .status, conclusion: .conclusion}]}'`;

  const { stdout } = await execAsync(cmd, { timeout: 15000 });
  return JSON.parse(stdout);
}

/**
 * Get attempts with PR info for a factory run
 */
async function getAttemptsByRunId(runId: string) {
  const rows = await db
    .select({
      id: attempts.id,
      taskId: attempts.taskId,
      prUrl: attempts.prUrl,
      headCommit: attempts.headCommit,
    })
    .from(attempts)
    .where(eq(attempts.factoryRunId, runId));

  return rows;
}

/**
 * Create real deps for production use
 */
export function createPrChecksDeps(): FactoryPrChecksDeps {
  return {
    fetchCheckRuns,
    getAttemptsByRunId,
    parseRepoFromUrl,
  };
}

/**
 * Convenience function: Get PR checks for a run using real deps
 */
export async function getFactoryRunPrChecks(runId: string): Promise<FactoryPrCheckSnapshot[]> {
  const deps = createPrChecksDeps();
  return getRunPrChecks(deps, runId);
}
