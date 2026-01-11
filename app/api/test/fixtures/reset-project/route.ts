import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { projects, tasks, attempts } from "@/server/db/schema";
import { eq, inArray } from "drizzle-orm";

/**
 * POST /api/test/fixtures/reset-project
 *
 * Test fixture: Reset project execution state for clean test runs
 * - Sets project execution status to idle
 * - Marks all in_progress tasks as todo
 * - Marks all running attempts as completed
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

    // Get all tasks in project
    const projectTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, projectId))
      .all();

    // Mark in_progress tasks as todo
    const inProgressTasks = projectTasks.filter(t => t.status === "in_progress");
    for (const task of inProgressTasks) {
      await db
        .update(tasks)
        .set({ status: "todo", updatedAt: new Date() })
        .where(eq(tasks.id, task.id));
    }

    // Mark running attempts as completed
    const taskIds = projectTasks.map(t => t.id);
    if (taskIds.length > 0) {
      const runningAttempts = await db
        .select()
        .from(attempts)
        .where(eq(attempts.status, "running"))
        .all();

      for (const attempt of runningAttempts.filter(a => taskIds.includes(a.taskId))) {
        await db
          .update(attempts)
          .set({ status: "completed", finishedAt: new Date(), exitCode: 0 })
          .where(eq(attempts.id, attempt.id));
      }
    }

    return NextResponse.json({
      success: true,
      reset: {
        projectStatus: "idle",
        tasksReset: inProgressTasks.length,
      },
    });
  } catch (error: any) {
    console.error("Error resetting project:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
