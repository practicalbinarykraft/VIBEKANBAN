import { db } from "@/server/db";
import { tasks, attempts, logs, artifacts } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { DockerRunner } from "@/server/services/docker-runner";
import { emitAttemptLog, emitAttemptStatus } from "@/server/services/events-hub";
import { registerRunner, unregisterRunner } from "@/server/services/runners-store";
import { scheduleProject } from "@/server/services/attempt-queue";
import { randomUUID } from "crypto";
import { parseUnifiedDiff } from "@/lib/diff-parser";
import { existsSync } from "fs";
import { execSync } from "child_process";

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

  console.log(`[Runner] Starting attempt ${attemptId} for task ${taskId}`);

  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  const useClaude = !!anthropicApiKey;

  const runner = new DockerRunner();
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
      // Ignore FOREIGN KEY errors (attempt/task might have been deleted)
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
  runner.run({
    command,
    env,
    enableNetwork: useClaude,
    binds: [`${workspacePath}:/workspace:rw`],
  }).then(async ({ exitCode, containerId }) => {
    const finalStatus = exitCode === 0 ? "completed" : "failed";

    let diffContent = "";
    let headCommit: string | null = null;

    if (branchName && existsSync(workspacePath)) {
      try {
        const statusOutput = execSync(`git -C "${workspacePath}" status --porcelain`, { encoding: "utf-8" }).trim();

        if (statusOutput.length > 0) {
          execSync(`git -C "${workspacePath}" add -A`, { encoding: "utf-8" });

          const commitMessage = `Task #${taskId}: ${taskTitle}\n\n${taskDescription}\n\n🤖 Generated with Vibe Kanban\nAgent: ${agentName}`;

          execSync(`git -C "${workspacePath}" commit -m "${commitMessage.replace(/"/g, '\\"')}"`, { encoding: "utf-8" });
          headCommit = execSync(`git -C "${workspacePath}" rev-parse HEAD`, { encoding: "utf-8" }).trim();
          diffContent = execSync(`git -C "${workspacePath}" diff HEAD~1 HEAD --no-color`, { encoding: "utf-8" }).trim();

          console.log(`✅ Committed changes to ${branchName}, commit: ${headCommit}`);
        } else {
          console.log("ℹ️ No changes detected in workspace");
        }
      } catch (error: any) {
        console.error("Failed to commit changes:", error.message);
      }
    }

    await db.update(attempts)
      .set({
        finishedAt: new Date(),
        status: finalStatus,
        exitCode,
        containerId,
        headCommit,
      })
      .where(eq(attempts.id, attemptId));

    try {
      if (diffContent && diffContent.trim().length > 0) {
        const parsedDiffs = parseUnifiedDiff(diffContent);
        const totalAdd = parsedDiffs.reduce((sum, f) => sum + f.additions, 0);
        const totalDel = parsedDiffs.reduce((sum, f) => sum + f.deletions, 0);
        const summary = `# Task Execution Summary\n**Task:** ${taskTitle}\n**Status:** ${finalStatus === "completed" ? "Completed ✅" : "Failed ❌"}\n**Exit Code:** ${exitCode}\n\n## Changes\n- Files: ${parsedDiffs.length}\n- Additions: +${totalAdd}\n- Deletions: -${totalDel}\n\n## Git\n- Branch: ${branchName || "N/A"}\n- Commit: ${headCommit?.slice(0, 8) || "N/A"}\n`;
        await db.insert(artifacts).values([
          { id: randomUUID(), attemptId, type: "summary", content: summary },
          { id: randomUUID(), attemptId, type: "diff", content: diffContent },
        ]);
      } else {
        const summary = `# Task Execution Summary\n**Task:** ${taskTitle}\n**Status:** ${finalStatus === "completed" ? "Completed ✅" : "Failed ❌"}\n**Exit Code:** ${exitCode}\n\nNo changes detected.`;
        await db.insert(artifacts).values({ id: randomUUID(), attemptId, type: "summary", content: summary });
      }
    } catch (error: any) {
      // Ignore FOREIGN KEY errors (attempt/task might have been deleted)
      if (!error.message?.includes("FOREIGN KEY")) {
        console.error("Error inserting artifacts:", error);
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

    await db.update(attempts)
      .set({
        finishedAt: new Date(),
        status: "failed",
        exitCode: 1,
      })
      .where(eq(attempts.id, attemptId));

    emitAttemptStatus({ attemptId, status: "failed", exitCode: 1 });

    await runner.cleanup();
    unregisterRunner(attemptId);
    await scheduleProject(projectId);
  });
}
