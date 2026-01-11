import { NextRequest, NextResponse } from "next/server";
import { startProjectExecution } from "@/server/services/project-orchestrator";

/**
 * POST /api/projects/[id]/run-all
 *
 * Start project execution orchestrator
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await startProjectExecution(id);

    return NextResponse.json({
      success: true,
      projectId: id,
      status: 'running',
    });
  } catch (error: any) {
    console.error("Error starting project execution:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
