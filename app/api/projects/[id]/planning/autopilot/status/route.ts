import { NextRequest, NextResponse } from 'next/server';
import { getAutopilotStatus } from '@/lib/autopilot-machine';
import { getAutopilotState } from '@/server/services/autopilot-store';

/**
 * GET /api/projects/[id]/planning/autopilot/status
 * Get current autopilot status for a session
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
    }

    const state = getAutopilotState(sessionId);
    if (!state) {
      return NextResponse.json({
        status: 'NOT_STARTED',
        progress: '0/0',
        totalBatches: 0,
      });
    }

    return NextResponse.json({
      sessionId,
      ...getAutopilotStatus(state),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
