/** PATCH /api/projects/[id]/tasks/reorder (PR-104) - Reorder task within/across columns */
import { NextRequest, NextResponse } from "next/server";
import { reorderTask, type ReorderInput } from "@/server/services/tasks/task-reorder.service";
import { createReorderDeps } from "@/server/services/tasks/task-reorder-deps";

interface ReorderRequestBody {
  taskId: string;
  from: { status: string; index: number };
  to: { status: string; index: number };
}

const VALID_STATUSES = ["todo", "in_progress", "in_review", "done", "cancelled"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;

  let body: ReorderRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Validate request body
  if (!body.taskId || typeof body.taskId !== "string") {
    return NextResponse.json({ error: "Missing taskId" }, { status: 400 });
  }

  if (!body.from || !body.to) {
    return NextResponse.json({ error: "Missing from/to" }, { status: 400 });
  }

  if (!VALID_STATUSES.includes(body.to.status)) {
    return NextResponse.json({ error: "Invalid target status" }, { status: 400 });
  }

  if (typeof body.to.index !== "number" || body.to.index < 0) {
    return NextResponse.json({ error: "Invalid target index" }, { status: 400 });
  }

  const input: ReorderInput = {
    taskId: body.taskId,
    from: body.from,
    to: body.to,
  };

  const deps = createReorderDeps();
  const result = await reorderTask(projectId, input, deps);

  if (!result.ok) {
    const status = result.error === "Task not found" ? 404 :
      result.error === "Task not in project" ? 403 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true });
}
