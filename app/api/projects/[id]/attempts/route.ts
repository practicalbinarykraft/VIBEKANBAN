/**
 * POST /api/projects/[id]/attempts
 * Create a new attempt for a task in this project
 */
import { NextRequest, NextResponse } from "next/server";
import { createAttempt } from "@/server/services/attempts/attempt-runner.service";
import { db } from "@/server/db";
import { projects, tasks } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";

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
