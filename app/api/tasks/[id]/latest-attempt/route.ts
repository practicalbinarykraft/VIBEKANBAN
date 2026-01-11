import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { attempts } from "@/server/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;

  try {
    // Get latest attempt for task
    const latestAttempt = await db
      .select()
      .from(attempts)
      .where(eq(attempts.taskId, taskId))
      .orderBy(desc(attempts.startedAt))
      .limit(1)
      .get();

    if (!latestAttempt) {
      return NextResponse.json({ error: "No attempt found" }, { status: 404 });
    }

    return NextResponse.json(latestAttempt);
  } catch (error: any) {
    console.error("Error fetching latest attempt:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
