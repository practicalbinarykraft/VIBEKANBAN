/** Factory Auto-Fix Service (PR-99) - Orchestrate auto-fix attempts on failed PRs */
import type { PrCheckStatus } from "./factory-pr-checks.service";

export interface PrWithCiStatus {
  taskId: string;
  attemptId: string;
  prUrl: string | null;
  commitSha: string;
  ciStatus: PrCheckStatus;
  branchName: string;
}

export interface AutofixAttemptResult {
  success: boolean;
  logs: string;
}

export interface AutofixReport {
  prUrl: string;
  runId: string;
  ciStatusSnapshot: PrCheckStatus;
  logs: string;
  summary: "TS_error" | "Unit_test_failure" | "Build_failed" | "E2E_failed" | "Unknown";
  createdAt: string;
}

export interface AutoFixDeps {
  getPrsWithCiStatus: (runId: string) => Promise<PrWithCiStatus[]>;
  hasAutofixAttempt: (prUrl: string) => Promise<boolean>;
  recordAutofixAttempt: (runId: string, prUrl: string, status: "success" | "failed", errorText?: string) => Promise<void>;
  runAutofixAttempt: (pr: PrWithCiStatus) => Promise<AutofixAttemptResult>;
  saveAutofixReport: (attemptId: string, report: AutofixReport) => Promise<void>;
}

export type AutoFixAction = "skipped" | "fixed" | "failed";
export type AutoFixReason = "already_fixed" | "not_failed" | "no_pr" | "error";

export interface AutoFixResult {
  prUrl: string | null;
  action: AutoFixAction;
  reason?: AutoFixReason;
}

function classifyError(logs: string): AutofixReport["summary"] {
  const lower = logs.toLowerCase();
  if (lower.includes("typescript") || lower.includes("ts error") || lower.includes("type error")) {
    return "TS_error";
  }
  if (lower.includes("test failed") || lower.includes("vitest") || lower.includes("jest")) {
    return "Unit_test_failure";
  }
  if (lower.includes("build failed") || lower.includes("next build")) {
    return "Build_failed";
  }
  if (lower.includes("e2e") || lower.includes("playwright")) {
    return "E2E_failed";
  }
  return "Unknown";
}

/**
 * Run auto-fix for all failed PRs in a factory run.
 * Each PR gets at most 1 auto-fix attempt (anti-loop).
 */
export async function runAutoFix(runId: string, deps: AutoFixDeps): Promise<AutoFixResult[]> {
  const prs = await deps.getPrsWithCiStatus(runId);
  const results: AutoFixResult[] = [];

  for (const pr of prs) {
    // Skip if no PR URL
    if (!pr.prUrl) {
      results.push({ prUrl: null, action: "skipped", reason: "no_pr" });
      continue;
    }

    // Skip if CI not failed
    if (pr.ciStatus !== "failed") {
      results.push({ prUrl: pr.prUrl, action: "skipped", reason: "not_failed" });
      continue;
    }

    // Anti-loop: skip if already attempted
    const alreadyFixed = await deps.hasAutofixAttempt(pr.prUrl);
    if (alreadyFixed) {
      results.push({ prUrl: pr.prUrl, action: "skipped", reason: "already_fixed" });
      continue;
    }

    // Run auto-fix attempt
    let attemptResult: AutofixAttemptResult;
    let errorText: string | undefined;

    try {
      attemptResult = await deps.runAutofixAttempt(pr);
    } catch (err) {
      errorText = err instanceof Error ? err.message : String(err);
      attemptResult = { success: false, logs: errorText };
    }

    // Record attempt (anti-loop)
    const status = attemptResult.success ? "success" : "failed";
    errorText = errorText || (attemptResult.success ? undefined : "Auto-fix failed");
    await deps.recordAutofixAttempt(runId, pr.prUrl, status, errorText);

    // Save report artifact
    const report: AutofixReport = {
      prUrl: pr.prUrl,
      runId,
      ciStatusSnapshot: pr.ciStatus,
      logs: attemptResult.logs.slice(-400), // Last 400 chars
      summary: classifyError(attemptResult.logs),
      createdAt: new Date().toISOString(),
    };
    await deps.saveAutofixReport(pr.attemptId, report);

    // Return result
    if (attemptResult.success) {
      results.push({ prUrl: pr.prUrl, action: "fixed" });
    } else {
      results.push({ prUrl: pr.prUrl, action: "failed", reason: "error" });
    }
  }

  return results;
}
