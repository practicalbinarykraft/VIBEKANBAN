/** POST /api/factory/runs/[runId]/autofix (PR-99) - Trigger auto-fix for failed PRs */
import { NextRequest, NextResponse } from "next/server";
import { runAutoFix } from "@/server/services/factory/factory-auto-fix.service";
import { createAutoFixDeps, getAutofixStatus } from "@/server/services/factory/factory-auto-fix-deps";
import { db } from "@/server/db";
import { autopilotRuns } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;

  if (!runId || runId.trim() === "") {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  // Check run exists and get projectId
  const run = await db.select().from(autopilotRuns)
    .where(eq(autopilotRuns.id, runId))
    .get();

  if (!run) {
    return NextResponse.json({ error: "RUN_NOT_FOUND" }, { status: 404 });
  }

  try {
    const deps = createAutoFixDeps(run.projectId);
    const results = await runAutoFix(runId, deps);
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ error: "AUTOFIX_FAILED" }, { status: 500 });
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;

  if (!runId || runId.trim() === "") {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  try {
    const status = await getAutofixStatus(runId);
    return NextResponse.json(status);
  } catch {
    return NextResponse.json({ error: "FETCH_FAILED" }, { status: 500 });
  }
}
