import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { projects, tasks } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * POST /api/test/fixtures/project/reset-status
 *
 * Test fixture: Reset project to clean state for tests
 * - Sets executionStatus to idle
 * - Moves all todo tasks to 'done' so they don't interfere with test tasks
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

    return NextResponse.json({ success: true, projectId });
  } catch (error: any) {
    console.error("Error resetting project status:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
