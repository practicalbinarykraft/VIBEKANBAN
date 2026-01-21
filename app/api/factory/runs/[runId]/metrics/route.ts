/** GET /api/factory/runs/[runId]/metrics (PR-95) - Factory run metrics V2 */
import { NextRequest, NextResponse } from "next/server";
import { getFactoryRunMetricsV2 } from "@/server/services/factory/factory-run-metrics-v2.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;

  if (!runId || runId.trim() === "") {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const result = await getFactoryRunMetricsV2(runId);

  if (!result.ok) {
    const status = result.error === "RUN_NOT_FOUND" ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json(result.data);
}
