import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { attempts, logs, artifacts } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
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

    // Get logs for attempt
    const attemptLogs = await db
      .select()
      .from(logs)
      .where(eq(logs.attemptId, attemptId))
      .orderBy(logs.timestamp);

    // Get artifacts for attempt
    const attemptArtifacts = await db
      .select()
      .from(artifacts)
      .where(eq(artifacts.attemptId, attemptId))
      .orderBy(artifacts.createdAt);

    // Parse conflictFiles JSON if it exists
    const conflictFiles = attempt.conflictFiles
      ? JSON.parse(attempt.conflictFiles)
      : null;

    return NextResponse.json({
      ...attempt,
      conflictFiles,
      logs: attemptLogs,
      artifacts: attemptArtifacts,
    });
  } catch (error: any) {
    console.error("Error fetching attempt:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
