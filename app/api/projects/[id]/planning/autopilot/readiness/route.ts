/** GET /api/projects/[id]/planning/autopilot/readiness (PR-81) - Read-only readiness check */
import { NextRequest, NextResponse } from "next/server";
import { getAutopilotReadiness } from "@/server/services/autopilot/autopilot-readiness.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const readiness = await getAutopilotReadiness(projectId);
  return NextResponse.json(readiness);
}
