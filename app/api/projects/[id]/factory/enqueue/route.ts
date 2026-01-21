/** POST /api/projects/[id]/factory/enqueue (PR-106) - Auto-enqueue task on status change */
import { NextRequest, NextResponse } from "next/server";
import { autoEnqueueTask } from "@/server/services/factory/factory-auto-enqueue.service";

interface EnqueueRequestBody {
  taskId: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;

  // Parse body
  let body: EnqueueRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Validate taskId
  if (!body.taskId) {
    return NextResponse.json({ error: "taskId is required" }, { status: 400 });
  }

  // Call service
  const result = await autoEnqueueTask({
    projectId,
    taskId: body.taskId,
    reason: "status_change",
  });

  if (!result.ok) {
    const statusMap: Record<string, number> = {
      TASK_NOT_RUNNABLE: 400,
      RUN_CREATION_FAILED: 500,
    };
    return NextResponse.json(
      { error: result.errorCode },
      { status: statusMap[result.errorCode] ?? 500 }
    );
  }

  return NextResponse.json({
    runId: result.runId,
    enqueued: result.enqueued,
  });
}
