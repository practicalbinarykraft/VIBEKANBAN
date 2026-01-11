import { NextRequest, NextResponse } from "next/server";
import { applyIterationPlan } from "@/server/services/chat/iteration-service";

/**
 * POST /api/projects/[id]/iterate
 * Apply iteration plan to project (create tasks)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const { plan } = body;

    if (!plan || !plan.tasks) {
      return NextResponse.json(
        { error: "Iteration plan is required" },
        { status: 400 }
      );
    }

    // Apply iteration plan
    const result = await applyIterationPlan(projectId, plan);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error("Error applying iteration:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
