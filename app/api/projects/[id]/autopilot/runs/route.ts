/** GET /api/projects/[id]/autopilot/runs (PR-65) - List runs for project */
import { NextRequest, NextResponse } from "next/server";
import { listRuns } from "@/server/services/autopilot/run-history.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);

  const result = await listRuns(projectId, limit);

  return NextResponse.json(result);
}
