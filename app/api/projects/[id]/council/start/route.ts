import { NextRequest, NextResponse } from "next/server";
import { startCouncilDialogue } from "@/server/services/council/council-dialogue";

/**
 * POST /api/projects/[id]/council/start
 *
 * Start a new council discussion (Phase 1 - Kickoff)
 * Input: { idea: string }
 * Output: { thread: CouncilThread }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const { idea } = body;

    if (!idea || typeof idea !== "string" || idea.trim().length === 0) {
      return NextResponse.json(
        { error: "Idea is required" },
        { status: 400 }
      );
    }

    const thread = await startCouncilDialogue(projectId, idea.trim());

    return NextResponse.json({ thread });
  } catch (error: any) {
    console.error("Error starting council:", error);
    return NextResponse.json(
      { error: error.message || "Failed to start council discussion" },
      { status: 500 }
    );
  }
}
