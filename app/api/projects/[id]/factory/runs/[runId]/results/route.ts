/** GET /api/projects/[id]/factory/runs/[runId]/results (PR-88) */
import { NextRequest, NextResponse } from "next/server";
import { getFactoryRunResults } from "@/server/services/factory/factory-run-results.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; runId: string }> }
) {
  const { id: projectId, runId } = await params;

  const result = await getFactoryRunResults(projectId, runId);

  if (!result) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  return NextResponse.json(result);
}
