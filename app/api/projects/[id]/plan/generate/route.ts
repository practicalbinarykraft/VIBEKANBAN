import { NextRequest, NextResponse } from "next/server";
import { generatePlan, getLatestPlan } from "@/server/services/council/plan-generator";

/**
 * POST /api/projects/[id]/plan/generate
 *
 * Generate a new plan draft (Phase 3)
 * Input: { threadId: string }
 * Output: { plan: PlanArtifact }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params;
    const body = await request.json();
    const { threadId } = body;

    if (!threadId || typeof threadId !== "string") {
      return NextResponse.json(
        { error: "threadId is required" },
        { status: 400 }
      );
    }

    const plan = await generatePlan(threadId);

    return NextResponse.json({ plan });
  } catch (error: any) {
    console.error("Error generating plan:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate plan" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/projects/[id]/plan/generate?threadId=xxx
 *
 * Get latest plan for thread
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params;
    const url = new URL(request.url);
    const threadId = url.searchParams.get("threadId");

    if (!threadId) {
      return NextResponse.json(
        { error: "threadId is required" },
        { status: 400 }
      );
    }

    const plan = await getLatestPlan(threadId);

    return NextResponse.json({ plan });
  } catch (error: any) {
    console.error("Error fetching plan:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch plan" },
      { status: 500 }
    );
  }
}
