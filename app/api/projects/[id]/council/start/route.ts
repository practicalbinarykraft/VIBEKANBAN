import { NextRequest, NextResponse } from "next/server";
import { startCouncilDialogue } from "@/server/services/council/council-dialogue";
import { getChatHistory } from "@/server/services/chat/chat-handler";

/**
 * POST /api/projects/[id]/council/start
 *
 * Start a new council discussion (Phase 1 - Kickoff)
 * Input: { idea: string } OR { fromChat: true }
 * Output: { thread: CouncilThread }
 *
 * PR-128: When fromChat=true, fetches last user message from chat history
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const { idea, fromChat } = body;

    let ideaText: string;

    if (fromChat) {
      // PR-128: Get idea from chat history
      const messages = await getChatHistory(projectId);
      const userMessages = messages.filter((m: any) => m.role === "user");
      const lastUserMessage = userMessages[userMessages.length - 1];

      if (!lastUserMessage || !lastUserMessage.content) {
        return NextResponse.json(
          { error: "No user message found in chat. Send a message first." },
          { status: 400 }
        );
      }

      ideaText = lastUserMessage.content.trim();
    } else {
      // Original flow: idea from request body
      if (!idea || typeof idea !== "string" || idea.trim().length === 0) {
        return NextResponse.json(
          { error: "Idea is required" },
          { status: 400 }
        );
      }
      ideaText = idea.trim();
    }

    const thread = await startCouncilDialogue(projectId, ideaText);

    return NextResponse.json({ thread });
  } catch (error: any) {
    console.error("Error starting council:", error);
    return NextResponse.json(
      { error: error.message || "Failed to start council discussion" },
      { status: 500 }
    );
  }
}
