import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { attempts, tasks, projects } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { getPullRequest, parseGitHubUrl } from "@/server/services/github-client";
import { getCurrentUserId, canPerformTaskAction, permissionDeniedError } from "@/server/services/permissions";

/**
 * POST /api/attempts/:id/sync-pr
 *
 * Syncs PR status from GitHub to database
 * In test mode (PLAYWRIGHT=1), accepts status from request body
 * In production, fetches real status from GitHub API
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: attemptId } = await params;

  try {
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
    const userId = await getCurrentUserId(request);
    const canPerform = await canPerformTaskAction(attempt.taskId, userId);
    if (!canPerform) {
      return NextResponse.json(permissionDeniedError(), { status: 403 });
    }

    // Validate attempt has PR
    if (!attempt.prUrl || !attempt.prNumber) {
      return NextResponse.json(
        { error: "Attempt does not have an associated PR" },
        { status: 400 }
      );
    }

    // Determine mode
    const isTestMode = process.env.PLAYWRIGHT === "1" || process.env.NODE_ENV === "test";

    let newPrStatus: 'open' | 'merged' | 'closed';

    if (isTestMode) {
      // Test mode: Accept status from request body (optional)
      try {
        const body = await request.json();
        newPrStatus = body.status;

        if (!newPrStatus || !['open', 'merged', 'closed'].includes(newPrStatus)) {
          return NextResponse.json(
            { error: "Invalid status. Must be 'open', 'merged', or 'closed'" },
            { status: 400 }
          );
        }
      } catch (error) {
        // No body provided - return current status (auto-sync scenario)
        return NextResponse.json({
          success: true,
          prStatus: attempt.prStatus || 'open',
        });
      }
    } else {
      // Production mode: Fetch from GitHub
      // Get task to access project
      const task = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, attempt.taskId))
        .get();

      if (!task) {
        return NextResponse.json(
          { error: "Task not found" },
          { status: 404 }
        );
      }

      // Get project to access gitUrl
      const project = await db
        .select()
        .from(projects)
        .where(eq(projects.id, task.projectId))
        .get();

      if (!project) {
        return NextResponse.json(
          { error: "Project not found" },
          { status: 404 }
        );
      }

      // Parse GitHub URL
      let repoOwner: string;
      let repoName: string;
      try {
        const parsed = parseGitHubUrl(project.gitUrl);
        repoOwner = parsed.owner;
        repoName = parsed.repo;
      } catch (error: any) {
        return NextResponse.json(
          { error: `Invalid GitHub URL: ${error.message}` },
          { status: 400 }
        );
      }

      // Fetch PR status from GitHub
      try {
        const prStatus = await getPullRequest({
          repoOwner,
          repoName,
          prNumber: attempt.prNumber,
        });

        newPrStatus = prStatus.state;
      } catch (error: any) {
        // Return GitHub API errors with proper context
        return NextResponse.json(
          { error: `Failed to fetch PR status: ${error.message}` },
          { status: 500 }
        );
      }
    }

    // Update attempt with new status
    await db.update(attempts)
      .set({
        prStatus: newPrStatus,
      })
      .where(eq(attempts.id, attemptId));

    return NextResponse.json({
      success: true,
      prStatus: newPrStatus,
    });

  } catch (error: any) {
    console.error("Error syncing PR status:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
