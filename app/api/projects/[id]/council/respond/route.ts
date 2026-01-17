import { NextRequest, NextResponse } from "next/server";
import { respondToCouncil } from "@/server/services/council/council-respond";

/**
 * POST /api/projects/[id]/council/respond
 *
 * Submit user response to council questions (Phase 2 - Follow-up)
 * Input: { threadId: string, response: string }
 * Output: { thread: CouncilThread, newMessages: CouncilMessage[] }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params; // Validate params exist
    const body = await request.json();
    const { threadId, response } = body;

    if (!threadId || typeof threadId !== "string") {
      return NextResponse.json(
        { error: "threadId is required" },
        { status: 400 }
      );
    }

    if (!response || typeof response !== "string" || response.trim().length === 0) {
      return NextResponse.json(
        { error: "Response is required" },
        { status: 400 }
      );
    }

    const result = await respondToCouncil(threadId, response.trim());

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error responding to council:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process response" },
      { status: 500 }
    );
  }
}
