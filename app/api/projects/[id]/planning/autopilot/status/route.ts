/** Autopilot Status Route (PR-68) - Get project autopilot status */
import { NextRequest, NextResponse } from "next/server";
import { getProjectAutopilotStatus } from "@/server/services/autopilot/autopilot-status.service";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/projects/[id]/planning/autopilot/status
 * Get current autopilot status for a project (source of truth for UI)
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id: projectId } = await context.params;
    const status = await getProjectAutopilotStatus(projectId);
    return NextResponse.json(status);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
