/**
 * POST /api/projects/[id]/attempts/[attemptId]/run
 * Start execution of a queued attempt
 */
import { NextRequest, NextResponse } from "next/server";
import { runAttempt, getAttemptStatus } from "@/server/services/attempts/attempt-runner.service";
import { db } from "@/server/db";
import { attempts } from "@/server/db/schema";
import { eq } from "drizzle-orm";

interface RunAttemptBody {
  command?: string[];
  runner?: "simple";
}

// Default command for autopilot mode
const DEFAULT_COMMAND = ["node", "-e", "console.log('Attempt executed')"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attemptId: string }> }
) {
  try {
    const { id: projectId, attemptId } = await params;

    // Get attempt and verify it exists
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

    // Parse body (optional)
    let body: RunAttemptBody = {};
    try {
      const text = await request.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch {
      // Empty body is ok
    }

    const command = body.command || DEFAULT_COMMAND;

    // Run the attempt
    const result = await runAttempt({
      attemptId,
      command,
    });

    if (!result.ok) {
      // Determine status code based on error
      if (result.error?.includes("not found")) {
        return NextResponse.json({ error: result.error }, { status: 404 });
      }
      if (result.error?.includes("already")) {
        return NextResponse.json({ error: result.error }, { status: 409 });
      }
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
