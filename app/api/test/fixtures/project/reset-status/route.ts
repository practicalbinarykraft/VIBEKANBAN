import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { projects, tasks, councilThreads, councilThreadMessages, planArtifacts, planningSessions, projectMessages } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * POST /api/test/fixtures/project/reset-status
 *
 * Test fixture: Reset project to clean state for tests
 * - Sets executionStatus to idle
 * - Moves all todo tasks to 'done' so they don't interfere with test tasks
 * - Clears council threads and plan artifacts (EPIC-9)
 * - Clears planning sessions
 * - Clears chat history (PR-128)
 */
export async function POST(request: NextRequest) {
  try {
    const { projectId } = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: "projectId required" }, { status: 400 });
    }

    // Reset project execution status
    await db
      .update(projects)
      .set({
        executionStatus: "idle",
        executionStartedAt: null,
        executionFinishedAt: null,
      })
      .where(eq(projects.id, projectId));

    // Move all non-done tasks to done so they don't interfere with test tasks
    // This includes: todo (seeded), in_progress (from failed retries), in_review
    await db
      .update(tasks)
      .set({ status: "done" })
      .where(and(eq(tasks.projectId, projectId), eq(tasks.status, "todo")));

    await db
      .update(tasks)
      .set({ status: "done" })
      .where(and(eq(tasks.projectId, projectId), eq(tasks.status, "in_progress")));

    await db
      .update(tasks)
      .set({ status: "done" })
      .where(and(eq(tasks.projectId, projectId), eq(tasks.status, "in_review")));

    // Clear council threads for this project (EPIC-9)
    const threads = await db.select().from(councilThreads).where(eq(councilThreads.projectId, projectId));
    for (const thread of threads) {
      // Delete plan artifacts for this thread
      await db.delete(planArtifacts).where(eq(planArtifacts.threadId, thread.id));
      // Delete thread messages
      await db.delete(councilThreadMessages).where(eq(councilThreadMessages.threadId, thread.id));
    }
    // Delete threads
    await db.delete(councilThreads).where(eq(councilThreads.projectId, projectId));

    // Clear planning sessions for this project
    await db.delete(planningSessions).where(eq(planningSessions.projectId, projectId));

    // Clear chat history for this project (PR-128)
    await db.delete(projectMessages).where(eq(projectMessages.projectId, projectId));

    return NextResponse.json({ success: true, projectId });
  } catch (error: any) {
    console.error("Error resetting project status:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
