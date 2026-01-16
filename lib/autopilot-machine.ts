/**
 * Autopilot Machine - state machine for sequential task execution
 * Pure functions for state transitions, no side effects.
 *
 * Modes:
 * - OFF: Autopilot disabled (default)
 * - STEP: Execute one task then pause
 * - AUTO: Execute all tasks sequentially until done or error
 */

import { Batch } from './backlog-chunker';

export type AutopilotMode = 'OFF' | 'STEP' | 'AUTO';

export type AutopilotStatus =
  | 'IDLE'
  | 'RUNNING'
  | 'PAUSED'
  | 'WAITING_APPROVAL'
  | 'DONE'
  | 'FAILED';

export interface TaskExecution {
  taskId: string;
  attemptId?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
}

export interface AutopilotState {
  status: AutopilotStatus;
  mode: AutopilotMode;
  batches: Batch[];
  batchIndex?: number;
  // Task-level tracking for sequential execution
  taskQueue: string[]; // Task IDs to execute
  currentTaskIndex: number;
  currentAttemptId?: string;
  completedTasks: string[];
  // Safety
  openPrCount: number;
  pauseReason?: string;
  error?: string;
}

export interface AutopilotStatusInfo {
  status: AutopilotStatus;
  mode: AutopilotMode;
  currentBatch?: Batch;
  batchIndex?: number;
  totalBatches: number;
  progress: string;
  // Task-level info
  currentTaskId?: string;
  currentTaskIndex: number;
  totalTasks: number;
  taskProgress: string;
  completedTasks: number;
  pauseReason?: string;
  error?: string;
}

/**
 * Create initial autopilot state with batches and task queue
 */
export function createAutopilotState(batches: Batch[], taskIds?: string[]): AutopilotState {
  // Extract task IDs from batches if not provided
  const queue = taskIds || batches.flatMap(b => b.tasks);
  return {
    status: 'IDLE',
    mode: 'OFF',
    batches,
    taskQueue: queue,
    currentTaskIndex: 0,
    completedTasks: [],
    openPrCount: 0,
  };
}

/**
 * Set autopilot mode
 */
export function setAutopilotMode(state: AutopilotState, mode: AutopilotMode): AutopilotState {
  if (state.status === 'RUNNING') {
    return state; // Can't change mode while running
  }
  return { ...state, mode };
}

/**
 * Start autopilot execution with specified mode
 * Transitions: IDLE/PAUSED -> RUNNING
 */
export function startAutopilot(state: AutopilotState, mode?: AutopilotMode): AutopilotState {
  if (state.status === 'RUNNING') {
    return state; // Already running
  }

  if (state.status === 'DONE') {
    return state; // Already complete
  }

  // Determine mode: use param, or state mode if not OFF, otherwise default to AUTO
  const newMode = mode || (state.mode !== 'OFF' ? state.mode : 'AUTO');
  if (newMode === 'OFF') {
    return state; // Can't start in OFF mode
  }

  if (state.taskQueue.length === 0) {
    return { ...state, status: 'DONE', mode: newMode };
  }

  // Resume from where we left off or start fresh
  const taskIndex = state.currentTaskIndex < state.taskQueue.length
    ? state.currentTaskIndex
    : 0;

  return {
    ...state,
    status: 'RUNNING',
    mode: newMode,
    currentTaskIndex: taskIndex,
    batchIndex: 0,
    pauseReason: undefined,
    error: undefined,
  };
}

/**
 * Mark current task as started with attemptId
 */
export function startTask(state: AutopilotState, attemptId: string): AutopilotState {
  if (state.status !== 'RUNNING') {
    return state;
  }
  return {
    ...state,
    currentAttemptId: attemptId,
  };
}

/**
 * Mark current task as completed and advance
 * In STEP mode: pause after completion
 * In AUTO mode: continue to next task
 */
export function completeTask(state: AutopilotState): AutopilotState {
  if (state.status !== 'RUNNING') {
    return state;
  }

  const currentTaskId = state.taskQueue[state.currentTaskIndex];
  const newCompleted = [...state.completedTasks, currentTaskId];
  const nextIndex = state.currentTaskIndex + 1;
  const allDone = nextIndex >= state.taskQueue.length;

  if (allDone) {
    return {
      ...state,
      status: 'DONE',
      completedTasks: newCompleted,
      currentAttemptId: undefined,
    };
  }

  // STEP mode: pause after each task
  if (state.mode === 'STEP') {
    return {
      ...state,
      status: 'PAUSED',
      currentTaskIndex: nextIndex,
      completedTasks: newCompleted,
      currentAttemptId: undefined,
      pauseReason: 'Step completed. Click "Run Next" to continue.',
    };
  }

  // AUTO mode: continue to next
  return {
    ...state,
    currentTaskIndex: nextIndex,
    completedTasks: newCompleted,
    currentAttemptId: undefined,
  };
}

/**
 * Pause autopilot with reason
 */
export function pauseAutopilot(state: AutopilotState, reason: string): AutopilotState {
  if (state.status !== 'RUNNING') {
    return state;
  }
  return {
    ...state,
    status: 'PAUSED',
    pauseReason: reason,
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
  const totalBatches = state.batches?.length ?? 0;
  const batchIndex = state.batchIndex;
  const taskQueue = state.taskQueue ?? [];
  const totalTasks = taskQueue.length;
  const currentTaskIndex = state.currentTaskIndex ?? 0;

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

  const completedTasks = state.completedTasks ?? [];
  const taskProgress = `${completedTasks.length}/${totalTasks}`;
  const currentTaskId = taskQueue[currentTaskIndex];

  return {
    status: state.status,
    mode: state.mode,
    currentBatch,
    batchIndex,
    totalBatches,
    progress,
    currentTaskId,
    currentTaskIndex,
    totalTasks,
    taskProgress,
    completedTasks: completedTasks.length,
    pauseReason: state.pauseReason,
    error: state.error,
  };
}
