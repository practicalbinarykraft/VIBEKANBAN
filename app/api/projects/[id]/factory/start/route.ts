/** POST /api/projects/[id]/factory/start (PR-82) - Start parallel factory scheduler */
import { NextRequest, NextResponse } from "next/server";
import { getAiStatus } from "@/server/services/ai/ai-status";
import { createRun } from "@/server/services/autopilot/autopilot-runs.service";
import { runFactoryScheduler } from "@/server/services/factory/factory-scheduler.service";
import { createFactoryDeps } from "@/server/services/factory/factory-deps";

interface StartRequestBody {
  maxParallel?: number;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;

  // Parse body
  let body: StartRequestBody = {};
  try {
    body = await request.json();
  } catch {
    // Empty body is OK, use defaults
  }

  const maxParallel = body.maxParallel ?? 3;

  // Validate maxParallel range
  if (maxParallel < 1 || maxParallel > 20) {
    return NextResponse.json(
      { error: "maxParallel must be between 1 and 20" },
      { status: 400 }
    );
  }

  // Check AI configuration and budget
  const aiStatus = await getAiStatus();
  if (!aiStatus.realAiEligible) {
    const message =
      aiStatus.reason === "BUDGET_LIMIT_EXCEEDED"
        ? `Budget exceeded: $${aiStatus.spendUSD?.toFixed(2)} / $${aiStatus.limitUSD?.toFixed(2)}`
        : `AI not configured: ${aiStatus.reason}`;
    return NextResponse.json({ error: message }, { status: 409 });
  }

  // Create autopilot run
  const runResult = await createRun(projectId);
  if (!runResult.ok) {
    return NextResponse.json({ error: "Failed to create run" }, { status: 500 });
  }

  const { runId: autopilotRunId } = runResult;

  // Fire-and-forget: start scheduler in background
  const deps = createFactoryDeps();
  runFactoryScheduler({ projectId, autopilotRunId, maxParallel }, deps).catch((err) => {
    // Log error but don't block response
    console.error(`Factory scheduler error for run ${autopilotRunId}:`, err);
  });

  return NextResponse.json({ autopilotRunId, started: true });
}
