import { NextRequest, NextResponse } from "next/server";
import { pauseProjectExecution } from "@/server/services/project-orchestrator";

/**
 * POST /api/projects/[id]/pause
 *
 * Pause project execution
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await pauseProjectExecution(id);

    return NextResponse.json({
      success: true,
      projectId: id,
      status: 'paused',
    });
  } catch (error: any) {
    console.error("Error pausing project execution:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
