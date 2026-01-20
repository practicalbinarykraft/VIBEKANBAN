/**
 * POST /api/autopilot/runs/[runId]/stop (PR-64)
 * Stop autopilot execution for a project
 */
import { NextRequest, NextResponse } from "next/server";
import { stopRun } from "@/server/services/autopilot-runner.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;

  let reason: string | undefined;
  try {
    const body = await request.json();
    reason = body.reason;
  } catch {
    // No body provided, which is fine
  }

  const result = await stopRun(runId, reason);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    runId,
    status: result.status,
  });
}
