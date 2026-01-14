/**
 * Unit tests for planning-sessions idempotent apply
 *
 * Tests:
 * - markSessionApplied stores taskIds
 * - isSessionApplied returns true after marking
 * - getAppliedTaskIds returns stored taskIds
 * - Second markSessionApplied is no-op (idempotent)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  storeSession,
  getSession,
  updateSessionResult,
  markSessionApplied,
  isSessionApplied,
  getAppliedTaskIds,
} from '../planning-sessions';

describe('planning-sessions idempotent apply', () => {
  const sessionId = 'test-session-123';
  const taskIds = ['task-1', 'task-2', 'task-3'];

  beforeEach(() => {
    // Create a fresh session for each test
    storeSession(sessionId, 'Test idea');
    updateSessionResult(sessionId, {
      mode: 'PLAN',
      steps: [{ title: 'Step 1', tasks: ['Task A', 'Task B'] }],
    });
  });

  describe('markSessionApplied', () => {
    it('stores taskIds in session', () => {
      markSessionApplied(sessionId, taskIds);

      const session = getSession(sessionId);
      expect(session?.appliedTaskIds).toEqual(taskIds);
    });

    it('sets applied flag to true', () => {
      markSessionApplied(sessionId, taskIds);

      const session = getSession(sessionId);
      expect(session?.applied).toBe(true);
    });

    it('returns false for non-existent session', () => {
      const result = markSessionApplied('non-existent', taskIds);

      expect(result).toBe(false);
    });

    it('returns true for existing session', () => {
      const result = markSessionApplied(sessionId, taskIds);

      expect(result).toBe(true);
    });
  });

  describe('isSessionApplied', () => {
    it('returns false before marking', () => {
      expect(isSessionApplied(sessionId)).toBe(false);
    });

    it('returns true after marking', () => {
      markSessionApplied(sessionId, taskIds);

      expect(isSessionApplied(sessionId)).toBe(true);
    });

    it('returns false for non-existent session', () => {
      expect(isSessionApplied('non-existent')).toBe(false);
    });
  });

  describe('getAppliedTaskIds', () => {
    it('returns undefined before marking', () => {
      expect(getAppliedTaskIds(sessionId)).toBeUndefined();
    });

    it('returns taskIds after marking', () => {
      markSessionApplied(sessionId, taskIds);

      expect(getAppliedTaskIds(sessionId)).toEqual(taskIds);
    });

    it('returns undefined for non-existent session', () => {
      expect(getAppliedTaskIds('non-existent')).toBeUndefined();
    });
  });

  describe('idempotency', () => {
    it('second markSessionApplied does not change taskIds', () => {
      markSessionApplied(sessionId, taskIds);
      const newTaskIds = ['new-task-1', 'new-task-2'];

      // Second call should be no-op
      markSessionApplied(sessionId, newTaskIds);

      expect(getAppliedTaskIds(sessionId)).toEqual(taskIds);
    });

    it('second markSessionApplied returns true (success, but no-op)', () => {
      markSessionApplied(sessionId, taskIds);

      const result = markSessionApplied(sessionId, ['new-task']);

      expect(result).toBe(true);
    });
  });
});
