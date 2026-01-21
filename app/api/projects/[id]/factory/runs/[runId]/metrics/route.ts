/** GET /api/projects/[id]/factory/runs/[runId]/metrics (PR-94) - Factory run metrics */
import { NextRequest, NextResponse } from "next/server";
import { getFactoryRunMetrics } from "@/server/services/factory/factory-run-metrics.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; runId: string }> }
) {
  const { id: projectId, runId } = await params;

  if (!runId || !projectId) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const result = await getFactoryRunMetrics({ projectId, runId });

  if (!result.ok) {
    const status = result.error === "RUN_NOT_FOUND" ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json(result.data);
}
