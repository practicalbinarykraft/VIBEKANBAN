/** POST /api/projects/[id]/factory/stop (PR-83, PR-85, PR-86, PR-109) - Stop factory run (idempotent) */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { factoryRuns, attempts } from "@/server/db/schema";
import { eq, desc, and, inArray } from "drizzle-orm";
import { finishFactoryRun } from "@/server/services/factory/factory-runs.service";
import { cancelAttempt } from "@/server/services/execution/attempt-canceller";
import { getGlobalQueue } from "@/server/services/factory/factory-scheduler.service";
import { getGlobalWorkerRegistry } from "@/server/services/factory/factory-worker-registry";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;

  // Get latest run for project (using factoryRuns)
  const run = await db.select()
    .from(factoryRuns)
    .where(eq(factoryRuns.projectId, projectId))
    .orderBy(desc(factoryRuns.startedAt))
    .limit(1)
    .get();

  // PR-109: Idempotent - return OK even if no run or already stopped
  if (!run) {
    return NextResponse.json({ stopped: true, cancelledAttempts: 0, message: "No active run" });
  }

  if (run.status !== "running") {
    return NextResponse.json({ stopped: true, cancelledAttempts: 0, message: `Already ${run.status}` });
  }

  // Stop the worker loop first (PR-86) - so it doesn't start new attempts
  const registry = getGlobalWorkerRegistry();
  const handle = registry.get(projectId);
  if (handle) {
    handle.requestStop();
  }

  // Clear the in-memory queue (PR-85)
  const queue = getGlobalQueue();
  if (queue) {
    queue.clearAll();
  }

  // Get all cancellable attempts (queued, pending, running)
  const cancellableAttempts = await db.select({ id: attempts.id, status: attempts.status })
    .from(attempts)
    .where(and(
      eq(attempts.factoryRunId, run.id),
      inArray(attempts.status, ["queued", "pending", "running"])
    ));

  let cancelledCount = 0;

  // Cancel each attempt
  for (const attempt of cancellableAttempts) {
    const result = await cancelAttempt(attempt.id);
    if (result.ok) cancelledCount++;
  }

  // Mark run as cancelled
  await finishFactoryRun(run.id, "cancelled", "Stopped by user");

  return NextResponse.json({
    stopped: true,
    cancelledAttempts: cancelledCount,
  });
}
