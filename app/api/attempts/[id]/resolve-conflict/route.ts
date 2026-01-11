import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { attempts } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUserId, canPerformTaskAction, permissionDeniedError } from "@/server/services/permissions";

/**
 * POST /api/attempts/:id/resolve-conflict
 *
 * Marks attempt as manually resolved (does not perform git operations)
 * Sets mergeStatus to "resolved" so Apply/PR actions become available again
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: attemptId } = await params;

  try {
    // Get attempt
    const attempt = await db
      .select()
      .from(attempts)
      .where(eq(attempts.id, attemptId))
      .get();

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    // Check permissions
    const userId = await getCurrentUserId(request);
    const canPerform = await canPerformTaskAction(attempt.taskId, userId);
    if (!canPerform) {
      return NextResponse.json(permissionDeniedError(), { status: 403 });
    }

    // Validate attempt has conflict
    if (attempt.mergeStatus !== "conflict") {
      return NextResponse.json(
        { error: "Attempt does not have a conflict" },
        { status: 400 }
      );
    }

    // Mark as resolved (no git operations, just update status)
    await db.update(attempts)
      .set({
        mergeStatus: "resolved",
      })
      .where(eq(attempts.id, attemptId));

    return NextResponse.json({
      success: true,
      mergeStatus: "resolved",
      message: "Conflict marked as resolved. Apply/PR actions are now available.",
    });

  } catch (error: any) {
    console.error("Error resolving conflict:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
