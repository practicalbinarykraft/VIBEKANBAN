import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { attempts } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { getRunner, unregisterRunner } from "@/server/services/runners-store";
import { emitAttemptStatus } from "@/server/services/events-hub";
import { scheduleProject } from "@/server/services/attempt-queue";
import { getCurrentUserId, canPerformTaskAction, permissionDeniedError } from "@/server/services/permissions";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: attemptId } = await params;

  try {
    // Get attempt to check permissions
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

    // Get runner from store
    const runner = getRunner(attemptId);

    if (!runner) {
      return NextResponse.json(
        { error: "Runner not found or already stopped" },
        { status: 404 }
      );
    }

    // Stop the runner
    await runner.stop();

    // Update attempt status in DB
    await db
      .update(attempts)
      .set({
        finishedAt: new Date(),
        status: "stopped",
        exitCode: -1,
      })
      .where(eq(attempts.id, attemptId));

    // Emit stopped status to SSE
    emitAttemptStatus({ attemptId, status: "stopped", exitCode: -1 });

    // Unregister runner
    unregisterRunner(attemptId);

    // Get attempt to find projectId
    const attemptData = await db
      .select()
      .from(attempts)
      .where(eq(attempts.id, attemptId))
      .get();

    // Trigger scheduler to start next queued attempt
    if (attemptData) {
      const task = await db.query.tasks.findFirst({
        where: (tasks: any, { eq }: any) => eq(tasks.id, attemptData.taskId),
      });
      if (task) {
        await scheduleProject(task.projectId);
      }
    }

    return NextResponse.json({ status: "stopped" });
  } catch (error: any) {
    console.error("Error stopping attempt:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
