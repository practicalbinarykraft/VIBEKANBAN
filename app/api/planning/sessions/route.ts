import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { planningSessions } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

/**
 * POST /api/planning/sessions
 *
 * Create a new planning session with user's project idea
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ideaText, title, userId } = body;

    if (!ideaText || typeof ideaText !== 'string' || ideaText.trim().length === 0) {
      return NextResponse.json(
        { error: "ideaText is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    const sessionId = randomUUID();

    await db.insert(planningSessions).values({
      id: sessionId,
      userId: userId || null,
      title: title || null,
      ideaText: ideaText.trim(),
      status: 'draft',
    });

    const session = await db
      .select()
      .from(planningSessions)
      .where(eq(planningSessions.id, sessionId))
      .get();

    return NextResponse.json(session, { status: 201 });
  } catch (error: any) {
    console.error("Error creating planning session:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
