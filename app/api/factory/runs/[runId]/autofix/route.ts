/** POST /api/factory/runs/[runId]/autofix (PR-99, PR-100) - Trigger auto-fix */
import { NextRequest, NextResponse } from "next/server";
import { runAutoFix, type AutoFixMode } from "@/server/services/factory/factory-auto-fix.service";
import { createAutoFixDeps, getAutofixStatus } from "@/server/services/factory/factory-auto-fix-deps";
import { db } from "@/server/db";
import { autopilotRuns } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;

  if (!runId || runId.trim() === "") {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  // Get mode from query param: ?mode=diagnostics (default) | ?mode=claude
  const url = new URL(request.url);
  const modeParam = url.searchParams.get("mode");
  const mode: AutoFixMode = modeParam === "claude" ? "claude" : "diagnostics";

  // Check run exists and get projectId
  const run = await db.select().from(autopilotRuns)
    .where(eq(autopilotRuns.id, runId))
    .get();

  if (!run) {
    return NextResponse.json({ error: "RUN_NOT_FOUND" }, { status: 404 });
  }

  try {
    const deps = createAutoFixDeps(run.projectId);
    const results = await runAutoFix(runId, deps, mode);
    return NextResponse.json({ results, mode });
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
