/** POST /api/projects/[id]/factory/rerun (PR-93) - Rerun failed/selected tasks */
import { NextRequest, NextResponse } from "next/server";
import { startFactoryRerun, type RerunMode } from "@/server/services/factory/factory-rerun.service";
import { getFactoryRun } from "@/server/services/factory/factory-runs.service";

interface RerunRequestBody {
  sourceRunId: string;
  mode: RerunMode;
  selectedTaskIds?: string[];
  maxParallel?: number;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;

  let body: RerunRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const { sourceRunId, mode, selectedTaskIds, maxParallel = 3 } = body;

  // Validate required fields
  if (!sourceRunId || !mode) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  // Validate mode
  if (mode !== "failed" && mode !== "selected") {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  // Validate selectedTaskIds for selected mode
  if (mode === "selected" && (!selectedTaskIds || selectedTaskIds.length === 0)) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  // Check source run exists
  const { run: sourceRun } = await getFactoryRun(sourceRunId);
  if (!sourceRun) {
    return NextResponse.json({ error: "SOURCE_RUN_NOT_FOUND" }, { status: 404 });
  }

  // Start rerun
  const result = await startFactoryRerun({
    projectId,
    sourceRunId,
    mode,
    selectedTaskIds,
    maxParallel,
  });

  if (!result.ok) {
    const status = result.error === "NO_TASKS_TO_RERUN" ? 400 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({
    started: true,
    newRunId: result.newRunId,
    taskCount: result.taskCount,
  });
}
