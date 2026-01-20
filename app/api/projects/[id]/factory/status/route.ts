/** GET /api/projects/[id]/factory/status (PR-83) - Get factory status */
import { NextRequest, NextResponse } from "next/server";
import { getFactoryStatus } from "@/server/services/factory/factory-status.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const status = await getFactoryStatus(projectId);
  return NextResponse.json(status);
}
