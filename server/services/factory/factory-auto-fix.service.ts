/** Factory Auto-Fix Service (PR-99, PR-100) - Orchestrate auto-fix attempts */
import type { PrCheckStatus } from "./factory-pr-checks.service";
import type { ClaudeFixResult, ClaudeFixContext } from "./factory-auto-fix-claude-runner";

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

export type AutoFixSummary = "TS_error" | "Unit_test_failure" | "Build_failed" | "E2E_failed" | "Unknown";

export interface AutofixReport {
  prUrl: string;
  runId: string;
  ciStatusSnapshot: PrCheckStatus;
  logs: string;
  summary: AutoFixSummary;
  createdAt: string;
}

export interface ClaudeResultArtifact {
  commitSha?: string;
  changedFiles?: string[];
  code?: string;
  details?: string;
}

export type AutoFixMode = "diagnostics" | "claude";

export interface AutoFixDeps {
  getPrsWithCiStatus: (runId: string) => Promise<PrWithCiStatus[]>;
  hasAutofixAttempt: (prUrl: string) => Promise<boolean>;
  recordAutofixAttempt: (runId: string, prUrl: string, status: "success" | "failed", errorText?: string) => Promise<void>;
  runAutofixAttempt: (pr: PrWithCiStatus) => Promise<AutofixAttemptResult>;
  saveAutofixReport: (attemptId: string, report: AutofixReport) => Promise<void>;
  runClaudeAutofix?: (context: ClaudeFixContext) => Promise<ClaudeFixResult>;
  saveClaudeResult?: (attemptId: string, result: ClaudeResultArtifact) => Promise<void>;
}

export type AutoFixAction = "skipped" | "fixed" | "failed";
export type AutoFixReason = "already_fixed" | "not_failed" | "no_pr" | "error";

export interface AutoFixResult {
  prUrl: string | null;
  action: AutoFixAction;
  reason?: AutoFixReason;
}

export function classifyError(logs: string): AutoFixSummary {
  const lower = logs.toLowerCase();
  if (lower.includes("typescript") || lower.includes("ts error") || lower.includes("type error")) return "TS_error";
  if (lower.includes("test failed") || lower.includes("vitest") || lower.includes("jest")) return "Unit_test_failure";
  if (lower.includes("build failed") || lower.includes("next build")) return "Build_failed";
  if (lower.includes("e2e") || lower.includes("playwright")) return "E2E_failed";
  return "Unknown";
}

function extractPrNumber(prUrl: string): number {
  const match = prUrl.match(/\/pull\/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

/** Run auto-fix for all failed PRs. mode=diagnostics (default) | mode=claude */
export async function runAutoFix(
  runId: string,
  deps: AutoFixDeps,
  mode: AutoFixMode = "diagnostics"
): Promise<AutoFixResult[]> {
  const prs = await deps.getPrsWithCiStatus(runId);
  const results: AutoFixResult[] = [];

  for (const pr of prs) {
    if (!pr.prUrl) { results.push({ prUrl: null, action: "skipped", reason: "no_pr" }); continue; }
    if (pr.ciStatus !== "failed") { results.push({ prUrl: pr.prUrl, action: "skipped", reason: "not_failed" }); continue; }

    const alreadyFixed = await deps.hasAutofixAttempt(pr.prUrl);
    if (alreadyFixed) { results.push({ prUrl: pr.prUrl, action: "skipped", reason: "already_fixed" }); continue; }

    // Step 1: Always run diagnostics first
    let attemptResult: AutofixAttemptResult;
    try {
      attemptResult = await deps.runAutofixAttempt(pr);
    } catch (err) {
      attemptResult = { success: false, logs: err instanceof Error ? err.message : String(err) };
    }

    const summary = classifyError(attemptResult.logs);
    const report: AutofixReport = {
      prUrl: pr.prUrl, runId, ciStatusSnapshot: pr.ciStatus,
      logs: attemptResult.logs.slice(-400), summary, createdAt: new Date().toISOString(),
    };
    await deps.saveAutofixReport(pr.attemptId, report);

    // Step 2: If mode=claude and we have the runner, try Claude fix
    let claudeSuccess = false;
    if (mode === "claude" && deps.runClaudeAutofix) {
      const context: ClaudeFixContext = {
        prUrl: pr.prUrl, prNumber: extractPrNumber(pr.prUrl), branchName: pr.branchName,
        failureType: summary, summary: report.logs, logSnippet: attemptResult.logs.slice(-1000),
      };

      try {
        const claudeResult = await deps.runClaudeAutofix(context);
        if (claudeResult.ok) {
          claudeSuccess = true;
          if (deps.saveClaudeResult) {
            await deps.saveClaudeResult(pr.attemptId, { commitSha: claudeResult.commitSha, changedFiles: claudeResult.changedFiles });
          }
        } else if (deps.saveClaudeResult) {
          await deps.saveClaudeResult(pr.attemptId, { code: claudeResult.code, details: claudeResult.details });
        }
      } catch (err) {
        if (deps.saveClaudeResult) {
          await deps.saveClaudeResult(pr.attemptId, { code: "CLAUDE_FAILED", details: err instanceof Error ? err.message : String(err) });
        }
      }
    }

    const finalSuccess = mode === "claude" ? claudeSuccess : attemptResult.success;
    await deps.recordAutofixAttempt(runId, pr.prUrl, finalSuccess ? "success" : "failed", finalSuccess ? undefined : "Auto-fix failed");

    results.push(finalSuccess ? { prUrl: pr.prUrl, action: "fixed" } : { prUrl: pr.prUrl, action: "failed", reason: "error" });
  }

  return results;
}
