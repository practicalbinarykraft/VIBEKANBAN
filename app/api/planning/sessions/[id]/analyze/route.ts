import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { planningSessions, councilMessages, planDrafts } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { generateCouncilMessages, generatePlanDraft } from "@/server/services/planning/deterministic-generator";

/**
 * POST /api/planning/sessions/[id]/analyze
 *
 * Analyze project idea and generate council discussion + plan draft
 * In test mode (PLAYWRIGHT=1), uses deterministic generator
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get session
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

    if (session.status !== 'draft') {
      return NextResponse.json(
        { error: "Session already analyzed" },
        { status: 400 }
      );
    }

    // Update status to analyzing
    await db
      .update(planningSessions)
      .set({ status: 'analyzing', updatedAt: new Date() })
      .where(eq(planningSessions.id, id));

    // Generate council messages (deterministic in test mode)
    const messages = generateCouncilMessages(session.ideaText);

    // Insert council messages
    for (const msg of messages) {
      await db.insert(councilMessages).values({
        id: randomUUID(),
        sessionId: id,
        role: msg.role,
        content: msg.content,
      });
    }

    // Generate plan draft
    const draft = generatePlanDraft(session.ideaText);

    // Insert plan draft
    await db.insert(planDrafts).values({
      id: randomUUID(),
      sessionId: id,
      goals: JSON.stringify(draft.goals),
      milestones: JSON.stringify(draft.milestones),
      tasks: JSON.stringify(draft.tasks),
      questions: JSON.stringify(draft.questions),
    });

    // Update status to ready
    await db
      .update(planningSessions)
      .set({ status: 'ready', updatedAt: new Date() })
      .where(eq(planningSessions.id, id));

    return NextResponse.json({
      success: true,
      sessionId: id,
      status: 'ready',
    });
  } catch (error: any) {
    console.error("Error analyzing session:", error);

    // Rollback status on error
    try {
      const { id } = await params;
      await db
        .update(planningSessions)
        .set({ status: 'draft', updatedAt: new Date() })
        .where(eq(planningSessions.id, id));
    } catch {}

    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
