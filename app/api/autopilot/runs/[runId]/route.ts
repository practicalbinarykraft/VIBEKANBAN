/** GET /api/autopilot/runs/[runId] (PR-65) - Get run details */
import { NextRequest, NextResponse } from "next/server";
import { getRunDetails } from "@/server/services/autopilot/run-history.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;

  const result = await getRunDetails(runId);

  if (!result.run) {
    return NextResponse.json({ error: result.error || "Run not found" }, { status: 404 });
  }

  return NextResponse.json({ run: result.run });
}
