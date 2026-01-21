/** POST /api/projects/[id]/factory/reset (PR-110) - Reset factory state (idempotent) */
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

  // Stop worker if running
  const registry = getGlobalWorkerRegistry();
  const handle = registry.get(projectId);
  if (handle) {
    handle.requestStop();
  }

  // Clear in-memory queue
  const queue = getGlobalQueue();
  if (queue) {
    queue.clearAll();
  }

  // Get latest run
  const run = await db.select()
    .from(factoryRuns)
    .where(eq(factoryRuns.projectId, projectId))
    .orderBy(desc(factoryRuns.startedAt))
    .limit(1)
    .get();

  if (!run) {
    return NextResponse.json({ reset: true, cancelledAttempts: 0, message: "No factory runs" });
  }

  // If run is already finished, just return success
  if (run.status !== "running") {
    return NextResponse.json({ reset: true, cancelledAttempts: 0, message: `Run already ${run.status}` });
  }

  // Cancel all running/queued attempts
  const cancellableAttempts = await db.select({ id: attempts.id })
    .from(attempts)
    .where(and(
      eq(attempts.factoryRunId, run.id),
      inArray(attempts.status, ["queued", "pending", "running"])
    ));

  let cancelledCount = 0;
  for (const attempt of cancellableAttempts) {
    const result = await cancelAttempt(attempt.id);
    if (result.ok) cancelledCount++;
  }

  // Mark run as cancelled
  await finishFactoryRun(run.id, "cancelled", "Factory state reset by user");

  return NextResponse.json({ reset: true, cancelledAttempts: cancelledCount });
}
