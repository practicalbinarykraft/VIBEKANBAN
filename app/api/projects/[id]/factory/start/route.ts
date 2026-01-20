/** POST /api/projects/[id]/factory/start (PR-82, PR-86) - Start factory worker */
import { NextRequest, NextResponse } from "next/server";
import { getAiStatus } from "@/server/services/ai/ai-status";
import { createRun } from "@/server/services/autopilot/autopilot-runs.service";
import { FactoryWorkerService } from "@/server/services/factory/factory-worker.service";
import { createWorkerDeps } from "@/server/services/factory/factory-deps";

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

  // Start worker in background (PR-86)
  const workerDeps = createWorkerDeps();
  const worker = new FactoryWorkerService(workerDeps);
  const { started } = await worker.startOrAttach({ projectId, runId: autopilotRunId, maxParallel });

  return NextResponse.json({ autopilotRunId, started });
}
