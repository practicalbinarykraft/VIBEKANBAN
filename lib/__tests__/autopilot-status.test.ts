/** Autopilot Machine Tests - status info and full flow */
import { describe, it, expect } from 'vitest';
import {
  createAutopilotState,
  startAutopilot,
  approveCurrentBatch,
  getAutopilotStatus,
  AutopilotState,
} from '../autopilot-machine';
import { Batch } from '../backlog-chunker';

const sampleBatches: Batch[] = [
  { batchId: 'batch-001', title: 'Setup (1/3)', tasks: ['T1', 'T2', 'T3'], rationale: 'Setup', risk: 'low' },
  { batchId: 'batch-002', title: 'Core (2/3)', tasks: ['T4', 'T5', 'T6'], rationale: 'Core', risk: 'med' },
  { batchId: 'batch-003', title: 'Deploy (3/3)', tasks: ['T7', 'T8'], rationale: 'Deploy', risk: 'high' },
];

describe('getAutopilotStatus', () => {
  it('should return current batch info when RUNNING', () => {
    let state = createAutopilotState(sampleBatches);
    state = startAutopilot(state);

    const status = getAutopilotStatus(state);
    expect(status.status).toBe('RUNNING');
    expect(status.currentBatch).toEqual(sampleBatches[0]);
    expect(status.progress).toBe('1/3');
    expect(status.totalBatches).toBe(3);
  });

  it('should return progress info when WAITING_APPROVAL', () => {
    let state = createAutopilotState(sampleBatches);
    state = { ...startAutopilot(state), status: 'WAITING_APPROVAL' as const, batchIndex: 1 };

    const status = getAutopilotStatus(state);
    expect(status.status).toBe('WAITING_APPROVAL');
    expect(status.currentBatch).toEqual(sampleBatches[1]);
    expect(status.progress).toBe('2/3');
  });

  it('should return no currentBatch when IDLE', () => {
    const state = createAutopilotState(sampleBatches);
    const status = getAutopilotStatus(state);

    expect(status.status).toBe('IDLE');
    expect(status.currentBatch).toBeUndefined();
    expect(status.progress).toBe('0/3');
  });

  it('should return complete info when DONE', () => {
    const state: AutopilotState = {
      status: 'DONE',
      batches: sampleBatches,
    };

    const status = getAutopilotStatus(state);
    expect(status.status).toBe('DONE');
    expect(status.progress).toBe('3/3');
  });
});

describe('state machine full flow', () => {
  it('should complete: IDLE -> RUNNING -> WAITING -> RUNNING -> ... -> DONE', () => {
    let state = createAutopilotState(sampleBatches);
    expect(state.status).toBe('IDLE');

    // Start
    state = startAutopilot(state);
    expect(state.status).toBe('RUNNING');
    expect(state.batchIndex).toBe(0);

    // Complete batch 1, waiting approval
    state = { ...state, status: 'WAITING_APPROVAL' as const };
    expect(state.status).toBe('WAITING_APPROVAL');

    // Approve batch 1
    state = approveCurrentBatch(state);
    expect(state.status).toBe('RUNNING');
    expect(state.batchIndex).toBe(1);

    // Complete batch 2, waiting approval
    state = { ...state, status: 'WAITING_APPROVAL' as const };

    // Approve batch 2
    state = approveCurrentBatch(state);
    expect(state.status).toBe('RUNNING');
    expect(state.batchIndex).toBe(2);

    // Complete batch 3, waiting approval (last one)
    state = { ...state, status: 'WAITING_APPROVAL' as const };

    // Approve batch 3 -> DONE
    state = approveCurrentBatch(state);
    expect(state.status).toBe('DONE');
  });
});
