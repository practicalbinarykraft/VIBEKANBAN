import { NextRequest, NextResponse } from 'next/server';
import { completeBatch, getAutopilotStatus } from '@/lib/autopilot-machine';
import { getAutopilotState, saveAutopilotState } from '@/server/services/autopilot-store';

/**
 * POST /api/projects/[id]/planning/autopilot/complete-batch
 * Mark current batch as complete, transition to WAITING_APPROVAL
 *
 * Used for testing and manual batch completion triggers.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
    }

    const state = await getAutopilotState(sessionId);
    if (!state) {
      return NextResponse.json({ error: 'No autopilot state found' }, { status: 404 });
    }

    if (state.status !== 'RUNNING') {
      return NextResponse.json({
        error: 'Can only complete batch when RUNNING',
        currentStatus: state.status,
      }, { status: 400 });
    }

    const newState = completeBatch(state);
    await saveAutopilotState(sessionId, newState);

    return NextResponse.json({
      success: true,
      sessionId,
      ...getAutopilotStatus(newState),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
