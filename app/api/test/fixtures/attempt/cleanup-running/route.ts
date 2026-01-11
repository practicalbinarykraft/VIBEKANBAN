import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { attempts } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * POST /api/test/fixtures/attempt/cleanup-running
 *
 * Test fixture: Mark all running/queued attempts in project as completed
 */
export async function POST(request: NextRequest) {
  try {
    const { projectId } = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: "projectId required" }, { status: 400 });
    }

    // Get all tasks in project
    const tasksInProject = await db.query.tasks.findMany({
      where: (tasks: any, { eq }: any) => eq(tasks.projectId, projectId),
    });

    const taskIds = tasksInProject.map((t: any) => t.id);

    if (taskIds.length === 0) {
      return NextResponse.json({ cleaned: 0 });
    }

    // Mark all running/queued attempts as completed
    const attemptsToClean = await db
      .select()
      .from(attempts)
      .where(
        and(
          eq(attempts.status, "running")
        )
      )
      .all();

    const cleanedAttempts = attemptsToClean.filter(a => taskIds.includes(a.taskId));

    for (const attempt of cleanedAttempts) {
      await db
        .update(attempts)
        .set({
          status: "completed",
          finishedAt: new Date(),
          exitCode: 0,
        })
        .where(eq(attempts.id, attempt.id));
    }

    // Also clean queued attempts
    const queuedAttempts = await db
      .select()
      .from(attempts)
      .where(eq(attempts.status, "queued"))
      .all();

    const cleanedQueued = queuedAttempts.filter(a => taskIds.includes(a.taskId));

    for (const attempt of cleanedQueued) {
      await db
        .update(attempts)
        .set({
          status: "stopped",
          finishedAt: new Date(),
        })
        .where(eq(attempts.id, attempt.id));
    }

    return NextResponse.json({
      cleaned: cleanedAttempts.length + cleanedQueued.length
    });
  } catch (error: any) {
    console.error("Error cleaning attempts:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
