/** GET /api/projects/[id]/factory/runs (PR-91) - List factory runs */
import { NextRequest, NextResponse } from "next/server";
import { listFactoryRuns } from "@/server/services/factory/factory-runs.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") ?? "20", 10);

  const { runs } = await listFactoryRuns(projectId, limit);

  return NextResponse.json({
    runs: runs.map((r) => ({
      id: r.id,
      projectId: r.projectId,
      status: r.status,
      mode: r.mode,
      maxParallel: r.maxParallel,
      startedAt: r.startedAt.toISOString(),
      finishedAt: r.finishedAt?.toISOString() ?? null,
      error: r.error,
    })),
  });
}
