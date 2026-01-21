/** Factory Auto-Fix Claude Runner (PR-100) - Execute Claude Code for smart fixes */
import { buildClaudeFixPrompt, type FailureType } from "./factory-auto-fix-prompt";

export interface ClaudeFixContext {
  prUrl: string;
  prNumber: number;
  branchName: string;
  failureType: FailureType;
  summary: string;
  logSnippet: string;
}

export interface CommandResult {
  success: boolean;
  output: string;
  commitSha?: string;
}

export type ClaudeFixResult =
  | { ok: true; commitSha: string; changedFiles: string[] }
  | { ok: false; code: "NO_CHANGES" | "CLAUDE_FAILED" | "TESTS_FAILED" | "GIT_FAILED"; details?: string };

export interface ClaudeRunnerDeps {
  checkoutPrBranch: (prUrl: string, cwd: string) => Promise<CommandResult>;
  runClaudeCode: (prompt: string, cwd: string) => Promise<CommandResult>;
  getChangedFiles: (cwd: string) => Promise<string[]>;
  runTests: (cwd: string) => Promise<CommandResult>;
  commitAndPush: (cwd: string, message: string, branchName: string) => Promise<CommandResult>;
  getProjectPath: () => string;
}

/**
 * Run Claude Code to fix a CI failure in a PR branch.
 * Steps: checkout → claude code → check changes → test → commit/push
 */
export async function runClaudeAutofix(
  context: ClaudeFixContext,
  deps: ClaudeRunnerDeps
): Promise<ClaudeFixResult> {
  const cwd = deps.getProjectPath();

  // Step 1: Checkout PR branch
  const checkoutResult = await deps.checkoutPrBranch(context.prUrl, cwd);
  if (!checkoutResult.success) {
    return { ok: false, code: "GIT_FAILED", details: checkoutResult.output };
  }

  // Step 2: Run Claude Code with prompt
  const prompt = buildClaudeFixPrompt({
    failureType: context.failureType,
    summary: context.summary,
    logSnippet: context.logSnippet,
    prNumber: context.prNumber,
  });

  let claudeResult: CommandResult;
  try {
    claudeResult = await deps.runClaudeCode(prompt, cwd);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, code: "CLAUDE_FAILED", details: msg };
  }

  if (!claudeResult.success) {
    return { ok: false, code: "CLAUDE_FAILED", details: claudeResult.output };
  }

  // Step 3: Check for changes
  const changedFiles = await deps.getChangedFiles(cwd);
  if (changedFiles.length === 0) {
    return { ok: false, code: "NO_CHANGES" };
  }

  // Step 4: Run tests
  const testResult = await deps.runTests(cwd);
  if (!testResult.success) {
    return { ok: false, code: "TESTS_FAILED", details: testResult.output };
  }

  // Step 5: Commit and push
  const commitMessage = `fix(factory): auto-fix PR #${context.prNumber} (attempt 1)`;
  const pushResult = await deps.commitAndPush(cwd, commitMessage, context.branchName);
  if (!pushResult.success) {
    return { ok: false, code: "GIT_FAILED", details: pushResult.output };
  }

  return {
    ok: true,
    commitSha: pushResult.commitSha || "unknown",
    changedFiles,
  };
}
