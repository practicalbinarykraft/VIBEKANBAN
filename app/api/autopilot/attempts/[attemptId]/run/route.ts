/**
 * POST /api/autopilot/attempts/[attemptId]/run (PR-66)
 * Enqueue attempt to worker for execution
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { attempts, tasks } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { getAttemptWorker } from "@/server/services/autopilot/attempt-worker";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const { attemptId } = await params;

  // Get attempt with task to get projectId
  const result = await db.select({
    attempt: attempts,
    projectId: tasks.projectId,
  })
    .from(attempts)
    .innerJoin(tasks, eq(attempts.taskId, tasks.id))
    .where(eq(attempts.id, attemptId))
    .get();

  if (!result) {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  }

  const { attempt, projectId } = result;

  // Check status - only queued/pending can be started
  if (attempt.status !== "queued" && attempt.status !== "pending") {
    return NextResponse.json(
      { error: `Cannot run attempt with status: ${attempt.status}` },
      { status: 409 }
    );
  }

  // Enqueue to worker (fire-and-forget)
  const worker = getAttemptWorker();
  worker.enqueue({
    attemptId,
    taskId: attempt.taskId,
    projectId,
  });

  return NextResponse.json({ ok: true });
}
