import { NextRequest, NextResponse } from "next/server";
import { getSession, updateSessionResult } from "@/server/services/planning-session-store";
import { generateBacklog } from "@/lib/ai-backlog-generator";

/**
 * POST /api/projects/[id]/planning/finish
 *
 * Finish council planning session and return product result
 * Uses AI to generate 30-200 step backlog when configured
 *
 * Request: { sessionId: string }
 * Response: {
 *   status: "DONE",
 *   sessionId: string,
 *   productResult: {
 *     mode: "PLAN",
 *     steps: { title: string, tasks: string[] }[]
 *   }
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params; // Validate params exist
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    // Get stored session from DB
    const session = await getSession(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Generate backlog using AI (or deterministic fallback)
    const backlogResult = await generateBacklog(session.ideaText);

    // Build product result for UI
    const productResult = {
      mode: "PLAN" as const,
      steps: backlogResult.steps,
      planSteps: backlogResult.planSteps,
    };

    // Update session with result in DB
    await updateSessionResult(sessionId, productResult);

    return NextResponse.json({
      status: "DONE",
      sessionId,
      productResult,
    });
  } catch (error: any) {
    console.error("Error finishing planning session:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
