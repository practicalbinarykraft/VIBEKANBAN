/**
 * GET /api/projects/[id]/planning/autopilot/status (PR-76)
 * Returns autopilot status:
 * - With sessionId: session-based status (backward compat)
 * - Without sessionId: project-level derived status from DB
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAutopilotStatus } from '@/lib/autopilot-machine';
import { getAutopilotState } from '@/server/services/autopilot-store';
import { getDerivedAutopilotStatus } from '@/server/services/autopilot/derived-autopilot-status.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    // PR-76: If no sessionId, return project-level derived status
    if (!sessionId) {
      const derived = await getDerivedAutopilotStatus(projectId);
      return NextResponse.json({
        status: derived.status,
        runId: derived.runId,
        activeAttempts: derived.activeAttempts,
        failedAttempts: derived.failedAttempts,
        completedAttempts: derived.completedAttempts,
        // Default values for backward compat with AutopilotStatusInfo
        mode: 'OFF',
        progress: '0/0',
        totalBatches: 0,
        currentTaskIndex: 0,
        totalTasks: derived.activeAttempts + derived.completedAttempts + derived.failedAttempts,
        taskProgress: `${derived.completedAttempts}/${derived.activeAttempts + derived.completedAttempts + derived.failedAttempts}`,
        completedTasks: derived.completedAttempts,
      });
    }

    // Session-based status (backward compat)
    const state = await getAutopilotState(sessionId);
    if (!state) {
      return NextResponse.json({
        status: 'IDLE',
        mode: 'OFF',
        progress: '0/0',
        totalBatches: 0,
        currentTaskIndex: 0,
        totalTasks: 0,
        taskProgress: '0/0',
        completedTasks: 0,
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
