import { NextRequest, NextResponse } from "next/server";
import { getLatestCouncilDialogue, getCouncilDialogue } from "@/server/services/council/council-dialogue";
import { getLatestPlan } from "@/server/services/council/plan-generator";

/**
 * GET /api/projects/[id]/council
 *
 * Get latest council thread for project (or specific thread by ID)
 * Query params: ?threadId=xxx (optional)
 * Output: { thread: CouncilThread | null, plan: PlanArtifact | null }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const url = new URL(request.url);
    const threadId = url.searchParams.get("threadId");

    let thread;
    if (threadId) {
      thread = await getCouncilDialogue(threadId);
    } else {
      thread = await getLatestCouncilDialogue(projectId);
    }

    let plan = null;
    if (thread) {
      plan = await getLatestPlan(thread.id);
    }

    console.log(`[GET /council] Project ${projectId}: thread=${thread?.id || 'null'}, status=${thread?.status || 'none'}`);
    return NextResponse.json({ thread, plan });
  } catch (error: any) {
    console.error("Error fetching council:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch council" },
      { status: 500 }
    );
  }
}
