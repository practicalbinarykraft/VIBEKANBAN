/** Factory Auto-Fix Dependencies (PR-99, PR-100) - Real implementations for DI */
import { db } from "@/server/db";
import { factoryPrAutofix, attempts, projects, artifacts } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { spawn } from "child_process";
import { getRunPrChecks, type FactoryPrCheckSnapshot } from "./factory-pr-checks.service";
import { createPrChecksDeps } from "./factory-pr-checks-deps";
import { saveAutofixReport as saveReport } from "./factory-autofix-artifacts";
import type { AutoFixDeps, PrWithCiStatus, AutofixReport, ClaudeResultArtifact } from "./factory-auto-fix.service";
import type { AutofixRunnerDeps, CommandResult } from "./factory-auto-fix-runner";
import { runAutofixAttempt } from "./factory-auto-fix-runner";
import { runClaudeAutofix, type ClaudeFixContext } from "./factory-auto-fix-claude-runner";
import { createClaudeRunnerDeps } from "./factory-auto-fix-claude-deps";

async function execCommand(cmd: string, args: string[], cwd: string): Promise<CommandResult> {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, { cwd, shell: true });
    let output = "";

    proc.stdout.on("data", (data) => { output += data.toString(); });
    proc.stderr.on("data", (data) => { output += data.toString(); });

    proc.on("close", (code) => {
      resolve({ success: code === 0, output: output.slice(-2000), exitCode: code ?? 1 });
    });

    proc.on("error", (err) => {
      resolve({ success: false, output: err.message, exitCode: 1 });
    });
  });
}

function createRunnerDeps(projectPath: string): AutofixRunnerDeps {
  return {
    getProjectPath: () => projectPath,
    checkoutPrBranch: async (prUrl: string, cwd: string) => {
      // Extract PR number from URL: https://github.com/org/repo/pull/123
      const match = prUrl.match(/\/pull\/(\d+)/);
      if (!match) {
        return { success: false, output: "Invalid PR URL", exitCode: 1 };
      }
      const prNumber = match[1];
      return execCommand("gh", ["pr", "checkout", prNumber], cwd);
    },
    runTests: async (cwd: string) => {
      return execCommand("npm", ["run", "test:unit"], cwd);
    },
  };
}

export function createAutoFixDeps(projectId: string): AutoFixDeps {
  return {
    getPrsWithCiStatus: async (runId: string): Promise<PrWithCiStatus[]> => {
      const prChecksDeps = createPrChecksDeps();
      const checks = await getRunPrChecks(prChecksDeps, runId);

      // Get attempt details to enrich with branchName
      const attemptRows = await db.select().from(attempts)
        .where(eq(attempts.autopilotRunId, runId));

      return checks.map((c: FactoryPrCheckSnapshot) => {
        const attempt = attemptRows.find((a) => a.taskId === c.taskId);
        return {
          taskId: c.taskId,
          attemptId: attempt?.id ?? "",
          prUrl: c.prUrl,
          commitSha: c.commitSha,
          ciStatus: c.status,
          branchName: attempt?.branchName ?? "",
        };
      });
    },

    hasAutofixAttempt: async (prUrl: string): Promise<boolean> => {
      const rows = await db.select().from(factoryPrAutofix)
        .where(eq(factoryPrAutofix.prUrl, prUrl));
      return rows.length > 0;
    },

    recordAutofixAttempt: async (runId: string, prUrl: string, status: "success" | "failed", errorText?: string) => {
      await db.insert(factoryPrAutofix).values({
        id: randomUUID(),
        runId,
        prUrl,
        attemptNumber: 1,
        status,
        errorText: errorText ?? null,
      });
    },

    runAutofixAttempt: async (pr: PrWithCiStatus) => {
      // Get project path
      const project = await db.select().from(projects)
        .where(eq(projects.id, projectId))
        .get();
      const projectPath = project?.repoPath ?? process.cwd();
      const runnerDeps = createRunnerDeps(projectPath);
      return runAutofixAttempt(pr, runnerDeps);
    },

    saveAutofixReport: async (attemptId: string, report: AutofixReport) => {
      await saveReport(attemptId, report);
    },

    // PR-100: Claude auto-fix methods
    runClaudeAutofix: async (context: ClaudeFixContext) => {
      const project = await db.select().from(projects)
        .where(eq(projects.id, projectId))
        .get();
      const projectPath = project?.repoPath ?? process.cwd();
      const claudeDeps = createClaudeRunnerDeps(projectPath);
      return runClaudeAutofix(context, claudeDeps);
    },

    saveClaudeResult: async (attemptId: string, result: ClaudeResultArtifact) => {
      await db.insert(artifacts).values({
        id: randomUUID(),
        attemptId,
        type: "factory_autofix_claude_result",
        content: JSON.stringify(result),
      });
    },
  };
}

/**
 * Get autofix status for a run (for UI display)
 */
export async function getAutofixStatus(runId: string): Promise<{ total: number; used: number }> {
  const prChecksDeps = createPrChecksDeps();
  const checks = await getRunPrChecks(prChecksDeps, runId);
  const failedPrs = checks.filter((c: FactoryPrCheckSnapshot) => c.status === "failed");

  const autofixRows = await db.select().from(factoryPrAutofix)
    .where(eq(factoryPrAutofix.runId, runId));

  return {
    total: failedPrs.length,
    used: autofixRows.length,
  };
}
