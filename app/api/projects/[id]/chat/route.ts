import { NextRequest, NextResponse } from "next/server";
import {
  handleUserMessage,
  getChatHistory,
} from "@/server/services/chat/chat-handler";

/**
 * GET /api/projects/[id]/chat
 * Get chat history for project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    const messages = await getChatHistory(projectId);

    return NextResponse.json(messages);
  } catch (error: any) {
    console.error("Error fetching chat history:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[id]/chat (PR-127: Chat UX Fix)
 * Send message to project chat
 *
 * Returns conversational AI response only.
 * Does NOT trigger council/planning - that's done via separate endpoint.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Handle user message and get conversational AI response
    // NO council trigger, NO proposal generation
    const { userMsg, productMsg } = await handleUserMessage(projectId, message);

    return NextResponse.json({
      userMessage: userMsg,
      productMessage: productMsg,
    });
  } catch (error: any) {
    console.error("Error handling chat message:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
