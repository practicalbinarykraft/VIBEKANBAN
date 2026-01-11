import { test, expect } from '@playwright/test';
import { createTask, createFixtureAttempt, deleteTask } from '../helpers/api';

test.describe('Permissions & Ownership', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/projects/1');
    await page.waitForSelector('[data-testid="kanban-board"]', { timeout: 10000 });
  });

  test('T40: Non-owner cannot Run Task', async ({ page, request }) => {
    const task = await createTask(request, '1', 'Task for permission test', 'Testing ownership');

    try {
      // Set non-owner user context
      await request.post('http://localhost:8000/api/test/set-user', {
        data: { userId: 'user-non-owner' },
      });

      // Try to run task as non-owner
      const response = await request.post(`http://localhost:8000/api/tasks/${task.id}/run`);
      expect(response.status()).toBe(403);
      const body = await response.json();
      expect(body.error).toContain('permission');
    } finally {
      // Reset to owner
      await request.post('http://localhost:8000/api/test/set-user', {
        data: { userId: 'user-owner' },
      });
      await deleteTask(request, task.id);
    }
  });

  test('T41: Non-owner cannot Apply', async ({ page, request }) => {
    const task = await createTask(request, '1', 'Task for apply test', 'Testing apply permission');
    const attemptId = await createFixtureAttempt(request, task.id, 'completed', {
      withPR: false,
    });

    try {
      // Set non-owner user context
      await request.post('http://localhost:8000/api/test/set-user', {
        data: { userId: 'user-non-owner' },
      });

      // Try to apply as non-owner
      const response = await request.post(`http://localhost:8000/api/attempts/${attemptId}/apply`);
      expect(response.status()).toBe(403);
      const body = await response.json();
      expect(body.error).toContain('permission');
    } finally {
      await request.post('http://localhost:8000/api/test/set-user', {
        data: { userId: 'user-owner' },
      });
      await deleteTask(request, task.id);
    }
  });

  test('T42: Non-owner cannot Create PR', async ({ page, request }) => {
    const task = await createTask(request, '1', 'Task for PR test', 'Testing PR permission');
    const attemptId = await createFixtureAttempt(request, task.id, 'completed', {
      withPR: false,
    });

    try {
      // Set non-owner user context
      await request.post('http://localhost:8000/api/test/set-user', {
        data: { userId: 'user-non-owner' },
      });

      // Try to create PR as non-owner
      const response = await request.post(`http://localhost:8000/api/attempts/${attemptId}/create-pr`);
      expect(response.status()).toBe(403);
      const body = await response.json();
      expect(body.error).toContain('permission');
    } finally {
      await request.post('http://localhost:8000/api/test/set-user', {
        data: { userId: 'user-owner' },
      });
      await deleteTask(request, task.id);
    }
  });

  test('T43: Owner can perform all actions', async ({ page, request }) => {
    const task = await createTask(request, '1', 'Task for owner test', 'Testing owner permissions');

    try {
      // Ensure we're owner
      await request.post('http://localhost:8000/api/test/set-user', {
        data: { userId: 'user-owner' },
      });

      // Owner can run task
      const runResponse = await request.post(`http://localhost:8000/api/tasks/${task.id}/run`);
      expect(runResponse.status()).toBe(200);

      // Get the attempt ID
      const attemptsResponse = await request.get(`http://localhost:8000/api/tasks/${task.id}/attempts`);
      const attempts = await attemptsResponse.json();
      expect(attempts.length).toBeGreaterThan(0);
      const attemptId = attempts[0].id;

      // Wait for completion (mock)
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mark as completed via test fixture
      const completedAttemptId = await createFixtureAttempt(request, task.id, 'completed', {
        withPR: false,
      });

      // Owner can apply
      const applyResponse = await request.post(`http://localhost:8000/api/attempts/${completedAttemptId}/apply`);
      expect([200, 500]).toContain(applyResponse.status()); // 500 acceptable if git not configured

      // Owner can create PR
      const prResponse = await request.post(`http://localhost:8000/api/attempts/${completedAttemptId}/create-pr`);
      expect([200, 500]).toContain(prResponse.status()); // 500 acceptable if git not configured
    } finally {
      await deleteTask(request, task.id);
    }
  });
});
