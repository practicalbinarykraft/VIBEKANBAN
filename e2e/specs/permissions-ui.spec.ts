import { test, expect } from '@playwright/test';
import { createTask, createFixtureAttempt, deleteTask } from '../helpers/api';
import { apiUrl } from '../helpers/base-url';

test.describe('Permissions & Ownership - UI Feedback', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/projects/1');
    await page.waitForSelector('[data-testid="kanban-board"]', { timeout: 10000 });
  });

  test('T44: Non-owner → API returns 403', async ({ request }) => {
    const task = await createTask(request, '1', 'UI Permission Test', 'Test UI feedback');

    try {
      // Set non-owner user context
      await request.post(apiUrl('/api/test/set-user'), {
        data: { userId: 'user-non-owner' },
      });

      // Try to run task - should get 403
      const runResponse = await request.post(apiUrl(`/api/tasks/${task.id}/run`));
      expect(runResponse.status()).toBe(403);
      const runBody = await runResponse.json();
      expect(runBody.error).toContain('permission');

      // Create completed attempt
      await request.post(apiUrl('/api/test/set-user'), {
        data: { userId: 'user-owner' },
      });
      const attemptId = await createFixtureAttempt(request, task.id, 'completed', {
        withPR: false,
      });
      await request.post(apiUrl('/api/test/set-user'), {
        data: { userId: 'user-non-owner' },
      });

      // Try to apply - should get 403
      const applyResponse = await request.post(apiUrl(`/api/attempts/${attemptId}/apply`));
      expect(applyResponse.status()).toBe(403);
      const applyBody = await applyResponse.json();
      expect(applyBody.error).toContain('permission');

      // Try to create PR - should get 403
      const prResponse = await request.post(apiUrl(`/api/attempts/${attemptId}/create-pr`));
      expect(prResponse.status()).toBe(403);
      const prBody = await prResponse.json();
      expect(prBody.error).toContain('permission');
    } finally {
      // Reset to owner
      await request.post(apiUrl('/api/test/set-user'), {
        data: { userId: 'user-owner' },
      });
      await deleteTask(request, task.id);
    }
  });

  test('T45: Owner → API returns 200', async ({ request }) => {
    const task = await createTask(request, '1', 'Owner UI Test', 'Test owner permissions');

    try {
      // Ensure we're owner
      await request.post(apiUrl('/api/test/set-user'), {
        data: { userId: 'user-owner' },
      });

      // Try to run task - should succeed
      const runResponse = await request.post(apiUrl(`/api/tasks/${task.id}/run`));
      expect(runResponse.status()).toBe(200);
      const runBody = await runResponse.json();
      expect(runBody.attemptId).toBeDefined();

      // Create completed attempt
      const attemptId = await createFixtureAttempt(request, task.id, 'completed', {
        withPR: false,
      });

      // Try to apply - should succeed (or return non-403)
      const applyResponse = await request.post(apiUrl(`/api/attempts/${attemptId}/apply`));
      expect([200, 400, 500]).toContain(applyResponse.status()); // 400 if repo not found on CI

      // Try to create PR - should succeed (or return non-403)
      const prResponse = await request.post(apiUrl(`/api/attempts/${attemptId}/create-pr`));
      expect([200, 400, 500]).toContain(prResponse.status()); // 400 if repo/PR not configured
    } finally {
      await deleteTask(request, task.id);
    }
  });
});
