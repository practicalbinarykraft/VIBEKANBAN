import { NextRequest, NextResponse } from "next/server";
import { updateSessionAnswers } from "@/server/services/planning-session-store";

/**
 * POST /api/projects/[id]/planning/answer
 *
 * Save user answers to clarifying questions and mark question phase complete
 *
 * Request: { sessionId: string, answers: Record<string, string> }
 * Response: { success: boolean }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params; // Validate params exist
    const body = await request.json();
    const { sessionId, answers } = body;

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
      return NextResponse.json(
        { error: "answers must be an object mapping question to answer" },
        { status: 400 }
      );
    }

    const success = await updateSessionAnswers(sessionId, answers);

    if (!success) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error saving answers:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
