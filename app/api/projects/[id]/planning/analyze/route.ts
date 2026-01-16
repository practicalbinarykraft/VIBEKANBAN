import { NextRequest, NextResponse } from "next/server";
import { analyzeIdeaForQuestions } from "@/lib/planning-question-analyzer";

/**
 * POST /api/projects/[id]/planning/analyze
 *
 * Analyze project idea to determine if clarifying questions are needed
 *
 * Request: { ideaText: string }
 * Response: { needsQuestions: boolean, questions?: string[], reason: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params; // Validate params exist
    const body = await request.json();
    const ideaText = body.ideaText || body.idea;

    if (!ideaText || typeof ideaText !== "string" || ideaText.trim().length === 0) {
      return NextResponse.json(
        { error: "ideaText is required" },
        { status: 400 }
      );
    }

    const result = analyzeIdeaForQuestions(ideaText.trim());

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Error analyzing idea:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
