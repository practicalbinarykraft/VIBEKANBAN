import { NextRequest, NextResponse } from "next/server";
import {
  handleUserMessage,
  getChatHistory,
  saveProposalMessage,
  formatProposalMessage,
} from "@/server/services/chat/chat-handler";
import { startCouncilDiscussion } from "@/server/services/chat/council-orchestrator";

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
 * POST /api/projects/[id]/chat
 * Send message to project chat
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

    // Handle user message and get AI response
    const { userMsg, productMsg } = await handleUserMessage(projectId, message);

    // Start council discussion
    const { thread, plan, error: councilError } = await startCouncilDiscussion(projectId, message);

    // Save proposal message to chat with plan details
    const proposalMsg = await saveProposalMessage(projectId, plan);
    const { data: proposalData } = formatProposalMessage(plan);

    return NextResponse.json({
      userMessage: userMsg,
      productMessage: productMsg,
      proposalMessage: proposalMsg,
      proposal: proposalData,
      councilThread: thread,
      iterationPlan: plan,
      // Include error if AI failed (fail loudly)
      ...(councilError && { error: councilError }),
    });
  } catch (error: any) {
    console.error("Error handling chat message:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
