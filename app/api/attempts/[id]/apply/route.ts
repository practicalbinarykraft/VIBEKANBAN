import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { attempts, projects, artifacts, tasks } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { execSync } from "child_process";
import { existsSync, rmSync } from "fs";
import { randomUUID } from "crypto";
import { getCurrentUserId, canPerformTaskAction, permissionDeniedError } from "@/server/services/permissions";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: attemptId } = await params;

  try {
    // Get current user
    const userId = await getCurrentUserId(request);

    // Get attempt
    const attempt = await db
      .select()
      .from(attempts)
      .where(eq(attempts.id, attemptId))
      .get();

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    // Check permissions
    const canPerform = await canPerformTaskAction(attempt.taskId, userId);
    if (!canPerform) {
      return NextResponse.json(permissionDeniedError(), { status: 403 });
    }

    // Validate attempt is completed
    if (attempt.status !== "completed") {
      return NextResponse.json(
        { error: "Can only apply completed attempts" },
        { status: 400 }
      );
    }

    // Check if already applied
    if (attempt.appliedAt) {
      return NextResponse.json(
        { error: "Attempt already applied", appliedAt: attempt.appliedAt },
        { status: 400 }
      );
    }

    // Get task to find projectId
    const task = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, attempt.taskId))
      .get();

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Get project to find repoPath
    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.id, task.projectId))
      .get();

    if (!project?.repoPath || !existsSync(project.repoPath)) {
      return NextResponse.json(
        { error: "Project repository not found" },
        { status: 400 }
      );
    }

    // Validate we have commits to apply
    if (!attempt.branchName || !attempt.headCommit) {
      return NextResponse.json(
        { error: "No changes to apply" },
        { status: 400 }
      );
    }

    let applyLog = "";
    let mergeStatus: "merged" | "conflict" = "merged";
    let applyError: string | null = null;

    try {
      // Switch to main branch
      applyLog += "Switching to main branch...\n";
      execSync(`git -C "${project.repoPath}" checkout ${attempt.baseBranch}`, { encoding: "utf-8" });

      // Pull latest (optional, but good practice)
      try {
        applyLog += "Pulling latest changes...\n";
        const pullOutput = execSync(`git -C "${project.repoPath}" pull --ff-only`, { encoding: "utf-8" });
        applyLog += pullOutput + "\n";
      } catch (pullError: any) {
        applyLog += `⚠️ Pull failed (maybe no remote): ${pullError.message}\n`;
      }

      // Merge the attempt branch
      applyLog += `Merging branch ${attempt.branchName}...\n`;
      try {
        const mergeOutput = execSync(
          `git -C "${project.repoPath}" merge --no-ff -m "Apply task attempt ${attemptId.slice(0, 8)}" "${attempt.branchName}"`,
          { encoding: "utf-8" }
        );
        applyLog += mergeOutput + "\n";
        applyLog += "✅ Merge successful!\n";
      } catch (mergeError: any) {
        // Check if it's a merge conflict
        if (mergeError.message.includes("CONFLICT")) {
          mergeStatus = "conflict";
          applyError = "Merge conflict detected";
          applyLog += `❌ Merge conflict:\n${mergeError.message}\n`;

          // Abort the merge
          try {
            execSync(`git -C "${project.repoPath}" merge --abort`, { encoding: "utf-8" });
            applyLog += "Merge aborted\n";
          } catch (abortError: any) {
            applyLog += `Failed to abort merge: ${abortError.message}\n`;
          }
        } else {
          throw mergeError;
        }
      }

      // Cleanup worktree (only if merge was successful)
      if (mergeStatus === "merged" && attempt.worktreePath && existsSync(attempt.worktreePath)) {
        try {
          applyLog += "Cleaning up worktree...\n";

          // Remove git worktree
          execSync(`git -C "${project.repoPath}" worktree remove "${attempt.worktreePath}" --force`, { encoding: "utf-8" });
          applyLog += `Removed worktree: ${attempt.worktreePath}\n`;

          // Delete worktree directory if still exists
          if (existsSync(attempt.worktreePath)) {
            rmSync(attempt.worktreePath, { recursive: true, force: true });
            applyLog += `Deleted directory: ${attempt.worktreePath}\n`;
          }

          // Optionally delete the branch (it's already merged)
          try {
            execSync(`git -C "${project.repoPath}" branch -d "${attempt.branchName}"`, { encoding: "utf-8" });
            applyLog += `Deleted branch: ${attempt.branchName}\n`;
          } catch (branchError: any) {
            applyLog += `⚠️ Could not delete branch: ${branchError.message}\n`;
          }

          applyLog += "✅ Cleanup complete!\n";
        } catch (cleanupError: any) {
          applyLog += `⚠️ Cleanup failed: ${cleanupError.message}\n`;
        }
      }

    } catch (error: any) {
      applyError = error.message;
      applyLog += `❌ Error: ${error.message}\n`;
      mergeStatus = "conflict";
    }

    // Update attempt in DB
    const now = new Date();
    await db.update(attempts)
      .set({
        appliedAt: mergeStatus === "merged" ? now : null,
        appliedBy: mergeStatus === "merged" ? userId : null,
        mergeStatus,
        applyError,
      })
      .where(eq(attempts.id, attemptId));

    // Create apply artifact
    await db.insert(artifacts).values({
      id: randomUUID(),
      attemptId,
      type: "log",
      content: applyLog,
    });

    return NextResponse.json({
      success: mergeStatus === "merged",
      mergeStatus,
      appliedAt: mergeStatus === "merged" ? now : null,
      applyError,
      log: applyLog,
    });

  } catch (error: any) {
    console.error("Error applying attempt:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
