import { db } from "@/server/db";
import { tasks, attempts, logs, artifacts, projects } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { DockerRunner } from "@/server/services/docker-runner";
import { StubRunner } from "@/server/services/stub-runner";
import { emitAttemptLog, emitAttemptStatus } from "@/server/services/events-hub";
import { registerRunner, unregisterRunner } from "@/server/services/runners-store";
import { scheduleProject } from "@/server/services/attempt-queue";
import { randomUUID } from "crypto";
import { parseUnifiedDiff } from "@/lib/diff-parser";
import { existsSync } from "fs";
import { execSync } from "child_process";
import { ExecutionResult } from "@/types/execution-result";
import { checkRepoPreconditions, getDiffSummary } from "./execution/repo-preconditions";
import { createPullRequest } from "./execution/pr-creator";
import { tryPublishAttemptPr } from "./execution/attempt-pr-publisher-deps";
import { isMockModeEnabled } from "@/lib/mock-mode";

const isTestMode = isMockModeEnabled();

interface RunAttemptOptions {
  attemptId: string;
  taskId: string;
  taskTitle: string;
  taskDescription: string;
  projectId: string;
  projectDefaultBranch: string;
  branchName: string | null;
  baseCommit: string | null;
  workspacePath: string;
  agentName: string;
}

/**
 * Store execution result as artifact
 */
async function storeExecutionResult(attemptId: string, result: ExecutionResult) {
  try {
    await db.insert(artifacts).values({
      id: randomUUID(),
      attemptId,
      type: "summary",
      content: JSON.stringify(result, null, 2),
    });
  } catch (error: any) {
    if (!error.message?.includes("FOREIGN KEY")) {
      console.error("Error storing execution result:", error);
    }
  }
}

/**
 * Start Docker runner for attempt
 * Handles logs, artifacts, completion, cleanup, and queue scheduling
 */
export async function runAttempt(options: RunAttemptOptions): Promise<void> {
  const {
    attemptId,
    taskId,
    taskTitle,
    taskDescription,
    projectId,
    projectDefaultBranch,
    branchName,
    baseCommit,
    workspacePath,
    agentName,
  } = options;

  console.log(`[Runner] Starting attempt ${attemptId} for task ${taskId}${isTestMode ? " (stub mode)" : ""}`);

  // Get project for repo path
  const project = await db.select().from(projects).where(eq(projects.id, projectId)).get();
  const repoPath = project?.repoPath;

  // Check repo preconditions
  const preconditions = await checkRepoPreconditions(repoPath);
  if (!preconditions.ok && !isTestMode) {
    console.error(`[Runner] Preconditions failed: ${preconditions.error?.message}`);

    const result: ExecutionResult = {
      ok: false,
      error: {
        code: preconditions.error?.code as any || "REPO_NOT_READY",
        message: preconditions.error?.message || "Repo not ready",
      },
      logs: [`Preconditions failed: ${preconditions.error?.message}`],
    };

    await storeExecutionResult(attemptId, result);

    await db.update(attempts)
      .set({ finishedAt: new Date(), status: "failed", exitCode: 1 })
      .where(eq(attempts.id, attemptId));

    emitAttemptStatus({ attemptId, status: "failed", exitCode: 1 });
    await scheduleProject(projectId);
    return;
  }

  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  const useClaude = !!anthropicApiKey && !isTestMode;

  // Use StubRunner in test mode to avoid Docker dependency
  const runner = isTestMode ? new StubRunner() : new DockerRunner();
  registerRunner(attemptId, runner);

  // Listen to logs
  runner.on("log", async (logEntry) => {
    try {
      await db.insert(logs).values({
        id: randomUUID(),
        attemptId,
        timestamp: logEntry.timestamp,
        level: logEntry.level,
        message: logEntry.message,
      });
    } catch (error: any) {
      if (!error.message?.includes("FOREIGN KEY")) {
        console.error("Error inserting log:", error);
      }
    }

    emitAttemptLog({
      attemptId,
      timestamp: logEntry.timestamp,
      level: logEntry.level,
      message: logEntry.message,
    });
  });

  // Prepare command
  let command: string[];
  let env: Record<string, string> = {};

  if (useClaude) {
    env = { ANTHROPIC_API_KEY: anthropicApiKey };
    const taskPrompt = `${taskTitle}\n\n${taskDescription}`;
    command = [
      "sh", "-c",
      `echo "Task: ${taskTitle}" && echo "Using Claude CLI..." && npx -y @anthropic-ai/claude-code "${taskPrompt.replace(/"/g, '\\"')}" || echo "Claude CLI execution completed"`
    ];
  } else {
    command = [
      "sh", "-c",
      `echo "⚠️  WARNING: ANTHROPIC_API_KEY not set" && echo "Running in mock mode for testing..." && echo "Task: ${taskTitle}" && sleep 2 && echo "Installing dependencies..." && echo "# Modified by agent at $(date)" > README.md && echo "Test content for ${taskTitle}" >> README.md && sleep 3 && echo "Running tests..." && sleep 2 && echo "Mock task completed successfully!"`
    ];
  }

  // Run in background
  const runPromise = isTestMode
    ? runner.run()
    : (runner as DockerRunner).run({
        command,
        env,
        enableNetwork: useClaude,
        binds: [`${workspacePath}:/workspace:rw`],
      });

  runPromise.then(async ({ exitCode, containerId }) => {
    let diffContent = "";
    let headCommit: string | null = null;
    let executionResult: ExecutionResult;

    if (branchName && existsSync(workspacePath)) {
      try {
        const statusOutput = execSync(`git -C "${workspacePath}" status --porcelain`, { encoding: "utf-8" }).trim();

        if (statusOutput.length > 0) {
          execSync(`git -C "${workspacePath}" add -A`, { encoding: "utf-8" });

          // Get diff summary before commit
          const { summary, files } = await getDiffSummary(workspacePath);

          const commitMessage = `vibe: task ${taskId.slice(0, 8)} - ${taskTitle}`;
          execSync(`git -C "${workspacePath}" commit -m "${commitMessage.replace(/"/g, '\\"')}"`, { encoding: "utf-8" });
          headCommit = execSync(`git -C "${workspacePath}" rev-parse HEAD`, { encoding: "utf-8" }).trim();
          diffContent = execSync(`git -C "${workspacePath}" diff HEAD~1 HEAD --no-color`, { encoding: "utf-8" }).trim();

          console.log(`✅ Committed changes to ${branchName}, commit: ${headCommit}`);

          // Push branch
          let pushError: string | undefined;
          try {
            execSync(`git -C "${workspacePath}" push -u origin ${branchName}`, { encoding: "utf-8", timeout: 60000 });
            console.log(`✅ Pushed branch ${branchName}`);
          } catch (err: any) {
            pushError = err.message;
            console.error(`❌ Push failed: ${err.message}`);
          }

          // Create PR
          let prUrl: string | undefined;
          let prNumber: number | undefined;
          if (!pushError && repoPath) {
            const prResult = await createPullRequest({
              repoPath: workspacePath,
              branchName,
              baseBranch: projectDefaultBranch,
              title: `vibe: ${taskTitle}`,
              body: `Automated changes for task.\n\n**Task:** ${taskTitle}\n\n${taskDescription}`,
            });
            if (prResult.ok) {
              prUrl = prResult.prUrl;
              prNumber = prResult.prNumber;
              console.log(`✅ Created PR: ${prUrl}`);
            }
          }

          executionResult = {
            ok: true,
            repoPath: workspacePath,
            branchName,
            changedFiles: files.map(f => ({ path: f.path, additions: f.additions, deletions: f.deletions })),
            diffSummary: summary,
            commitSha: headCommit || undefined,
            prUrl,
            prNumber,
            logs: [`Committed ${files.length} file(s)`, `Diff: ${summary}`],
          };
        } else {
          // NO CHANGES - EMPTY_DIFF
          console.log("⚠️ No changes detected in workspace (EMPTY_DIFF)");

          executionResult = {
            ok: false,
            error: {
              code: "EMPTY_DIFF",
              message: "Agent produced no code changes. Try refining the task or provide more context.",
            },
            repoPath: workspacePath,
            branchName,
            logs: ["No changes detected in workspace"],
          };

          // Mark as failed
          await db.update(attempts)
            .set({ finishedAt: new Date(), status: "failed", exitCode: 1 })
            .where(eq(attempts.id, attemptId));

          await storeExecutionResult(attemptId, executionResult);
          emitAttemptStatus({ attemptId, status: "failed", exitCode: 1 });

          await db.update(tasks)
            .set({ status: "todo" })
            .where(eq(tasks.id, taskId));

          await runner.cleanup();
          unregisterRunner(attemptId);
          await scheduleProject(projectId);
          return;
        }
      } catch (error: any) {
        console.error("Failed to commit changes:", error.message);
        executionResult = {
          ok: false,
          error: { code: "GIT_ERROR", message: error.message },
          logs: [`Git error: ${error.message}`],
        };
      }
    } else {
      // No branchName or workspace doesn't exist
      executionResult = {
        ok: exitCode === 0,
        error: exitCode !== 0 ? { code: "UNKNOWN", message: "Task execution failed" } : undefined,
        logs: ["No git workspace available"],
      };
    }

    const finalStatus = exitCode === 0 && executionResult.ok ? "completed" : "failed";

    await db.update(attempts)
      .set({
        finishedAt: new Date(),
        status: finalStatus,
        exitCode,
        containerId,
        headCommit,
        prUrl: executionResult.prUrl,
        prNumber: executionResult.prNumber,
      })
      .where(eq(attempts.id, attemptId));

    await storeExecutionResult(attemptId, executionResult);

    try {
      if (diffContent && diffContent.trim().length > 0) {
        await db.insert(artifacts).values({
          id: randomUUID(),
          attemptId,
          type: "diff",
          content: diffContent,
        });
      }
    } catch (error: any) {
      if (!error.message?.includes("FOREIGN KEY")) {
        console.error("Error inserting artifacts:", error);
      }
    }

    // PR-97: Fallback auto-PR if not created yet (idempotent)
    if (finalStatus === "completed" && !executionResult.prUrl) {
      const publishResult = await tryPublishAttemptPr(attemptId);
      if (publishResult.ok) {
        executionResult.prUrl = publishResult.prUrl;
      }
    }

    emitAttemptStatus({ attemptId, status: finalStatus, exitCode });

    await db.update(tasks)
      .set({ status: exitCode === 0 ? "in_review" : "todo" })
      .where(eq(tasks.id, taskId));

    await runner.cleanup();
    unregisterRunner(attemptId);
    await scheduleProject(projectId);
  }).catch(async (error) => {
    console.error("Runner error:", error);

    const executionResult: ExecutionResult = {
      ok: false,
      error: { code: "UNKNOWN", message: error.message || "Runner error" },
      logs: [`Runner error: ${error.message}`],
    };

    await storeExecutionResult(attemptId, executionResult);

    await db.update(attempts)
      .set({ finishedAt: new Date(), status: "failed", exitCode: 1 })
      .where(eq(attempts.id, attemptId));

    emitAttemptStatus({ attemptId, status: "failed", exitCode: 1 });

    await runner.cleanup();
    unregisterRunner(attemptId);
    await scheduleProject(projectId);
  });
}
