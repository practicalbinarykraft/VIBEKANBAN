import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/server/services/planning-session-store';
import { chunkBacklog } from '@/lib/backlog-chunker';
import { createAutopilotState, startAutopilot, getAutopilotStatus } from '@/lib/autopilot-machine';
import { getAutopilotState, saveAutopilotState, initAutopilotState } from '@/server/services/autopilot-store';

/**
 * POST /api/projects/[id]/planning/autopilot/start
 * Start autopilot execution for a planning session
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params;
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
    }

    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (!session.productResult?.planSteps) {
      return NextResponse.json({ error: 'No plan steps in session' }, { status: 400 });
    }

    // Check for existing state (idempotent)
    let state = getAutopilotState(sessionId);
    if (!state) {
      const batches = chunkBacklog(session.productResult.planSteps);
      state = initAutopilotState(sessionId, batches);
    }

    // Start if not already running
    state = startAutopilot(state);
    saveAutopilotState(sessionId, state);

    return NextResponse.json({
      success: true,
      sessionId,
      ...getAutopilotStatus(state),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
