import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { projects, tasks, attempts, logs, artifacts } from "@/server/db/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/projects/[id]
 *
 * Get project details including execution status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .get();

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(project);
  } catch (error: any) {
    console.error("Error fetching project:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]
 *
 * Delete project and all related data (tasks, attempts, logs, artifacts)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get all tasks for this project
    const projectTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, id))
      .all();

    const taskIds = projectTasks.map(t => t.id);

    // Delete all related data
    for (const taskId of taskIds) {
      // Get attempts
      const taskAttempts = await db
        .select()
        .from(attempts)
        .where(eq(attempts.taskId, taskId))
        .all();

      const attemptIds = taskAttempts.map(a => a.id);

      // Delete logs
      for (const attemptId of attemptIds) {
        await db.delete(logs).where(eq(logs.attemptId, attemptId));
        await db.delete(artifacts).where(eq(artifacts.attemptId, attemptId));
      }

      // Delete attempts
      await db.delete(attempts).where(eq(attempts.taskId, taskId));
    }

    // Delete tasks
    await db.delete(tasks).where(eq(tasks.projectId, id));

    // Delete project
    await db.delete(projects).where(eq(projects.id, id));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting project:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
