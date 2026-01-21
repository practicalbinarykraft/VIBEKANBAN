/** Factory PR Checks Service (PR-98) - Fetch and normalize CI status for PRs */

export type PrCheckStatus = "pending" | "success" | "failed" | "cancelled";

export interface FactoryPrCheckSnapshot {
  taskId: string;
  prUrl: string;
  commitSha: string;
  status: PrCheckStatus;
  updatedAt: Date;
}

interface CheckRun {
  id: number;
  name: string;
  status: string; // queued, in_progress, completed
  conclusion: string | null; // success, failure, cancelled, skipped, etc.
}

interface CheckRunsResponse {
  total_count: number;
  check_runs: CheckRun[];
}

interface AttemptWithPr {
  id: string;
  taskId: string;
  prUrl: string | null;
  headCommit: string | null;
}

export interface FactoryPrChecksDeps {
  fetchCheckRuns: (owner: string, repo: string, commitSha: string) => Promise<CheckRunsResponse>;
  getAttemptsByRunId: (runId: string) => Promise<AttemptWithPr[]>;
  parseRepoFromUrl: (prUrl: string) => { owner: string; repo: string } | null;
}

/**
 * Normalize check runs to a single status
 * Priority: failed > cancelled > pending > success
 */
function normalizeCheckStatus(checkRuns: CheckRun[]): PrCheckStatus {
  if (checkRuns.length === 0) {
    return "pending"; // No checks yet, waiting for CI to start
  }

  let hasFailure = false;
  let hasCancelled = false;
  let hasPending = false;

  for (const run of checkRuns) {
    // Check if still running
    if (run.status === "queued" || run.status === "in_progress") {
      hasPending = true;
      continue;
    }

    // Check conclusion for completed runs
    if (run.conclusion === "failure" || run.conclusion === "timed_out") {
      hasFailure = true;
    } else if (run.conclusion === "cancelled") {
      hasCancelled = true;
    }
    // success, skipped, neutral are treated as success
  }

  if (hasFailure) return "failed";
  if (hasCancelled) return "cancelled";
  if (hasPending) return "pending";
  return "success";
}

/**
 * Get CI check status for a single PR
 */
export async function getPrCheckStatus(
  deps: FactoryPrChecksDeps,
  prUrl: string,
  commitSha: string
): Promise<PrCheckStatus> {
  try {
    const repoInfo = deps.parseRepoFromUrl(prUrl);
    if (!repoInfo) {
      return "failed";
    }

    const response = await deps.fetchCheckRuns(repoInfo.owner, repoInfo.repo, commitSha);
    return normalizeCheckStatus(response.check_runs);
  } catch {
    return "failed"; // Treat API errors as failure
  }
}

/**
 * Get CI check status for all PRs in a factory run
 */
export async function getRunPrChecks(
  deps: FactoryPrChecksDeps,
  runId: string
): Promise<FactoryPrCheckSnapshot[]> {
  const attempts = await deps.getAttemptsByRunId(runId);
  const results: FactoryPrCheckSnapshot[] = [];

  for (const attempt of attempts) {
    if (!attempt.prUrl || !attempt.headCommit) {
      continue;
    }

    const status = await getPrCheckStatus(deps, attempt.prUrl, attempt.headCommit);

    results.push({
      taskId: attempt.taskId,
      prUrl: attempt.prUrl,
      commitSha: attempt.headCommit,
      status,
      updatedAt: new Date(),
    });
  }

  return results;
}
