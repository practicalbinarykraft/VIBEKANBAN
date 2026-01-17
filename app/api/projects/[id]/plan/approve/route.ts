import { NextRequest, NextResponse } from "next/server";
import { approvePlan } from "@/server/services/council/plan-generator";

/**
 * POST /api/projects/[id]/plan/approve
 *
 * Approve a plan (makes it final)
 * Input: { planId: string }
 * Output: { plan: PlanArtifact }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params;
    const body = await request.json();
    const { planId } = body;

    if (!planId || typeof planId !== "string") {
      return NextResponse.json(
        { error: "planId is required" },
        { status: 400 }
      );
    }

    const plan = await approvePlan(planId);

    return NextResponse.json({ plan });
  } catch (error: any) {
    console.error("Error approving plan:", error);
    return NextResponse.json(
      { error: error.message || "Failed to approve plan" },
      { status: 500 }
    );
  }
}
