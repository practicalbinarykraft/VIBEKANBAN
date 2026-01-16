/**
 * Task Executor
 *
 * Executes a task by:
 * 1. Checking repo preconditions
 * 2. Creating workspace branch
 * 3. Using AI to generate file changes
 * 4. Writing files to repo
 * 5. Committing changes (if any)
 * 6. Creating PR (if changes exist)
 */

import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import { ExecutionResult, errorResult, successResult, ChangedFile } from "@/types/execution-result";
import {
  checkRepoPreconditions,
  createWorkspaceBranch,
  hasStagedChanges,
  getDiffSummary,
} from "./repo-preconditions";
import { generateTaskChanges, FileChange } from "./ai-task-generator";
import { createPullRequest } from "./pr-creator";

const execAsync = promisify(exec);

export interface TaskExecutionInput {
  taskId: string;
  taskTitle: string;
  taskDescription: string;
  projectId: string;
  repoPath: string | null | undefined;
  defaultBranch?: string;
}

/**
 * Execute a single task end-to-end
 */
export async function executeTask(input: TaskExecutionInput): Promise<ExecutionResult> {
  const logs: string[] = [];
  const log = (msg: string) => logs.push(`[${new Date().toISOString()}] ${msg}`);

  log(`Starting execution for task: ${input.taskTitle}`);

  // 1. Check repo preconditions
  log("Checking repo preconditions...");
  const preconditions = await checkRepoPreconditions(input.repoPath);
  if (!preconditions.ok) {
    log(`Preconditions failed: ${preconditions.error?.message}`);
    return errorResult(
      preconditions.error?.code as any || "REPO_NOT_READY",
      preconditions.error?.message || "Repo not ready",
      logs
    );
  }

  const repoPath = preconditions.repoPath!;
  const baseBranch = input.defaultBranch || preconditions.defaultBranch || "main";
  log(`Repo OK at: ${repoPath}, base branch: ${baseBranch}`);

  // 2. Create workspace branch
  log("Creating workspace branch...");
  const branchResult = await createWorkspaceBranch(repoPath, input.taskId, baseBranch);
  if (!branchResult.ok) {
    log(`Branch creation failed: ${branchResult.error}`);
    return errorResult("GIT_ERROR", branchResult.error || "Failed to create branch", logs);
  }
  const branchName = branchResult.branchName!;
  log(`Created branch: ${branchName}`);

  // 3. Generate file changes using AI
  log("Generating file changes with AI...");
  let changes: FileChange[];
  try {
    changes = await generateTaskChanges({
      taskTitle: input.taskTitle,
      taskDescription: input.taskDescription,
      repoPath,
    });
    log(`AI generated ${changes.length} file change(s)`);
  } catch (err: any) {
    log(`AI generation failed: ${err.message}`);
    // Cleanup: checkout back to base branch
    await execAsync(`git checkout ${baseBranch}`, { cwd: repoPath }).catch(() => {});
    await execAsync(`git branch -D ${branchName}`, { cwd: repoPath }).catch(() => {});
    return errorResult("AI_ERROR", err.message, logs);
  }

  // 4. Apply file changes
  log("Applying file changes...");
  for (const change of changes) {
    const filePath = path.join(repoPath, change.path);
    const dir = path.dirname(filePath);

    if (change.operation === "delete") {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        log(`Deleted: ${change.path}`);
      }
    } else {
      // create or modify
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, change.content || "");
      log(`Wrote: ${change.path}`);
    }
  }

  // 5. Stage all changes
  log("Staging changes...");
  await execAsync("git add -A", { cwd: repoPath });

  // 6. Check for empty diff
  const hasChanges = await hasStagedChanges(repoPath);
  if (!hasChanges) {
    log("No changes detected (empty diff)");
    // Cleanup
    await execAsync(`git checkout ${baseBranch}`, { cwd: repoPath }).catch(() => {});
    await execAsync(`git branch -D ${branchName}`, { cwd: repoPath }).catch(() => {});
    return errorResult(
      "EMPTY_DIFF",
      "Agent produced no code changes. Try refining the task or provide more context.",
      logs
    );
  }

  // 7. Get diff summary
  const { summary, files } = await getDiffSummary(repoPath);
  log(`Diff: ${summary}`);

  const changedFiles: ChangedFile[] = files.map((f) => ({
    path: f.path,
    additions: f.additions,
    deletions: f.deletions,
    status: "modified",
  }));

  // 8. Commit changes
  log("Committing changes...");
  const commitMessage = `vibe: task ${input.taskId.slice(0, 8)} - ${input.taskTitle}`;
  try {
    await execAsync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`, { cwd: repoPath });
  } catch (err: any) {
    log(`Commit failed: ${err.message}`);
    return errorResult("GIT_ERROR", `Commit failed: ${err.message}`, logs);
  }

  // Get commit SHA
  let commitSha: string | undefined;
  try {
    const { stdout } = await execAsync("git rev-parse HEAD", { cwd: repoPath });
    commitSha = stdout.trim();
    log(`Committed: ${commitSha}`);
  } catch {
    // Ignore, commit still succeeded
  }

  // 9. Push branch
  log("Pushing branch...");
  try {
    await execAsync(`git push -u origin ${branchName}`, { cwd: repoPath, timeout: 60000 });
    log("Push successful");
  } catch (err: any) {
    log(`Push failed: ${err.message}`);
    return errorResult("GIT_ERROR", `Push failed: ${err.message}`, logs);
  }

  // 10. Create PR
  log("Creating pull request...");
  const prResult = await createPullRequest({
    repoPath,
    branchName,
    baseBranch,
    title: `vibe: ${input.taskTitle}`,
    body: `Automated changes for task: ${input.taskTitle}\n\n${input.taskDescription}`,
  });

  if (!prResult.ok) {
    log(`PR creation failed: ${prResult.error}`);
    // Still return success since code is committed and pushed
    return successResult({
      repoPath,
      branchName,
      changedFiles,
      diffSummary: summary,
      commitSha,
      logs,
    });
  }

  log(`PR created: ${prResult.prUrl}`);

  return successResult({
    repoPath,
    branchName,
    changedFiles,
    diffSummary: summary,
    commitSha,
    prUrl: prResult.prUrl,
    prNumber: prResult.prNumber,
    logs,
  });
}
