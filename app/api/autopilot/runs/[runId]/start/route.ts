/**
 * POST /api/autopilot/runs/[runId]/start (PR-64)
 * Start autopilot execution for a project
 */
import { NextRequest, NextResponse } from "next/server";
import { startRun } from "@/server/services/autopilot-runner.service";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;

  const result = await startRun(runId);

  if (!result.success) {
    const status = result.error?.includes("already running") ? 409 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({
    success: true,
    runId,
    status: result.status,
  });
}
