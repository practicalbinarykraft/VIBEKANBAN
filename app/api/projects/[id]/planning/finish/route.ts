import { NextRequest, NextResponse } from "next/server";
import { getSession, updateSessionResult } from "@/server/services/planning-session-store";
import { generateCouncilBacklog } from "@/lib/council-backlog-generator";

/**
 * POST /api/projects/[id]/planning/finish
 *
 * Finish council planning session and return product result
 *
 * Request: { sessionId: string }
 * Response: {
 *   status: "DONE",
 *   sessionId: string,
 *   productResult: {
 *     mode: "QUESTIONS" | "PLAN",
 *     questions?: string[],
 *     steps?: { title: string, tasks: string[] }[]
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

    // Generate deterministic backlog based on ideaText (30-200 steps)
    const councilResult = generateCouncilBacklog(session.ideaText);

    // Build product result for UI (transform planSteps to steps format)
    const productResult =
      councilResult.mode === "QUESTIONS"
        ? { mode: "QUESTIONS" as const, questions: councilResult.questions }
        : {
            mode: "PLAN" as const,
            steps: councilResult.planSteps!.map((step) => ({
              title: step,
              tasks: [],
            })),
            planSteps: councilResult.planSteps,
          };

    // Update session with result in DB (keeps session for apply endpoint)
    await updateSessionResult(sessionId, productResult);

    // Simulate slight delay for realistic UX
    await new Promise((resolve) => setTimeout(resolve, 300));

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
