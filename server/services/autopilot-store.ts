/**
 * Autopilot Store - DB-backed persistence for multi-batch autopilot state
 *
 * Uses planning_sessions table with autopilot_state column.
 * Single responsibility: autopilot state CRUD by sessionId.
 */

import { db } from '@/server/db';
import { planningSessions } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { AutopilotState } from '@/lib/autopilot-machine';
import { Batch } from '@/lib/backlog-chunker';

/**
 * Get autopilot state for a session
 */
export async function getAutopilotState(sessionId: string): Promise<AutopilotState | undefined> {
  const rows = await db
    .select({ autopilotState: planningSessions.autopilotState })
    .from(planningSessions)
    .where(eq(planningSessions.id, sessionId))
    .limit(1);

  if (rows.length === 0 || !rows[0].autopilotState) {
    return undefined;
  }

  return JSON.parse(rows[0].autopilotState) as AutopilotState;
}

/**
 * Save autopilot state for a session
 */
export async function saveAutopilotState(sessionId: string, state: AutopilotState): Promise<void> {
  await db
    .update(planningSessions)
    .set({
      autopilotState: JSON.stringify(state),
      updatedAt: new Date(),
    })
    .where(eq(planningSessions.id, sessionId));
}

/**
 * Initialize autopilot state with batches and task queue (if not exists)
 * Returns existing state if already initialized (idempotent)
 */
export async function initAutopilotState(
  sessionId: string,
  batches: Batch[],
  taskIds?: string[]
): Promise<AutopilotState> {
  const existing = await getAutopilotState(sessionId);
  if (existing) return existing;

  // Extract task IDs from batches if not provided
  const queue = taskIds || batches.flatMap(b => b.tasks);

  const state: AutopilotState = {
    status: 'IDLE',
    mode: 'OFF',
    batches,
    taskQueue: queue,
    currentTaskIndex: 0,
    completedTasks: [],
    openPrCount: 0,
  };

  await saveAutopilotState(sessionId, state);
  return state;
}

/**
 * Delete autopilot state for a session
 */
export async function deleteAutopilotState(sessionId: string): Promise<void> {
  await db
    .update(planningSessions)
    .set({
      autopilotState: null,
      updatedAt: new Date(),
    })
    .where(eq(planningSessions.id, sessionId));
}
