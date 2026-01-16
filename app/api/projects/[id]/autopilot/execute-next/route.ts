import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/db';
import { tasks, attempts, projects } from '@/server/db/schema';
import { eq, inArray } from 'drizzle-orm';
import {
  getAutopilotStatus,
  startTask,
  completeTask,
  pauseAutopilot,
  failAutopilot,
} from '@/lib/autopilot-machine';
import { getAutopilotState, saveAutopilotState } from '@/server/services/autopilot-store';
import { runSafetyChecks } from '@/lib/autopilot-safety';

/**
 * POST /api/projects/[id]/autopilot/execute-next
 * Execute the next task in autopilot queue
 *
 * Called by:
 * - UI when starting/resuming autopilot
 * - Webhook when previous task completes (AUTO mode)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
    }

    // Get autopilot state
    let state = await getAutopilotState(sessionId);
    if (!state) {
      return NextResponse.json({ error: 'Autopilot not initialized' }, { status: 404 });
    }

    if (state.status !== 'RUNNING') {
      return NextResponse.json({
        error: `Cannot execute: autopilot is ${state.status}`,
        ...getAutopilotStatus(state),
      }, { status: 400 });
    }

    // Safety checks before execution
    const safetyResult = await runSafetyChecks(projectId);
    if (!safetyResult.ok) {
      state = pauseAutopilot(state, safetyResult.reason!);
      await saveAutopilotState(sessionId, state);
      return NextResponse.json({
        error: safetyResult.reason,
        code: safetyResult.code,
        ...getAutopilotStatus(state),
      }, { status: 400 });
    }

    // Get current task
    const taskId = state.taskQueue[state.currentTaskIndex];
    if (!taskId) {
      return NextResponse.json({ error: 'No task to execute' }, { status: 400 });
    }

    // Start task execution via /api/tasks/[id]/run
    const runResponse = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/tasks/${taskId}/run`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Forward cookies for auth
          cookie: request.headers.get('cookie') || '',
        },
      }
    );

    const runResult = await runResponse.json();

    if (!runResponse.ok) {
      state = failAutopilot(state, runResult.error || 'Failed to start task');
      await saveAutopilotState(sessionId, state);
      return NextResponse.json({
        error: runResult.error,
        ...getAutopilotStatus(state),
      }, { status: 500 });
    }

    // Update state with attemptId
    state = startTask(state, runResult.attemptId);
    await saveAutopilotState(sessionId, state);

    return NextResponse.json({
      success: true,
      attemptId: runResult.attemptId,
      taskId,
      ...getAutopilotStatus(state),
    });
  } catch (error: any) {
    console.error('[Autopilot] Execute error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
