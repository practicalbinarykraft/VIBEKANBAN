/** GET /api/attempts/[id]/summary (PR-90) - Attempt summary for factory results */
import { NextRequest, NextResponse } from "next/server";
import { getAttemptSummary } from "@/server/services/attempts/attempt-summary.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: attemptId } = await params;
  const result = await getAttemptSummary(attemptId);

  if (!result) {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  }

  return NextResponse.json(result);
}
