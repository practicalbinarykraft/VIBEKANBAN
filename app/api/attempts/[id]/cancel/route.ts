/**
 * Cancel Attempt API (PR-72)
 * POST /api/attempts/[id]/cancel
 * Cancels queued, pending, or running attempts.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { attempts } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { cancelAttempt } from "@/server/services/execution/attempt-canceller";
import { scheduleProject } from "@/server/services/attempt-queue";
import {
  getCurrentUserId,
  canPerformTaskAction,
  permissionDeniedError,
} from "@/server/services/permissions";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id: attemptId } = await params;

  // Get attempt for permission check
  const attempt = await db
    .select()
    .from(attempts)
    .where(eq(attempts.id, attemptId))
    .get();

  if (!attempt) {
    return NextResponse.json(
      { ok: false, code: "NOT_FOUND", message: "Attempt not found" },
      { status: 404 }
    );
  }

  // Check permissions
  const userId = await getCurrentUserId(request);
  const canPerform = await canPerformTaskAction(attempt.taskId, userId);
  if (!canPerform) {
    return NextResponse.json(permissionDeniedError(), { status: 403 });
  }

  const result = await cancelAttempt(attemptId);

  if (result.ok) {
    // Schedule next attempt in project queue
    const task = await db.query.tasks.findFirst({
      where: (tasks: any, { eq: eqFn }: any) => eqFn(tasks.id, attempt.taskId),
    });
    if (task) {
      await scheduleProject(task.projectId);
    }
    return NextResponse.json(result);
  }

  const statusCode =
    result.code === "NOT_FOUND"
      ? 404
      : result.code === "ALREADY_FINISHED"
        ? 409
        : 500;

  return NextResponse.json(result, { status: statusCode });
}
