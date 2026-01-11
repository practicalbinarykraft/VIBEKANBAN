import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { tasks, attempts, logs, artifacts } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;

  try {
    const body = await request.json();
    const { title, description, status, order } = body;

    // Build update object with only provided fields
    const updates: any = {
      updatedAt: new Date(),
    };

    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description.trim();
    if (status !== undefined) updates.status = status;
    if (order !== undefined) updates.order = order;

    // Update task
    await db.update(tasks).set(updates).where(eq(tasks.id, taskId));

    // Fetch updated task
    const updatedTask = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .get();

    if (!updatedTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json(updatedTask);
  } catch (error: any) {
    console.error("Error updating task:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;

  try {
    // Get all attempts for this task
    const taskAttempts = await db
      .select()
      .from(attempts)
      .where(eq(attempts.taskId, taskId));

    const attemptIds = taskAttempts.map((a) => a.id);

    // Delete artifacts for all attempts
    if (attemptIds.length > 0) {
      for (const attemptId of attemptIds) {
        await db.delete(artifacts).where(eq(artifacts.attemptId, attemptId));
      }

      // Delete logs for all attempts
      for (const attemptId of attemptIds) {
        await db.delete(logs).where(eq(logs.attemptId, attemptId));
      }

      // Delete attempts
      for (const attemptId of attemptIds) {
        await db.delete(attempts).where(eq(attempts.id, attemptId));
      }
    }

    // Delete task itself
    await db.delete(tasks).where(eq(tasks.id, taskId));

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Error deleting task:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
