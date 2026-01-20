/**
 * SimpleRunner (PR-60)
 * Execute attempt using LocalRunner, store logs and status.
 *
 * Responsibility: Full lifecycle of a simple attempt execution
 * - Create attempt record
 * - Execute command via LocalRunner
 * - Store logs in real-time
 * - Store final status and artifact
 *
 * No Docker, no Git worktree, no PR creation.
 * Use for local testing and basic task execution.
 */
import { db } from "@/server/db";
import { attempts, logs, artifacts } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { LocalRunner, LogEntry } from "./local-runner";
import { emitAttemptStatus, emitAttemptLog } from "@/server/services/events-hub";
import { checkProviderBudget } from "@/server/services/ai/ai-budget-guard";

export interface SimpleRunOptions {
  taskId: string;
  projectId: string;
  command: string[];
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  autopilotRunId?: string; // PR-73: link to autopilot session
}

export interface SimpleRunResult {
  success: boolean;
  attemptId: string | null;
  exitCode: number;
  error?: string;
  budgetRejected?: boolean; // PR-74: true if budget check failed
  limitUSD?: number; // PR-74: budget limit when rejected
  spendUSD?: number; // PR-74: current spend when rejected
}

/**
 * Run a simple attempt: create record, execute command, store results
 */
export async function runSimpleAttempt(options: SimpleRunOptions): Promise<SimpleRunResult> {
  const { taskId, projectId, command, cwd, env, timeout, autopilotRunId } = options;

  // PR-74: Check budget BEFORE creating attempt
  const budgetCheck = await checkProviderBudget("anthropic");
  if (!budgetCheck.allowed) {
    return {
      success: false,
      attemptId: null,
      exitCode: -1,
      error: `Budget limit exceeded: spent $${budgetCheck.spendUSD?.toFixed(2)} of $${budgetCheck.limitUSD?.toFixed(2)} budget`,
      budgetRejected: true,
      limitUSD: budgetCheck.limitUSD,
      spendUSD: budgetCheck.spendUSD,
    };
  }

  // Generate attempt ID
  const attemptId = randomUUID();

  // Create attempt record
  const now = new Date();
  await db.insert(attempts).values({
    id: attemptId,
    taskId,
    startedAt: now,
    agent: "LocalRunner",
    baseBranch: "main",
    worktreePath: cwd || process.cwd(),
    status: "running",
    autopilotRunId: autopilotRunId ?? null, // PR-73: link to run
  });

  // Emit running status
  emitAttemptStatus({ attemptId, status: "running" });

  // Create runner
  const runner = new LocalRunner();

  // Store logs as they come
  runner.on("log", async (entry: LogEntry) => {
    try {
      await db.insert(logs).values({
        id: randomUUID(),
        attemptId,
        timestamp: entry.timestamp,
        level: entry.level,
        message: entry.message,
      });
    } catch (err) {
      // Ignore FK errors if attempt was deleted
    }

    // Emit for real-time updates
    emitAttemptLog({
      attemptId,
      timestamp: entry.timestamp,
      level: entry.level,
      message: entry.message,
    });
  });

  // Execute command
  let exitCode = 1;
  try {
    const result = await runner.run({ command, cwd, env, timeout });
    exitCode = result.exitCode;
  } catch (error: any) {
    // Store error as log
    await db.insert(logs).values({
      id: randomUUID(),
      attemptId,
      timestamp: new Date(),
      level: "error",
      message: `Runner error: ${error.message}`,
    });
  }

  // Determine final status
  const finalStatus = exitCode === 0 ? "completed" : "failed";
  const finishedAt = new Date();

  // Update attempt record
  await db.update(attempts)
    .set({
      finishedAt,
      status: finalStatus,
      exitCode,
    })
    .where(eq(attempts.id, attemptId));

  // Store execution summary as artifact
  const summary = {
    command: command.join(" "),
    exitCode,
    status: finalStatus,
    startedAt: now.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - now.getTime(),
  };

  await db.insert(artifacts).values({
    id: randomUUID(),
    attemptId,
    type: "summary",
    content: JSON.stringify(summary, null, 2),
  });

  // Emit final status
  emitAttemptStatus({ attemptId, status: finalStatus, exitCode });

  // Cleanup
  await runner.cleanup();

  return {
    success: exitCode === 0,
    attemptId,
    exitCode,
  };
}
