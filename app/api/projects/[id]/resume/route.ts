import { NextRequest, NextResponse } from "next/server";
import { resumeProjectExecution } from "@/server/services/project-orchestrator";

/**
 * POST /api/projects/[id]/resume
 *
 * Resume project execution
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await resumeProjectExecution(id);

    return NextResponse.json({
      success: true,
      projectId: id,
      status: 'running',
    });
  } catch (error: any) {
    console.error("Error resuming project execution:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
