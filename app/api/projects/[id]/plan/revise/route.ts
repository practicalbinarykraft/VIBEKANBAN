import { NextRequest, NextResponse } from "next/server";
import { revisePlan } from "@/server/services/council/plan-generator";

/**
 * POST /api/projects/[id]/plan/revise
 *
 * Revise an existing plan based on user feedback
 * Input: { threadId: string, revision: string }
 * Output: { plan: PlanArtifact }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params;
    const body = await request.json();
    const { threadId, revision } = body;

    if (!threadId || typeof threadId !== "string") {
      return NextResponse.json(
        { error: "threadId is required" },
        { status: 400 }
      );
    }

    if (!revision || typeof revision !== "string" || revision.trim().length === 0) {
      return NextResponse.json(
        { error: "Revision description is required" },
        { status: 400 }
      );
    }

    const plan = await revisePlan(threadId, revision.trim());

    return NextResponse.json({ plan });
  } catch (error: any) {
    console.error("Error revising plan:", error);
    return NextResponse.json(
      { error: error.message || "Failed to revise plan" },
      { status: 500 }
    );
  }
}
