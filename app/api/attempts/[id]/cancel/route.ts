import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { attempts } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { scheduleProject } from "@/server/services/attempt-queue";
import { getCurrentUserId, canPerformTaskAction, permissionDeniedError } from "@/server/services/permissions";

/**
 * POST /api/attempts/:id/cancel
 *
 * Cancels a queued attempt by marking it as stopped
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: attemptId } = await params;

  try {
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

    if (attempt.status !== "queued") {
      return NextResponse.json(
        { error: "Only queued attempts can be cancelled" },
        { status: 400 }
      );
    }

    await db.update(attempts)
      .set({
        status: "stopped",
        finishedAt: new Date(),
      })
      .where(eq(attempts.id, attemptId));

    // Get projectId to schedule next attempt
    const task = await db.query.tasks.findFirst({
      where: (tasks: any, { eq }: any) => eq(tasks.id, attempt.taskId),
    });

    if (task) {
      await scheduleProject(task.projectId);
    }

    return NextResponse.json({
      success: true,
      status: "stopped",
      message: "Attempt cancelled successfully",
    });
  } catch (error: any) {
    console.error("Error cancelling attempt:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
