/**
 * GET /api/projects/[id]/attempts/[attemptId]/logs
 * Get attempt logs with cursor pagination
 */
import { NextRequest, NextResponse } from "next/server";
import { getAttemptLogs } from "@/server/services/attempts/attempt-runner.service";
import { db } from "@/server/db";
import { attempts } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attemptId: string }> }
) {
  try {
    const { attemptId } = await params;
    const { searchParams } = new URL(request.url);

    // Parse query params
    const cursorStr = searchParams.get("cursor");
    const limitStr = searchParams.get("limit");

    const cursor = cursorStr ? parseInt(cursorStr, 10) : undefined;
    const limit = limitStr ? parseInt(limitStr, 10) : 100;

    // Validate params
    if (cursor !== undefined && isNaN(cursor)) {
      return NextResponse.json(
        { error: "Invalid cursor parameter" },
        { status: 400 }
      );
    }

    if (isNaN(limit) || limit < 1 || limit > 1000) {
      return NextResponse.json(
        { error: "Invalid limit parameter (1-1000)" },
        { status: 400 }
      );
    }

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

    const result = await getAttemptLogs({ attemptId, cursor, limit });

    return NextResponse.json({
      lines: result.lines.map((l) => ({
        timestamp: l.timestamp.toISOString(),
        level: l.level,
        message: l.message,
      })),
      nextCursor: result.nextCursor,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
