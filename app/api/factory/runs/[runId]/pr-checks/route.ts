/** GET /api/factory/runs/[runId]/pr-checks (PR-98) - Factory run PR CI checks */
import { NextRequest, NextResponse } from "next/server";
import { getFactoryRunPrChecks } from "@/server/services/factory/factory-pr-checks-deps";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;

  if (!runId || runId.trim() === "") {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  try {
    const items = await getFactoryRunPrChecks(runId);
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: "FETCH_FAILED" }, { status: 500 });
  }
}
