/**
 * GET/POST /api/projects/[id]/attempts
 * GET: List attempts for project (PR-63)
 * POST: Create a new attempt for a task in this project (PR-62)
 */
import { NextRequest, NextResponse } from "next/server";
import { createAttempt } from "@/server/services/attempts/attempt-runner.service";
import { db } from "@/server/db";
import { projects, tasks, attempts } from "@/server/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";

/**
 * GET /api/projects/[id]/attempts?limit=20
 * List recent attempts for all tasks in this project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);

    // Get all task IDs for this project
    const projectTasks = await db.select({ id: tasks.id })
      .from(tasks)
      .where(eq(tasks.projectId, projectId));

    if (projectTasks.length === 0) {
      return NextResponse.json([]);
    }

    const taskIds = projectTasks.map((t) => t.id);

    // Get attempts for these tasks
    const projectAttempts = await db.select()
      .from(attempts)
      .where(inArray(attempts.taskId, taskIds))
      .orderBy(desc(attempts.startedAt))
      .limit(limit);

    return NextResponse.json(projectAttempts);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

interface CreateAttemptBody {
  taskId: string;
  mode?: "autopilot" | "manual";
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    // Validate project exists
    const project = await db.select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .get();

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Parse body
    let body: CreateAttemptBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    if (!body.taskId) {
      return NextResponse.json(
        { error: "taskId is required" },
        { status: 400 }
      );
    }

    // Validate task belongs to project
    const task = await db.select()
      .from(tasks)
      .where(and(eq(tasks.id, body.taskId), eq(tasks.projectId, projectId)))
      .get();

    if (!task) {
      return NextResponse.json(
        { error: "Task not found in this project" },
        { status: 404 }
      );
    }

    // Create attempt
    const result = await createAttempt({
      projectId,
      taskId: body.taskId,
      mode: body.mode,
    });

    return NextResponse.json(
      { attemptId: result.attemptId },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
