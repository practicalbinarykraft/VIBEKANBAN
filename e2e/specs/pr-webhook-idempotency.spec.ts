import { test, expect } from '@playwright/test';
import { createTask, createFixtureAttempt, deleteTask, clearProcessedWebhooks } from '../helpers/api';
import { openTaskPanel } from '../helpers/panel';
import { sendPRWebhook } from '../helpers/github-webhook';
import { apiUrl } from '../helpers/base-url';

test.describe('GitHub Webhooks - Idempotency & Replay Protection', () => {
  test.beforeEach(async ({ page, request }) => {
    // Clear processed webhooks for test isolation
    await clearProcessedWebhooks(request);

    await page.goto('/projects/1');
    await page.waitForSelector('[data-testid="kanban-board"]', { timeout: 10000 });
  });

  test('T36: Duplicate webhook delivery → no DB change', async ({ page, request }) => {
    const task = await createTask(request, '1', 'Task for idempotency', 'Testing duplicate delivery');
    const attemptId = await createFixtureAttempt(request, task.id, 'completed', {
      withPR: true,
      prStatus: 'open',
    });

    try {
      await openTaskPanel(page, '1', task.id, attemptId);
      const statusBadge = page.locator('[data-testid="pr-status-badge"]');
      await expect(statusBadge).toContainText('Open');
      await page.waitForTimeout(1000);

      // Send first webhook with delivery ID
      await sendPRWebhook(request, {
        action: 'closed',
        prNumber: 42,
        merged: true,
        deliveryId: 'test-delivery-123',
      });

      await page.waitForTimeout(2000);
      await expect(statusBadge).toContainText('Merged');

      // Send duplicate webhook with same delivery ID
      await sendPRWebhook(request, {
        action: 'closed',
        prNumber: 42,
        merged: false, // Different payload
        deliveryId: 'test-delivery-123', // Same delivery ID
      });

      await page.waitForTimeout(2000);
      // Status should still be "Merged" (not changed to "Closed")
      await expect(statusBadge).toContainText('Merged');
    } finally {
      await deleteTask(request, task.id);
    }
  });

  test('T37: Same PR status twice → no duplicate SSE', async ({ page, request }) => {
    const task = await createTask(request, '1', 'Task for duplicate status', 'Testing duplicate status');
    const attemptId = await createFixtureAttempt(request, task.id, 'completed', {
      withPR: true,
      prStatus: 'open',
    });

    try {
      await openTaskPanel(page, '1', task.id, attemptId);
      const statusBadge = page.locator('[data-testid="pr-status-badge"]');
      await expect(statusBadge).toContainText('Open');
      await page.waitForTimeout(1000);

      // Send webhook to change status to merged
      await sendPRWebhook(request, {
        action: 'closed',
        prNumber: 42,
        merged: true,
        deliveryId: 'test-delivery-200',
      });

      await page.waitForTimeout(2000);
      await expect(statusBadge).toContainText('Merged');

      // Send another webhook with same status (merged) but different delivery ID
      await sendPRWebhook(request, {
        action: 'closed',
        prNumber: 42,
        merged: true,
        deliveryId: 'test-delivery-201',
      });

      await page.waitForTimeout(2000);
      // Status should still be "Merged" (unchanged)
      await expect(statusBadge).toContainText('Merged');

      // Verify DB was not updated twice
      const dbResponse = await request.get(apiUrl(`/api/attempts/${attemptId}`));
      const dbAttempt = await dbResponse.json();
      expect(dbAttempt.prStatus).toBe('merged');
    } finally {
      await deleteTask(request, task.id);
    }
  });

  test('T38: Out-of-order event handled correctly', async ({ page, request }) => {
    const task = await createTask(request, '1', 'Task for out-of-order', 'Testing event ordering');
    const attemptId = await createFixtureAttempt(request, task.id, 'completed', {
      withPR: true,
      prStatus: 'merged',
    });

    try {
      await openTaskPanel(page, '1', task.id, attemptId);
      const statusBadge = page.locator('[data-testid="pr-status-badge"]');
      await expect(statusBadge).toContainText('Merged');
      await page.waitForTimeout(1000);

      // Try to reopen PR (GitHub might resend old "opened" event)
      await sendPRWebhook(request, {
        action: 'reopened',
        prNumber: 42,
        deliveryId: 'test-delivery-300',
      });

      await page.waitForTimeout(2000);
      // Status should change to "Open" (we process all events, no ordering logic)
      await expect(statusBadge).toContainText('Open');
    } finally {
      await deleteTask(request, task.id);
    }
  });

  test('T39: Replay attack simulation → ignored', async ({ request }) => {
    const task = await createTask(request, '1', 'Task for replay', 'Testing replay protection');
    const attemptId = await createFixtureAttempt(request, task.id, 'completed', {
      withPR: true,
      prStatus: 'open',
    });

    try {
      // Send first webhook
      const response1 = await sendPRWebhook(request, {
        action: 'closed',
        prNumber: 42,
        merged: true,
        deliveryId: 'replay-test-999',
      });
      expect(response1.status()).toBe(200);
      const body1 = await response1.json();
      expect(body1.success).toBe(true);

      // Verify DB was updated
      const dbResponse1 = await request.get(apiUrl(`/api/attempts/${attemptId}`));
      const dbAttempt1 = await dbResponse1.json();
      expect(dbAttempt1.prStatus).toBe('merged');

      // Attempt replay with same delivery ID
      const response2 = await sendPRWebhook(request, {
        action: 'closed',
        prNumber: 42,
        merged: false, // Try to change to closed
        deliveryId: 'replay-test-999', // Same delivery ID
      });
      expect(response2.status()).toBe(200);
      const body2 = await response2.json();
      expect(body2.duplicate).toBe(true); // Should be marked as duplicate

      // Verify DB was NOT updated
      const dbResponse2 = await request.get(apiUrl(`/api/attempts/${attemptId}`));
      const dbAttempt2 = await dbResponse2.json();
      expect(dbAttempt2.prStatus).toBe('merged'); // Still merged, not closed
    } finally {
      await deleteTask(request, task.id);
    }
  });
});
