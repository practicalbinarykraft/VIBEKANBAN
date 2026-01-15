/** Autopilot Machine Tests - state machine for multi-batch execution */
import { describe, it, expect } from 'vitest';
import { createAutopilotState, startAutopilot, approveCurrentBatch, cancelAutopilot,
  getAutopilotStatus, AutopilotState } from '../autopilot-machine';
import { Batch } from '../backlog-chunker';

const sampleBatches: Batch[] = [
  { batchId: 'batch-001', title: 'Setup (1/3)', tasks: ['T1', 'T2', 'T3'], rationale: 'Setup', risk: 'low' },
  { batchId: 'batch-002', title: 'Core (2/3)', tasks: ['T4', 'T5', 'T6'], rationale: 'Core', risk: 'med' },
  { batchId: 'batch-003', title: 'Deploy (3/3)', tasks: ['T7', 'T8'], rationale: 'Deploy', risk: 'high' },
];

describe('createAutopilotState', () => {
  it('should create IDLE state with batches', () => {
    const state = createAutopilotState(sampleBatches);
    expect(state.status).toBe('IDLE');
    expect(state.batches).toEqual(sampleBatches);
    expect(state.batchIndex).toBeUndefined();
  });

  it('should handle empty batches', () => {
    const state = createAutopilotState([]);
    expect(state.status).toBe('IDLE');
    expect(state.batches).toEqual([]);
  });
});

describe('startAutopilot', () => {
  it('should transition from IDLE to RUNNING with batchIndex 0', () => {
    const state = createAutopilotState(sampleBatches);
    const newState = startAutopilot(state);

    expect(newState.status).toBe('RUNNING');
    expect(newState.batchIndex).toBe(0);
  });

  it('should return same state if already RUNNING (idempotent)', () => {
    const state = createAutopilotState(sampleBatches);
    const running = startAutopilot(state);
    const running2 = startAutopilot(running);

    expect(running2).toEqual(running);
    expect(running2.batchIndex).toBe(0);
  });

  it('should return DONE immediately if no batches', () => {
    const state = createAutopilotState([]);
    const newState = startAutopilot(state);

    expect(newState.status).toBe('DONE');
  });
});

describe('approveCurrentBatch', () => {
  it('should transition RUNNING -> WAITING_APPROVAL', () => {
    let state = createAutopilotState(sampleBatches);
    state = startAutopilot(state);

    // Simulate batch execution complete, now waiting for approval
    const waiting = { ...state, status: 'WAITING_APPROVAL' as const };
    expect(waiting.status).toBe('WAITING_APPROVAL');
    expect(waiting.batchIndex).toBe(0);
  });

  it('should transition WAITING_APPROVAL -> RUNNING(next) on approve', () => {
    let state = createAutopilotState(sampleBatches);
    state = startAutopilot(state);
    state = { ...state, status: 'WAITING_APPROVAL' as const };

    const newState = approveCurrentBatch(state);
    expect(newState.status).toBe('RUNNING');
    expect(newState.batchIndex).toBe(1);
  });

  it('should transition to DONE when approving last batch', () => {
    let state = createAutopilotState(sampleBatches);
    state = startAutopilot(state);
    state = { ...state, status: 'WAITING_APPROVAL' as const, batchIndex: 2 };

    const newState = approveCurrentBatch(state);
    expect(newState.status).toBe('DONE');
  });

  it('should be idempotent - approve twice does not skip batches', () => {
    let state = createAutopilotState(sampleBatches);
    state = startAutopilot(state);
    state = { ...state, status: 'WAITING_APPROVAL' as const };

    const after1 = approveCurrentBatch(state);
    // Second approve on same state should not skip
    const after2 = approveCurrentBatch(state);

    expect(after1.batchIndex).toBe(1);
    expect(after2.batchIndex).toBe(1);
  });

  it('should not change state if RUNNING (not waiting)', () => {
    let state = createAutopilotState(sampleBatches);
    state = startAutopilot(state);

    const newState = approveCurrentBatch(state);
    expect(newState).toEqual(state); // No change
  });
});

describe('cancelAutopilot', () => {
  it('should transition to IDLE from RUNNING', () => {
    let state = createAutopilotState(sampleBatches);
    state = startAutopilot(state);

    const newState = cancelAutopilot(state);
    expect(newState.status).toBe('IDLE');
    expect(newState.batchIndex).toBeUndefined();
  });

  it('should transition to IDLE from WAITING_APPROVAL', () => {
    let state = createAutopilotState(sampleBatches);
    state = { ...startAutopilot(state), status: 'WAITING_APPROVAL' as const };

    const newState = cancelAutopilot(state);
    expect(newState.status).toBe('IDLE');
  });

  it('should keep DONE state unchanged', () => {
    const state: AutopilotState = {
      status: 'DONE',
      batches: sampleBatches,
    };

    const newState = cancelAutopilot(state);
    expect(newState.status).toBe('DONE');
  });
});

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

describe('state machine transitions', () => {
  it('should complete full flow: IDLE -> RUNNING -> WAITING -> RUNNING -> ... -> DONE', () => {
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
