import { NextRequest, NextResponse } from "next/server";
import {
  executePlan,
  isExecutePlanV2Enabled,
} from "@/server/services/execute-plan.service";

/**
 * POST /api/projects/[id]/plan/execute
 *
 * Execute an approved plan by creating tasks and attempts
 * Input: { planId: string }
 * Output: { success, createdTaskIds, attemptIds, alreadyExecuted? }
 *
 * Requires: FEATURE_EXECUTE_PLAN_V2=1
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    // Check feature flag
    if (!isExecutePlanV2Enabled()) {
      return NextResponse.json(
        { error: "Execute Plan V2 feature is not enabled" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { planId } = body;

    if (!planId || typeof planId !== "string") {
      return NextResponse.json({ error: "planId is required" }, { status: 400 });
    }

    const result = await executePlan({
      planId,
      projectId,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      createdTaskIds: result.createdTaskIds,
      attemptIds: result.attemptIds,
      alreadyExecuted: result.alreadyExecuted,
    });
  } catch (error: any) {
    console.error("Error executing plan:", error);
    return NextResponse.json(
      { error: error.message || "Failed to execute plan" },
      { status: 500 }
    );
  }
}
