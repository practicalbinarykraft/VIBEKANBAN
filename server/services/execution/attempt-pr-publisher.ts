/** Attempt PR Publisher (PR-97) - Auto-create PR for successful attempts */

export type PublishAttemptPrResult =
  | { ok: true; prUrl: string }
  | {
      ok: false;
      code: "ALREADY_HAS_PR" | "NOT_SUCCESS" | "EMPTY_DIFF" | "PR_CREATION_UNAVAILABLE" | "PR_CREATE_FAILED";
      message: string;
    };

export interface AttemptRecord {
  id: string;
  status: string;
  prUrl?: string | null;
  branchName?: string | null;
  headCommit?: string | null;
  taskTitle?: string | null;
}

export interface AttemptPrPublisherDeps {
  getAttemptById: (attemptId: string) => Promise<AttemptRecord | null>;
  hasDiffArtifact: (attemptId: string) => Promise<boolean>;
  createPullRequest: (args: { repoPath: string; branchName: string; baseBranch: string; title: string; body: string }) => Promise<{ prUrl: string }>;
  setAttemptPrUrl: (attemptId: string, prUrl: string) => Promise<void>;
  getRepoPath: (attemptId: string) => Promise<string | null>;
  getBaseBranch: (attemptId: string) => Promise<string>;
}

const GH_NOT_FOUND_PATTERNS = ["gh: command not found", "gh not found", "command not found: gh", "not recognized"];

function isGhUnavailableError(error: Error): boolean {
  const msg = error.message.toLowerCase();
  return GH_NOT_FOUND_PATTERNS.some((pattern) => msg.includes(pattern.toLowerCase()));
}

/**
 * Publish a PR for a completed attempt with changes.
 * Idempotent: returns ALREADY_HAS_PR if PR was already created.
 */
export async function publishAttemptPullRequest(
  deps: AttemptPrPublisherDeps,
  attemptId: string
): Promise<PublishAttemptPrResult> {
  // 1. Load attempt
  const attempt = await deps.getAttemptById(attemptId);
  if (!attempt) {
    return { ok: false, code: "PR_CREATE_FAILED", message: "Attempt not found" };
  }

  // 2. Check idempotency - already has PR
  if (attempt.prUrl) {
    return { ok: false, code: "ALREADY_HAS_PR", message: `PR already exists: ${attempt.prUrl}` };
  }

  // 3. Check status is completed (success)
  if (attempt.status !== "completed") {
    return { ok: false, code: "NOT_SUCCESS", message: `Attempt status is '${attempt.status}', not 'completed'` };
  }

  // 4. Check for diff/changes
  const hasDiff = await deps.hasDiffArtifact(attemptId);
  if (!hasDiff) {
    return { ok: false, code: "EMPTY_DIFF", message: "No changes detected (no diff artifact)" };
  }

  // 5. Check branchName exists
  if (!attempt.branchName) {
    return { ok: false, code: "PR_CREATE_FAILED", message: "Missing branch name for PR creation" };
  }

  // 6. Get repo path and base branch
  const repoPath = await deps.getRepoPath(attemptId);
  if (!repoPath) {
    return { ok: false, code: "PR_CREATE_FAILED", message: "Could not determine repo path" };
  }
  const baseBranch = await deps.getBaseBranch(attemptId);

  // 7. Create PR
  const title = attempt.taskTitle ? `vibe: ${attempt.taskTitle}` : `Attempt #${attemptId.slice(0, 8)}`;
  const body = buildPrBody(attemptId, attempt.headCommit, attempt.taskTitle);

  let prUrl: string;
  try {
    const result = await deps.createPullRequest({
      repoPath,
      branchName: attempt.branchName,
      baseBranch,
      title,
      body,
    });
    prUrl = result.prUrl;
  } catch (error) {
    if (error instanceof Error && isGhUnavailableError(error)) {
      return { ok: false, code: "PR_CREATION_UNAVAILABLE", message: "GitHub CLI (gh) not available" };
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return { ok: false, code: "PR_CREATE_FAILED", message };
  }

  // 8. Store prUrl
  await deps.setAttemptPrUrl(attemptId, prUrl);

  return { ok: true, prUrl };
}

function buildPrBody(attemptId: string, commitSha?: string | null, taskTitle?: string | null): string {
  const lines: string[] = [];
  lines.push("## Auto-generated PR");
  lines.push("");
  if (taskTitle) {
    lines.push(`**Task:** ${taskTitle}`);
  }
  lines.push(`**Attempt:** \`${attemptId.slice(0, 8)}\``);
  if (commitSha) {
    lines.push(`**Commit:** \`${commitSha.slice(0, 7)}\``);
  }
  lines.push("");
  lines.push("Created by Factory/Autopilot");
  return lines.join("\n");
}
