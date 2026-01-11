import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { attempts, logs, artifacts } from "@/server/db/schema";
import { eq, desc, sql, inArray } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;

  try {
    // Get all attempts for task
    const taskAttempts = await db
      .select()
      .from(attempts)
      .where(eq(attempts.taskId, taskId))
      .orderBy(desc(attempts.startedAt));

    if (taskAttempts.length === 0) {
      return NextResponse.json([]);
    }

    // Get counts for logs and artifacts for each attempt
    const attemptIds = taskAttempts.map((a) => a.id);

    // Count logs per attempt
    const logCounts = await db
      .select({
        attemptId: logs.attemptId,
        count: sql<number>`count(*)`.as("count"),
      })
      .from(logs)
      .where(inArray(logs.attemptId, attemptIds))
      .groupBy(logs.attemptId);

    // Count artifacts per attempt
    const artifactCounts = await db
      .select({
        attemptId: artifacts.attemptId,
        count: sql<number>`count(*)`.as("count"),
      })
      .from(artifacts)
      .where(inArray(artifacts.attemptId, attemptIds))
      .groupBy(artifacts.attemptId);

    // Map counts to attempts
    const logCountMap = Object.fromEntries(
      logCounts.map((lc) => [lc.attemptId, lc.count])
    );
    const artifactCountMap = Object.fromEntries(
      artifactCounts.map((ac) => [ac.attemptId, ac.count])
    );

    // Build response with statistics
    const attemptsWithStats = taskAttempts.map((attempt) => ({
      ...attempt,
      logsCount: logCountMap[attempt.id] || 0,
      artifactsCount: artifactCountMap[attempt.id] || 0,
    }));

    return NextResponse.json(attemptsWithStats);
  } catch (error: any) {
    console.error("Error fetching attempts:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
