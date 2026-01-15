import { NextRequest, NextResponse } from 'next/server';
import { getAutopilotStatus, completeBatch } from '@/lib/autopilot-machine';
import { getAutopilotState, saveAutopilotState } from '@/server/services/autopilot-store';

// Track batch start times for simulation
const batchStartTimes = new Map<string, number>();
const BATCH_DURATION_MS = 3000; // Simulated batch execution time

/**
 * GET /api/projects/[id]/planning/autopilot/status
 * Get current autopilot status for a session
 *
 * In development/test mode, simulates batch completion after BATCH_DURATION_MS
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
    }

    let state = getAutopilotState(sessionId);
    if (!state) {
      return NextResponse.json({
        status: 'NOT_STARTED',
        progress: '0/0',
        totalBatches: 0,
      });
    }

    // Simulate batch completion (for dev/test mode)
    if (state.status === 'RUNNING' && state.batchIndex !== undefined) {
      const batchKey = `${sessionId}-${state.batchIndex}`;
      const startTime = batchStartTimes.get(batchKey);

      if (!startTime) {
        // Start tracking this batch
        batchStartTimes.set(batchKey, Date.now());
      } else if (Date.now() - startTime >= BATCH_DURATION_MS) {
        // Batch "completed" - transition to WAITING_APPROVAL
        state = completeBatch(state);
        saveAutopilotState(sessionId, state);
        batchStartTimes.delete(batchKey);
      }
    }

    return NextResponse.json({
      sessionId,
      ...getAutopilotStatus(state),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
