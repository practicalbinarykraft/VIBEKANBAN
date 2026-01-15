/**
 * Autopilot Machine - state machine for multi-batch PR execution
 * Pure functions for state transitions, no side effects.
 */

import { Batch } from './backlog-chunker';

export type AutopilotStatus =
  | 'IDLE'
  | 'RUNNING'
  | 'WAITING_APPROVAL'
  | 'DONE'
  | 'FAILED';

export interface AutopilotState {
  status: AutopilotStatus;
  batches: Batch[];
  batchIndex?: number;
  error?: string;
}

export interface AutopilotStatusInfo {
  status: AutopilotStatus;
  currentBatch?: Batch;
  batchIndex?: number;
  totalBatches: number;
  progress: string;
  error?: string;
}

/**
 * Create initial autopilot state with batches
 */
export function createAutopilotState(batches: Batch[]): AutopilotState {
  return {
    status: 'IDLE',
    batches,
  };
}

/**
 * Start autopilot execution
 * Transitions: IDLE -> RUNNING (batchIndex 0)
 * Idempotent: if already running, returns same state
 */
export function startAutopilot(state: AutopilotState): AutopilotState {
  if (state.status === 'RUNNING' || state.status === 'WAITING_APPROVAL') {
    return state; // Already in progress
  }

  if (state.status === 'DONE') {
    return state; // Already complete
  }

  if (state.batches.length === 0) {
    return { ...state, status: 'DONE' };
  }

  return {
    ...state,
    status: 'RUNNING',
    batchIndex: 0,
  };
}

/**
 * Approve current batch and move to next
 * Transitions: WAITING_APPROVAL -> RUNNING (next batch) or DONE
 * Only works when in WAITING_APPROVAL state
 */
export function approveCurrentBatch(state: AutopilotState): AutopilotState {
  if (state.status !== 'WAITING_APPROVAL') {
    return state; // Can only approve when waiting
  }

  const currentIndex = state.batchIndex ?? 0;
  const nextIndex = currentIndex + 1;

  if (nextIndex >= state.batches.length) {
    // Last batch approved -> DONE
    return {
      ...state,
      status: 'DONE',
      batchIndex: undefined,
    };
  }

  // Move to next batch
  return {
    ...state,
    status: 'RUNNING',
    batchIndex: nextIndex,
  };
}

/**
 * Mark current batch as complete (waiting for approval)
 * Transitions: RUNNING -> WAITING_APPROVAL
 */
export function completeBatch(state: AutopilotState): AutopilotState {
  if (state.status !== 'RUNNING') {
    return state;
  }

  return {
    ...state,
    status: 'WAITING_APPROVAL',
  };
}

/**
 * Cancel autopilot execution
 * Transitions: RUNNING/WAITING_APPROVAL -> IDLE
 * DONE state is preserved
 */
export function cancelAutopilot(state: AutopilotState): AutopilotState {
  if (state.status === 'DONE' || state.status === 'IDLE') {
    return state;
  }

  return {
    ...state,
    status: 'IDLE',
    batchIndex: undefined,
  };
}

/**
 * Set error state
 */
export function failAutopilot(state: AutopilotState, error: string): AutopilotState {
  return {
    ...state,
    status: 'FAILED',
    error,
  };
}

/**
 * Get status info for UI display
 */
export function getAutopilotStatus(state: AutopilotState): AutopilotStatusInfo {
  const totalBatches = state.batches.length;
  const batchIndex = state.batchIndex;

  let progress: string;
  let currentBatch: Batch | undefined;

  if (state.status === 'IDLE') {
    progress = `0/${totalBatches}`;
  } else if (state.status === 'DONE') {
    progress = `${totalBatches}/${totalBatches}`;
  } else if (batchIndex !== undefined) {
    progress = `${batchIndex + 1}/${totalBatches}`;
    currentBatch = state.batches[batchIndex];
  } else {
    progress = `0/${totalBatches}`;
  }

  return {
    status: state.status,
    currentBatch,
    batchIndex,
    totalBatches,
    progress,
    error: state.error,
  };
}
