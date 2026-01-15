/**
 * Autopilot Store - persistence for multi-batch autopilot state
 * Uses in-memory map keyed by sessionId. Can be extended to DB later.
 */

import { AutopilotState } from '@/lib/autopilot-machine';
import { Batch } from '@/lib/backlog-chunker';

// In-memory store (per-process, cleared on restart)
const autopilotStates = new Map<string, AutopilotState>();

/**
 * Get autopilot state for a session
 */
export function getAutopilotState(sessionId: string): AutopilotState | undefined {
  return autopilotStates.get(sessionId);
}

/**
 * Save autopilot state for a session
 */
export function saveAutopilotState(sessionId: string, state: AutopilotState): void {
  autopilotStates.set(sessionId, state);
}

/**
 * Delete autopilot state for a session
 */
export function deleteAutopilotState(sessionId: string): void {
  autopilotStates.delete(sessionId);
}

/**
 * Initialize autopilot state with batches (if not exists)
 * Returns existing state if already initialized (idempotent)
 */
export function initAutopilotState(sessionId: string, batches: Batch[]): AutopilotState {
  const existing = autopilotStates.get(sessionId);
  if (existing) return existing;

  const state: AutopilotState = {
    status: 'IDLE',
    batches,
  };
  autopilotStates.set(sessionId, state);
  return state;
}

/**
 * Clear all states (for testing)
 */
export function clearAllAutopilotStates(): void {
  autopilotStates.clear();
}
