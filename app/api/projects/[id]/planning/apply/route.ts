import { NextRequest, NextResponse } from "next/server";
import { getSession, deleteSession } from "@/lib/planning-sessions";
import { planToTasks } from "@/lib/plan-to-tasks";
import { db } from "@/server/db";
import { tasks } from "@/server/db/schema";
import { randomUUID } from "crypto";

/**
 * POST /api/projects/[id]/planning/apply
 *
 * Apply plan by creating tasks from plan steps
 *
 * Request: { sessionId: string }
 * Response: { createdTaskIds: string[] }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    // Get session
    const session = getSession(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Verify session status
    if (session.status !== "RESULT_READY") {
      return NextResponse.json(
        { error: "Session not ready for apply. Status: " + session.status },
        { status: 400 }
      );
    }

    // Verify we have a PLAN result with steps
    if (
      !session.productResult ||
      session.productResult.mode !== "PLAN" ||
      !session.productResult.steps
    ) {
      return NextResponse.json(
        { error: "No plan steps available to apply" },
        { status: 400 }
      );
    }

    // Extract all tasks from plan steps
    // Each step has { title, tasks[] }, we flatten all tasks
    const allStepTasks: string[] = [];
    for (const step of session.productResult.steps) {
      for (const task of step.tasks) {
        allStepTasks.push(`${step.title}: ${task}`);
      }
    }

    // Convert plan steps to task definitions
    const taskDefinitions = planToTasks({
      projectId,
      planSteps: allStepTasks,
    });

    // Create tasks in database
    const createdTaskIds: string[] = [];
    for (let i = 0; i < taskDefinitions.length; i++) {
      const taskDef = taskDefinitions[i];
      const taskId = randomUUID();
      await db.insert(tasks).values({
        id: taskId,
        projectId,
        title: taskDef.title,
        description: taskDef.description,
        status: "todo",
        order: i,
      });
      createdTaskIds.push(taskId);
    }

    // Clean up session after successful apply
    deleteSession(sessionId);

    return NextResponse.json({
      createdTaskIds,
      count: createdTaskIds.length,
    });
  } catch (error: any) {
    console.error("Error applying plan:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
