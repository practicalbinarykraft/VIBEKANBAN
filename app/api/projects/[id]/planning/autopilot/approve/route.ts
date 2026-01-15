import { NextRequest, NextResponse } from 'next/server';
import { approveCurrentBatch, getAutopilotStatus } from '@/lib/autopilot-machine';
import { getAutopilotState, saveAutopilotState } from '@/server/services/autopilot-store';

/**
 * POST /api/projects/[id]/planning/autopilot/approve
 * Approve current batch and move to next (or DONE)
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

    if (state.status !== 'WAITING_APPROVAL') {
      return NextResponse.json({
        error: 'Can only approve when WAITING_APPROVAL',
        currentStatus: state.status,
      }, { status: 400 });
    }

    const newState = approveCurrentBatch(state);
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
