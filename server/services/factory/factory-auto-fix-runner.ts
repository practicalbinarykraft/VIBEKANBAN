/** Factory Auto-Fix Runner (PR-99) - Execute autofix attempts on PR branches */
import type { PrCheckStatus } from "./factory-pr-checks.service";

export interface PrWithCiStatus {
  taskId: string;
  attemptId: string;
  prUrl: string | null;
  commitSha: string;
  ciStatus: PrCheckStatus;
  branchName: string;
}

export interface CommandResult {
  success: boolean;
  output: string;
  exitCode?: number;
}

export interface AutofixAttemptResult {
  success: boolean;
  logs: string;
}

export interface AutofixRunnerDeps {
  checkoutPrBranch: (prUrl: string, cwd: string) => Promise<CommandResult>;
  runTests: (cwd: string) => Promise<CommandResult>;
  getProjectPath: () => string;
}

/**
 * Run an autofix attempt on a PR branch.
 *
 * PR-99 scope: Minimal - checkout branch and run tests to collect diagnostics.
 * We don't do "smart" fixes in this PR - just establish the control loop.
 */
export async function runAutofixAttempt(
  pr: PrWithCiStatus,
  deps: AutofixRunnerDeps
): Promise<AutofixAttemptResult> {
  const logs: string[] = [];
  const cwd = deps.getProjectPath();

  // Step 1: Checkout PR branch
  let checkoutResult: CommandResult;
  try {
    checkoutResult = await deps.checkoutPrBranch(pr.prUrl!, cwd);
    logs.push(`[Checkout] ${checkoutResult.output}`);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logs.push(`[Checkout Error] ${errMsg}`);
    return { success: false, logs: logs.join("\n") };
  }

  if (!checkoutResult.success) {
    return { success: false, logs: logs.join("\n") };
  }

  // Step 2: Run tests
  let testResult: CommandResult;
  try {
    testResult = await deps.runTests(cwd);
    logs.push(`[Tests] ${testResult.output}`);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logs.push(`[Tests Error] ${errMsg}`);
    return { success: false, logs: logs.join("\n") };
  }

  return {
    success: testResult.success,
    logs: logs.join("\n"),
  };
}
