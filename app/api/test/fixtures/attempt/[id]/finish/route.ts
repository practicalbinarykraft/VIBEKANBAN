import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { attempts } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { scheduleProject } from "@/server/services/attempt-queue";
import { onAttemptFinished } from "@/server/services/project-orchestrator";

/**
 * Test fixture endpoint - finishes a running attempt
 * ONLY works in test/dev environments for E2E testing
 *
 * Marks attempt as completed and sets finishedAt timestamp.
 * Used to simulate attempt completion in tests without Docker.
 */

function isTestEnvironment(): boolean {
  return (
    process.env.NODE_ENV === "test" ||
    process.env.PLAYWRIGHT === "1"
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isTestEnvironment()) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404 }
    );
  }

  try {
    const { id: attemptId } = await params;

    // Get attempt
    const attempt = await db
      .select()
      .from(attempts)
      .where(eq(attempts.id, attemptId))
      .get();

    if (!attempt) {
      return NextResponse.json(
        { error: "Attempt not found" },
        { status: 404 }
      );
    }

    // Mark as completed
    await db.update(attempts)
      .set({
        status: "completed",
        finishedAt: new Date(),
        exitCode: 0,
      })
      .where(eq(attempts.id, attemptId));

    // Trigger scheduler to start next queued attempt
    const task = await db.query.tasks.findFirst({
      where: (tasks: any, { eq }: any) => eq(tasks.id, attempt.taskId),
    });
    if (task) {
      await scheduleProject(task.projectId);

      // Notify orchestrator of attempt completion
      await onAttemptFinished(task.projectId, attempt.taskId, attemptId, true);
    }

    return NextResponse.json({
      attemptId,
      status: "success",
      message: "Attempt marked as completed",
    });
  } catch (error: any) {
    console.error("Error finishing attempt:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
