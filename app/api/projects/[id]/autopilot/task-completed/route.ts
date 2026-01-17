import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/db';
import { tasks, attempts } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import {
  getAutopilotStatus,
  completeTask,
  failAutopilot,
} from '@/lib/autopilot-machine';
import { getAutopilotState, saveAutopilotState } from '@/server/services/autopilot-store';

/**
 * POST /api/projects/[id]/autopilot/task-completed
 * Called when a task attempt completes (success or failure)
 * Handles state transitions and triggers next task in AUTO mode
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const { sessionId, attemptId, success, error } = body;

    if (!sessionId || !attemptId) {
      return NextResponse.json({ error: 'sessionId and attemptId required' }, { status: 400 });
    }

    // Get autopilot state
    let state = await getAutopilotState(sessionId);
    if (!state) {
      return NextResponse.json({ error: 'Autopilot not found' }, { status: 404 });
    }

    // Verify this is the current attempt
    if (state.currentAttemptId !== attemptId) {
      // Ignore - this completion is not for current task
      return NextResponse.json({ ignored: true, reason: 'Not current attempt' });
    }

    if (!success) {
      // Task failed - pause autopilot
      state = failAutopilot(state, error || 'Task execution failed');
      await saveAutopilotState(sessionId, state);
      return NextResponse.json({
        success: false,
        ...getAutopilotStatus(state),
      });
    }

    // Task succeeded - advance state
    state = completeTask(state);
    await saveAutopilotState(sessionId, state);

    const statusInfo = getAutopilotStatus(state);

    // In AUTO mode, if still RUNNING, trigger next task
    if (state.status === 'RUNNING' && state.mode === 'AUTO') {
      // Fire and forget - trigger next execution
      fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/projects/${projectId}/autopilot/execute-next`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: request.headers.get('cookie') || '',
          },
          body: JSON.stringify({ sessionId }),
        }
      ).catch(err => console.error('[Autopilot] Failed to trigger next:', err));
    }

    return NextResponse.json({
      success: true,
      ...statusInfo,
    });
  } catch (error: any) {
    console.error('[Autopilot] Task completed error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
