import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { planningSessions, councilMessages, planDrafts } from "@/server/db/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/planning/sessions/[id]
 *
 * Get planning session with council messages and draft
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await db
      .select()
      .from(planningSessions)
      .where(eq(planningSessions.id, id))
      .get();

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Get council messages
    const messages = await db
      .select()
      .from(councilMessages)
      .where(eq(councilMessages.sessionId, id))
      .all();

    // Get draft
    const draft = await db
      .select()
      .from(planDrafts)
      .where(eq(planDrafts.sessionId, id))
      .get();

    return NextResponse.json({
      ...session,
      councilMessages: messages,
      draft: draft ? {
        goals: JSON.parse(draft.goals),
        milestones: JSON.parse(draft.milestones),
        tasks: JSON.parse(draft.tasks),
        questions: draft.questions ? JSON.parse(draft.questions) : [],
      } : null,
    });
  } catch (error: any) {
    console.error("Error fetching planning session:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
