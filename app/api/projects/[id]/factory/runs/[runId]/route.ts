/** GET /api/projects/[id]/factory/runs/[runId] (PR-91, PR-92) - Factory run details */
import { NextRequest, NextResponse } from "next/server";
import { getFactoryRun, finishFactoryRun } from "@/server/services/factory/factory-runs.service";
import { getStoredError } from "@/server/services/factory/factory-run-error.store";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; runId: string }> }
) {
  const { runId } = await params;

  const { run } = await getFactoryRun(runId);

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  // PR-92: Parse error and get guidance
  const storedError = getStoredError(run.error);

  return NextResponse.json({
    id: run.id,
    projectId: run.projectId,
    status: run.status,
    mode: run.mode,
    maxParallel: run.maxParallel,
    selectedTaskIds: run.selectedTaskIds ? JSON.parse(run.selectedTaskIds) : null,
    columnId: run.columnId,
    startedAt: run.startedAt.toISOString(),
    finishedAt: run.finishedAt?.toISOString() ?? null,
    error: storedError?.error ?? null,
    guidance: storedError?.guidance ?? null,
    counts: run.counts,
    attempts: run.attempts.map((a) => ({
      id: a.id,
      taskId: a.taskId,
      status: a.status,
      prUrl: a.prUrl,
      updatedAt: a.updatedAt.toISOString(),
    })),
  });
}

/** POST /api/projects/[id]/factory/runs/[runId]/stop (PR-91) - Stop factory run */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; runId: string }> }
) {
  const { runId } = await params;
  const body = await request.json().catch(() => ({}));

  if (body.action !== "stop") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  await finishFactoryRun(runId, "cancelled");

  return NextResponse.json({ ok: true });
}
