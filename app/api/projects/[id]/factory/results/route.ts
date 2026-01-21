/** GET /api/projects/[id]/factory/results (PR-89) - Latest factory run results */
import { NextRequest, NextResponse } from "next/server";
import { getFactoryResults } from "@/server/services/factory/factory-results.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const result = await getFactoryResults(projectId);
  return NextResponse.json(result);
}
