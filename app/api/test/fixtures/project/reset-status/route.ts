import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import {
  projects,
  tasks,
  councilThreads,
  councilThreadMessages,
  planArtifacts,
  planningSessions,
  councilMessages,
  planDrafts,
} from "@/server/db/schema";
import { eq, and, inArray } from "drizzle-orm";

/**
 * POST /api/test/fixtures/project/reset-status
 *
 * Test fixture: Reset project to clean state for tests
 * - Sets executionStatus to idle
 * - Moves all todo tasks to 'done' so they don't interfere with test tasks
 * - Clears council threads, messages, and planning sessions for the project
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

    // Get council thread IDs for this project
    const threads = await db
      .select({ id: councilThreads.id })
      .from(councilThreads)
      .where(eq(councilThreads.projectId, projectId));
    const threadIds = threads.map((t) => t.id);

    if (threadIds.length > 0) {
      // Delete child records first (foreign key constraints)
      await db.delete(councilThreadMessages).where(inArray(councilThreadMessages.threadId, threadIds));
      await db.delete(planArtifacts).where(inArray(planArtifacts.threadId, threadIds));
      // Then delete council threads
      await db.delete(councilThreads).where(eq(councilThreads.projectId, projectId));
    }

    // Get planning session IDs for this project
    const sessions = await db
      .select({ id: planningSessions.id })
      .from(planningSessions)
      .where(eq(planningSessions.projectId, projectId));
    const sessionIds = sessions.map((s) => s.id);

    if (sessionIds.length > 0) {
      // Delete child records first (foreign key constraints)
      await db.delete(councilMessages).where(inArray(councilMessages.sessionId, sessionIds));
      await db.delete(planDrafts).where(inArray(planDrafts.sessionId, sessionIds));
      // Then delete planning sessions
      await db.delete(planningSessions).where(eq(planningSessions.projectId, projectId));
    }

    return NextResponse.json({ success: true, projectId });
  } catch (error: any) {
    console.error("Error resetting project status:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
