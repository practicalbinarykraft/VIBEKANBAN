/**
 * POST /api/autopilot/runs/[runId]/retry (PR-64)
 * Retry autopilot execution for a project
 */
import { NextRequest, NextResponse } from "next/server";
import { retryRun } from "@/server/services/autopilot-runner.service";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;

  const result = await retryRun(runId);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    runId,
    status: result.status,
  });
}
