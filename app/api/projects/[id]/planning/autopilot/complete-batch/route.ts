import { NextRequest, NextResponse } from 'next/server';
import { completeBatch, getAutopilotStatus } from '@/lib/autopilot-machine';
import { getAutopilotState, saveAutopilotState } from '@/server/services/autopilot-store';

/**
 * POST /api/projects/[id]/planning/autopilot/complete-batch
 * Mark current batch as complete, transition to WAITING_APPROVAL
 *
 * RESTRICTED: Only available in test mode (NODE_ENV=test or x-vibe-test header)
 */
export async function POST(request: NextRequest) {
  // Guard: test-only endpoint
  const isTestEnv = process.env.NODE_ENV === 'test';
  const hasTestHeader = request.headers.get('x-vibe-test') === '1';
  if (!isTestEnv && !hasTestHeader) {
    return NextResponse.json({ error: 'Endpoint only available in test mode' }, { status: 403 });
  }

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
