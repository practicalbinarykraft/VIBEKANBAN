import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/db';
import { tasks } from '@/server/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { getSession } from '@/server/services/planning-session-store';
import { chunkBacklog } from '@/lib/backlog-chunker';
import {
  createAutopilotState,
  startAutopilot,
  getAutopilotStatus,
  AutopilotMode,
} from '@/lib/autopilot-machine';
import { getAutopilotState, saveAutopilotState, initAutopilotState } from '@/server/services/autopilot-store';
import { runSafetyChecks } from '@/lib/autopilot-safety';

/**
 * POST /api/projects/[id]/planning/autopilot/start
 * Start autopilot execution for a planning session
 *
 * Body: { sessionId, mode?: 'STEP' | 'AUTO', taskIds?: string[] }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const { sessionId, mode, taskIds } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
    }

    // Safety checks
    const safetyResult = await runSafetyChecks(projectId);
    if (!safetyResult.ok) {
      return NextResponse.json({
        error: safetyResult.reason,
        code: safetyResult.code,
      }, { status: 400 });
    }

    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Get task IDs - either from body or from session plan
    let queue: string[] = taskIds || [];

    if (queue.length === 0 && session.productResult?.planSteps) {
      // Get tasks from DB that match plan step titles
      // planSteps is string[] - each string is a task title
      const planTitles = session.productResult.planSteps;
      const matchingTasks = await db
        .select({ id: tasks.id, title: tasks.title })
        .from(tasks)
        .where(
          and(
            eq(tasks.projectId, projectId),
            inArray(tasks.status, ['todo', 'in_progress'])
          )
        );

      // Match by title (simple matching)
      queue = matchingTasks
        .filter(t => planTitles.some(pt => t.title.includes(pt) || pt.includes(t.title)))
        .map(t => t.id);

      // Fallback: if no matches, use all todo tasks
      if (queue.length === 0) {
        queue = matchingTasks.map(t => t.id);
      }
    }

    // Check for existing state (idempotent)
    let state = await getAutopilotState(sessionId);
    if (!state) {
      const batches = session.productResult?.planSteps
        ? chunkBacklog(session.productResult.planSteps)
        : [];
      state = await initAutopilotState(sessionId, batches, queue);
    }

    // Start with specified mode
    const autopilotMode: AutopilotMode = mode === 'STEP' ? 'STEP' : 'AUTO';
    state = startAutopilot(state, autopilotMode);
    await saveAutopilotState(sessionId, state);

    return NextResponse.json({
      success: true,
      sessionId,
      ...getAutopilotStatus(state),
    });
  } catch (error: any) {
    console.error('[Autopilot] Start error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
