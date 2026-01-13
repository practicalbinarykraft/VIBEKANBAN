import { NextRequest, NextResponse } from "next/server";
import { storeSession } from "@/lib/planning-sessions";

/**
 * Mock council messages for planning feature
 * In production, these would come from AI agents
 */
const MOCK_COUNCIL_MESSAGES = [
  {
    id: "msg-1",
    role: "PM",
    content: "I suggest we break this down into user stories first. Let's identify the core user journeys and prioritize by business value.",
  },
  {
    id: "msg-2",
    role: "ARCHITECT",
    content: "From a technical perspective, we should consider the system boundaries and integration points. I recommend starting with a clean architecture approach.",
  },
  {
    id: "msg-3",
    role: "BACKEND",
    content: "I can implement the API layer. We should define the data models and REST endpoints first. I suggest using TypeScript for type safety.",
  },
];

/**
 * POST /api/projects/[id]/planning/start
 *
 * Start council planning session for a project idea
 *
 * Request: { ideaText: string } (also accepts { idea: string } for compatibility)
 * Response: { sessionId, councilMessages, status: "DISCUSSION" }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Support both old (idea) and new (ideaText) field names
    const ideaText = body.ideaText || body.idea;

    if (!ideaText || typeof ideaText !== "string" || ideaText.trim().length === 0) {
      return NextResponse.json(
        { error: "ideaText is required" },
        { status: 400 }
      );
    }

    // Generate deterministic sessionId
    const sessionId = `session-${id}-${Date.now()}`;

    // Store session for finish endpoint
    storeSession(sessionId, ideaText.trim());

    // Simulate slight delay for realistic UX
    await new Promise((resolve) => setTimeout(resolve, 500));

    return NextResponse.json({
      sessionId,
      councilMessages: MOCK_COUNCIL_MESSAGES,
      status: "DISCUSSION",
      // Keep old fields for backward compatibility
      success: true,
      projectId: id,
      messages: MOCK_COUNCIL_MESSAGES,
    });
  } catch (error: any) {
    console.error("Error starting planning session:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
