/** POST /api/projects/[id]/factory/stop (PR-83) - Stop factory run */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { autopilotRuns, attempts } from "@/server/db/schema";
import { eq, desc, and, inArray } from "drizzle-orm";
import { finishRun } from "@/server/services/autopilot/autopilot-runs.service";
import { cancelAttempt } from "@/server/services/execution/attempt-canceller";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;

  // Get latest run for project
  const run = await db.select()
    .from(autopilotRuns)
    .where(eq(autopilotRuns.projectId, projectId))
    .orderBy(desc(autopilotRuns.startedAt))
    .limit(1)
    .get();

  if (!run) {
    return NextResponse.json({ error: "No active run found" }, { status: 404 });
  }

  if (run.status !== "running") {
    return NextResponse.json({ error: `Run is not running (status: ${run.status})` }, { status: 400 });
  }

  // Get all cancellable attempts (queued, pending, running)
  const cancellableAttempts = await db.select({ id: attempts.id, status: attempts.status })
    .from(attempts)
    .where(and(
      eq(attempts.autopilotRunId, run.id),
      inArray(attempts.status, ["queued", "pending", "running"])
    ));

  let cancelledCount = 0;
  let failedToCancel = 0;

  // Cancel each attempt
  for (const attempt of cancellableAttempts) {
    const result = await cancelAttempt(attempt.id);
    if (result.ok) cancelledCount++;
    else failedToCancel++;
  }

  // Mark run as cancelled
  await finishRun(run.id, "cancelled", "Stopped by user");

  return NextResponse.json({
    stopped: true,
    cancelledAttempts: cancelledCount,
    failedToCancel,
  });
}
