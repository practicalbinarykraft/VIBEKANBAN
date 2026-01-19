/**
 * GET /api/projects/[id]/attempts/[attemptId]
 * Get attempt status and metadata
 */
import { NextRequest, NextResponse } from "next/server";
import { getAttemptStatus } from "@/server/services/attempts/attempt-runner.service";
import { db } from "@/server/db";
import { attempts } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attemptId: string }> }
) {
  try {
    const { attemptId } = await params;

    // Verify attempt exists
    const attempt = await db.select()
      .from(attempts)
      .where(eq(attempts.id, attemptId))
      .get();

    if (!attempt) {
      return NextResponse.json(
        { error: "Attempt not found" },
        { status: 404 }
      );
    }

    const status = await getAttemptStatus(attemptId);

    return NextResponse.json({
      attemptId: status.attemptId,
      status: status.status,
      startedAt: status.startedAt?.toISOString() ?? null,
      finishedAt: status.finishedAt?.toISOString() ?? null,
      exitCode: status.exitCode,
      error: status.error,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
