import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { planningSessions, planDrafts, projects, tasks } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

/**
 * POST /api/planning/sessions/[id]/confirm
 *
 * Confirm plan and create project + tasks from draft
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

    if (session.status !== 'ready') {
      return NextResponse.json(
        { error: "Session must be analyzed before confirming" },
        { status: 400 }
      );
    }

    // Get draft
    const draft = await db
      .select()
      .from(planDrafts)
      .where(eq(planDrafts.sessionId, id))
      .get();

    if (!draft) {
      return NextResponse.json(
        { error: "Plan draft not found" },
        { status: 404 }
      );
    }

    const parsedDraft = {
      goals: JSON.parse(draft.goals),
      milestones: JSON.parse(draft.milestones),
      tasks: JSON.parse(draft.tasks),
      questions: draft.questions ? JSON.parse(draft.questions) : [],
    };

    // Create project
    const projectId = randomUUID();
    const projectTitle = session.title || `Project from: ${session.ideaText.slice(0, 50)}`;

    await db.insert(projects).values({
      id: projectId,
      name: projectTitle,
      gitUrl: 'https://github.com/example/placeholder', // Placeholder
      repoPath: null,
      defaultBranch: 'main',
      ownerId: session.userId || 'user-owner',
    });

    // Create tasks from draft
    for (let i = 0; i < parsedDraft.tasks.length; i++) {
      const task = parsedDraft.tasks[i];
      await db.insert(tasks).values({
        id: randomUUID(),
        projectId,
        title: task.title,
        description: task.description,
        status: task.status,
        order: i,
      });
    }

    // Update session status to confirmed
    await db
      .update(planningSessions)
      .set({ status: 'confirmed', updatedAt: new Date() })
      .where(eq(planningSessions.id, id));

    return NextResponse.json({
      success: true,
      projectId,
      sessionId: id,
    });
  } catch (error: any) {
    console.error("Error confirming plan:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
