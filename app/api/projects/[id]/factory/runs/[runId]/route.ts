/** GET /api/projects/[id]/factory/runs/[runId] (PR-91, PR-92, PR-102) - Factory run details */
import { NextRequest, NextResponse } from "next/server";
import { finishFactoryRun } from "@/server/services/factory/factory-runs.service";
import { getRunDetails } from "@/server/services/factory/factory-run-details.service";
import { createRunDetailsDeps } from "@/server/services/factory/factory-run-details-deps";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; runId: string }> }
) {
  const { runId } = await params;

  const deps = createRunDetailsDeps();
  const result = await getRunDetails(runId, deps);

  if (!result) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  return NextResponse.json({
    run: {
      id: result.run.id,
      projectId: result.run.projectId,
      status: result.run.status,
      startedAt: result.run.startedAt.toISOString(),
      finishedAt: result.run.finishedAt?.toISOString() ?? null,
      maxParallel: result.run.maxParallel,
    },
    counts: result.counts,
    items: result.items.map((item) => ({
      taskId: item.taskId,
      taskTitle: item.taskTitle,
      status: item.attemptStatus,
      attemptId: item.attemptId,
      branch: item.branchName,
      prUrl: item.prUrl,
      ci: item.ci,
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
