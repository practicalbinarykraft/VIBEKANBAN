import { NextRequest, NextResponse } from 'next/server';
import { cancelAutopilot, getAutopilotStatus } from '@/lib/autopilot-machine';
import { getAutopilotState, saveAutopilotState } from '@/server/services/autopilot-store';

/**
 * POST /api/projects/[id]/planning/autopilot/cancel
 * Cancel autopilot execution, return to IDLE
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
    }

    const state = getAutopilotState(sessionId);
    if (!state) {
      return NextResponse.json({ error: 'No autopilot state found' }, { status: 404 });
    }

    const newState = cancelAutopilot(state);
    saveAutopilotState(sessionId, newState);

    return NextResponse.json({
      success: true,
      sessionId,
      ...getAutopilotStatus(newState),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
