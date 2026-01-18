import { NextRequest, NextResponse } from "next/server";
import { createSession, updateSessionResult, markSessionApplied } from "@/server/services/planning-session-store";
import { startCouncilDiscussion } from "@/server/services/chat/council-orchestrator";

/**
 * POST /api/projects/[id]/planning/start
 *
 * Start council planning session for a project idea
 * Uses real AI council when configured, mock otherwise
 *
 * Request: { ideaText: string } (also accepts { idea: string } for compatibility)
 * Optional: { taskIds: string[] } - Skip council, create session for autopilot with existing tasks
 * Response: { sessionId, councilMessages, status: "DISCUSSION", error?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();

    // Support both old (idea) and new (ideaText) field names
    const ideaText = body.ideaText || body.idea;
    const taskIds: string[] | undefined = body.taskIds;

    if (!ideaText || typeof ideaText !== "string" || ideaText.trim().length === 0) {
      return NextResponse.json(
        { error: "ideaText is required" },
        { status: 400 }
      );
    }

    // Create session in DB
    const sessionId = await createSession(projectId, ideaText.trim());

    // If taskIds provided, create autopilot-ready session without council discussion
    // This is used by EPIC-9 council flow after tasks are created
    if (taskIds && Array.isArray(taskIds) && taskIds.length > 0) {
      // Store task titles as planSteps for autopilot
      await updateSessionResult(sessionId, {
        mode: "PLAN",
        planSteps: taskIds, // Using IDs as planSteps - autopilot/start will use taskIds from body
      });
      await markSessionApplied(sessionId, taskIds);

      return NextResponse.json({
        sessionId,
        councilMessages: [],
        status: "APPLIED",
        success: true,
        projectId,
        taskIds,
      });
    }

    // Run real council discussion (uses AI when configured, mock otherwise)
    const { thread, plan, error: councilError } = await startCouncilDiscussion(
      projectId,
      ideaText.trim()
    );

    // Transform messages for frontend format
    const councilMessages = thread.messages.map((msg) => ({
      id: msg.id,
      role: msg.role.toUpperCase(), // frontend expects uppercase
      content: msg.content,
    }));

    // Store the plan for finish endpoint
    if (plan && plan.tasks.length > 0) {
      await updateSessionResult(sessionId, {
        mode: "PLAN",
        planSteps: plan.tasks.map((t) => t.title),
        steps: plan.tasks.map((t) => ({
          title: t.title,
          tasks: [t.description],
        })),
      });
    }

    return NextResponse.json({
      sessionId,
      councilMessages,
      status: "DISCUSSION",
      // Include error if AI failed (fail loudly)
      ...(councilError && { error: councilError }),
      // Backward compatibility
      success: true,
      projectId,
      messages: councilMessages,
    });
  } catch (error: any) {
    console.error("Error starting planning session:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
