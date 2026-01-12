import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { projects } from "@/server/db/schema";
import { eq } from "drizzle-orm";

/**
 * POST /api/test/fixtures/project/reset-status
 *
 * Test fixture: Reset project executionStatus to idle
 * Used in beforeEach to ensure clean state between test runs/retries
 */
export async function POST(request: NextRequest) {
  try {
    const { projectId } = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: "projectId required" }, { status: 400 });
    }

    await db
      .update(projects)
      .set({
        executionStatus: "idle",
        executionStartedAt: null,
        executionFinishedAt: null,
      })
      .where(eq(projects.id, projectId));

    return NextResponse.json({ success: true, projectId });
  } catch (error: any) {
    console.error("Error resetting project status:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
