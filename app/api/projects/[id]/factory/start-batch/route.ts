/** POST /api/projects/[id]/factory/start-batch (PR-87, PR-105) - Batch factory start */
import { NextRequest, NextResponse } from "next/server";
import { startBatchFactory, type BatchStartSource } from "@/server/services/factory/factory-batch-start.service";
import { getAgentProfileById, getDefaultAgentProfile } from "@/server/services/agents/agent-profiles.registry";

interface StartBatchRequestBody {
  source: BatchStartSource;
  columnStatus?: string;
  taskIds?: string[];
  maxParallel?: number;
  agentProfileId?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;

  // Parse body
  let body: StartBatchRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Validate source
  if (!body.source || !["column", "selection"].includes(body.source)) {
    return NextResponse.json({ error: "Invalid source: must be 'column' or 'selection'" }, { status: 400 });
  }

  // Validate source-specific params
  if (body.source === "column" && !body.columnStatus) {
    return NextResponse.json({ error: "columnStatus required for column source" }, { status: 400 });
  }
  if (body.source === "selection" && (!body.taskIds || body.taskIds.length === 0)) {
    return NextResponse.json({ error: "taskIds required for selection source" }, { status: 400 });
  }

  // Validate maxParallel
  const maxParallel = body.maxParallel ?? 3;
  if (maxParallel < 1 || maxParallel > 20) {
    return NextResponse.json({ error: "maxParallel must be between 1 and 20" }, { status: 400 });
  }

  // PR-105: Validate agent profile
  const agentProfile = body.agentProfileId
    ? getAgentProfileById(body.agentProfileId)
    : getDefaultAgentProfile();

  if (!agentProfile) {
    return NextResponse.json({ error: `Unknown agent profile: ${body.agentProfileId}` }, { status: 400 });
  }

  // Start batch factory
  const result = await startBatchFactory({
    projectId,
    source: body.source,
    columnStatus: body.columnStatus,
    taskIds: body.taskIds,
    maxParallel,
    agentProfileId: agentProfile.id,
  });

  if (!result.ok) {
    const statusMap: Record<string, number> = {
      NO_TASKS: 400,
      ALREADY_RUNNING: 409,
      BUDGET_EXCEEDED: 402,
      RUN_FAILED: 500,
    };
    return NextResponse.json(
      { error: result.error },
      { status: statusMap[result.error] ?? 500 }
    );
  }

  return NextResponse.json({
    runId: result.runId,
    taskCount: result.taskCount,
    started: true,
  });
}
