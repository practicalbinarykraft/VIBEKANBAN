/**
 * Unit tests for planning-session-store (DB-backed)
 *
 * Tests:
 * - createSession stores in DB
 * - getSession retrieves from DB
 * - updateSessionResult stores productResult
 * - markSessionApplied stores appliedTaskIds
 * - isSessionApplied returns correct status
 * - getAppliedTaskIds returns stored IDs
 * - Idempotency: second markSessionApplied is no-op
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { db, initDB } from '@/server/db';
import { projects } from '@/server/db/schema';
import {
  createSession,
  getSession,
  updateSessionResult,
  markSessionApplied,
  isSessionApplied,
  getAppliedTaskIds,
} from '../planning-session-store';

describe('planning-session-store', () => {
  const projectId = 'test-project-store';
  const ideaText = 'Build a todo app';

  // Initialize DB and create test project once before all tests
  beforeAll(async () => {
    initDB();
    // Create test project for FK constraint
    try {
      await db.insert(projects).values({
        id: projectId,
        name: 'Test Project',
        gitUrl: 'https://example.com/test',
        defaultBranch: 'main',
      });
    } catch {
      // Project may already exist from previous run
    }
  });

  describe('createSession', () => {
    it('creates session and returns sessionId', async () => {
      const sessionId = await createSession(projectId, ideaText);

      expect(sessionId).toBeTruthy();
      expect(typeof sessionId).toBe('string');
    });

    it('creates session with DISCUSSION status', async () => {
      const sessionId = await createSession(projectId, ideaText);
      const session = await getSession(sessionId);

      expect(session?.status).toBe('DISCUSSION');
    });

    it('stores ideaText correctly', async () => {
      const sessionId = await createSession(projectId, ideaText);
      const session = await getSession(sessionId);

      expect(session?.ideaText).toBe(ideaText);
    });

    it('stores projectId correctly', async () => {
      const sessionId = await createSession(projectId, ideaText);
      const session = await getSession(sessionId);

      expect(session?.projectId).toBe(projectId);
    });
  });

  describe('getSession', () => {
    it('returns undefined for non-existent session', async () => {
      const session = await getSession('non-existent-id');

      expect(session).toBeUndefined();
    });

    it('returns session data for existing session', async () => {
      const sessionId = await createSession(projectId, ideaText);
      const session = await getSession(sessionId);

      expect(session).toBeDefined();
      expect(session?.id).toBe(sessionId);
    });
  });

  describe('updateSessionResult', () => {
    it('stores productResult in session', async () => {
      const sessionId = await createSession(projectId, ideaText);
      const productResult = {
        mode: 'PLAN' as const,
        steps: [{ title: 'Step 1', tasks: ['Task A'] }],
      };

      await updateSessionResult(sessionId, productResult);
      const session = await getSession(sessionId);

      expect(session?.productResult).toEqual(productResult);
    });

    it('sets status to RESULT_READY for PLAN mode', async () => {
      const sessionId = await createSession(projectId, ideaText);
      const productResult = {
        mode: 'PLAN' as const,
        steps: [{ title: 'Step 1', tasks: ['Task A'] }],
      };

      await updateSessionResult(sessionId, productResult);
      const session = await getSession(sessionId);

      expect(session?.status).toBe('RESULT_READY');
    });

    it('keeps status as DISCUSSION for QUESTIONS mode', async () => {
      const sessionId = await createSession(projectId, ideaText);
      const productResult = {
        mode: 'QUESTIONS' as const,
        questions: ['Question 1?', 'Question 2?'],
      };

      await updateSessionResult(sessionId, productResult);
      const session = await getSession(sessionId);

      expect(session?.status).toBe('DISCUSSION');
    });

    it('returns false for non-existent session', async () => {
      const result = await updateSessionResult('non-existent', {
        mode: 'PLAN',
        steps: [],
      });

      expect(result).toBe(false);
    });
  });

  describe('markSessionApplied', () => {
    it('stores appliedTaskIds', async () => {
      const sessionId = await createSession(projectId, ideaText);
      await updateSessionResult(sessionId, {
        mode: 'PLAN',
        steps: [{ title: 'Step', tasks: ['Task'] }],
      });
      const taskIds = ['task-1', 'task-2'];

      await markSessionApplied(sessionId, taskIds);
      const stored = await getAppliedTaskIds(sessionId);

      expect(stored).toEqual(taskIds);
    });

    it('sets status to APPLIED', async () => {
      const sessionId = await createSession(projectId, ideaText);
      await updateSessionResult(sessionId, {
        mode: 'PLAN',
        steps: [{ title: 'Step', tasks: ['Task'] }],
      });

      await markSessionApplied(sessionId, ['task-1']);
      const session = await getSession(sessionId);

      expect(session?.status).toBe('APPLIED');
    });

    it('returns false for non-existent session', async () => {
      const result = await markSessionApplied('non-existent', ['task-1']);

      expect(result).toBe(false);
    });
  });

  describe('isSessionApplied', () => {
    it('returns false before marking', async () => {
      const sessionId = await createSession(projectId, ideaText);

      const applied = await isSessionApplied(sessionId);

      expect(applied).toBe(false);
    });

    it('returns true after marking', async () => {
      const sessionId = await createSession(projectId, ideaText);
      await updateSessionResult(sessionId, {
        mode: 'PLAN',
        steps: [{ title: 'Step', tasks: ['Task'] }],
      });
      await markSessionApplied(sessionId, ['task-1']);

      const applied = await isSessionApplied(sessionId);

      expect(applied).toBe(true);
    });

    it('returns false for non-existent session', async () => {
      const applied = await isSessionApplied('non-existent');

      expect(applied).toBe(false);
    });
  });

  describe('getAppliedTaskIds', () => {
    it('returns undefined before marking', async () => {
      const sessionId = await createSession(projectId, ideaText);

      const taskIds = await getAppliedTaskIds(sessionId);

      expect(taskIds).toBeUndefined();
    });

    it('returns taskIds after marking', async () => {
      const sessionId = await createSession(projectId, ideaText);
      await updateSessionResult(sessionId, {
        mode: 'PLAN',
        steps: [{ title: 'Step', tasks: ['Task'] }],
      });
      const expected = ['task-1', 'task-2', 'task-3'];

      await markSessionApplied(sessionId, expected);
      const taskIds = await getAppliedTaskIds(sessionId);

      expect(taskIds).toEqual(expected);
    });
  });

  describe('idempotency', () => {
    it('second markSessionApplied does not change taskIds', async () => {
      const sessionId = await createSession(projectId, ideaText);
      await updateSessionResult(sessionId, {
        mode: 'PLAN',
        steps: [{ title: 'Step', tasks: ['Task'] }],
      });
      const firstTaskIds = ['task-1', 'task-2'];
      const secondTaskIds = ['task-3', 'task-4'];

      await markSessionApplied(sessionId, firstTaskIds);
      await markSessionApplied(sessionId, secondTaskIds);

      const stored = await getAppliedTaskIds(sessionId);
      expect(stored).toEqual(firstTaskIds);
    });

    it('second markSessionApplied returns true (success, but no-op)', async () => {
      const sessionId = await createSession(projectId, ideaText);
      await updateSessionResult(sessionId, {
        mode: 'PLAN',
        steps: [{ title: 'Step', tasks: ['Task'] }],
      });

      await markSessionApplied(sessionId, ['task-1']);
      const result = await markSessionApplied(sessionId, ['task-2']);

      expect(result).toBe(true);
    });
  });
});
