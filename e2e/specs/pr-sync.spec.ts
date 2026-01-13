import { test, expect } from '@playwright/test';
import { createTask, createFixtureAttempt, deleteTask } from '../helpers/api';
import { openTaskPanel } from '../helpers/panel';

test.describe('Task Details Panel - PR Status Sync', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/projects/1');
    await page.waitForSelector('[data-testid="kanban-board"]', { timeout: 10000 });
  });

  test('T27: PR attempt shows "Sync PR Status" button', async ({ page, request }) => {
    const task = await createTask(request, '1', 'Task with PR', 'Testing PR sync button');
    const attemptId = await createFixtureAttempt(request, task.id, 'completed', {
      withPR: true,
      prStatus: 'open',
    });

    try {
      await openTaskPanel(page, '1', task.id, attemptId);

      // PR Preview should be visible
      const prPreview = page.locator('[data-testid="pr-preview"]');
      await expect(prPreview).toBeVisible();

      // Sync PR Status button should be visible
      const syncButton = page.locator('button:has-text("Sync PR Status")');
      await expect(syncButton).toBeVisible();
      await expect(syncButton).toBeEnabled();
    } finally {
      await deleteTask(request, task.id);
    }
  });

  test('T28: Sync updates badge to merged', async ({ page, request }) => {
    const task = await createTask(request, '1', 'Task for sync test', 'Testing sync to merged');
    const attemptId = await createFixtureAttempt(request, task.id, 'completed', {
      withPR: true,
      prStatus: 'open',
    });

    try {
      await openTaskPanel(page, '1', task.id, attemptId);

      // Initial status should be "open"
      const statusBadge = page.locator('[data-testid="pr-status-badge"]');
      await expect(statusBadge).toContainText('Open');

      // Click Sync button and wait for response
      const syncButton = page.locator('button:has-text("Sync PR Status")');
      const syncPromise = page.waitForResponse(
        (res) => res.url().includes('/sync-pr') && res.status() === 200
      );
      await syncButton.click();
      await syncPromise;

      // Call sync endpoint in test mode to update status to merged
      await request.post(`http://localhost:8000/api/attempts/${attemptId}/sync-pr`, {
        data: { status: 'merged' },
      });

      // Reload to see updated status
      await page.reload();
      await page.waitForSelector('[data-testid="task-details-panel"]', { timeout: 5000 });

      // Status badge should now show "Merged"
      const updatedBadge = page.locator('[data-testid="pr-status-badge"]');
      await expect(updatedBadge).toContainText('Merged', { timeout: 5000 });
    } finally {
      await deleteTask(request, task.id);
    }
  });

  test('T29: Sync error shown', async ({ page, request }) => {
    const task = await createTask(request, '1', 'Task for error test', 'Testing sync error handling');
    const attemptId = await createFixtureAttempt(request, task.id, 'completed', {
      withPR: true,
      prStatus: 'open',
    });

    try {
      await openTaskPanel(page, '1', task.id, attemptId);

      // Intercept sync request to return error
      await page.route(`**/api/attempts/${attemptId}/sync-pr`, route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Failed to fetch PR status from GitHub' }),
        });
      });

      // Click Sync button
      const syncButton = page.locator('button:has-text("Sync PR Status")');
      await syncButton.click();

      // Error message should be displayed
      const errorMessage = page.locator('text=/Failed to fetch PR status|Error syncing PR/i');
      await expect(errorMessage).toBeVisible({ timeout: 3000 });
    } finally {
      await deleteTask(request, task.id);
    }
  });

  test('T30: Auto-sync on panel open', async ({ page, request }) => {
    const task = await createTask(request, '1', 'Task for auto-sync', 'Testing auto-sync behavior');
    const attemptId = await createFixtureAttempt(request, task.id, 'completed', {
      withPR: true,
      prStatus: 'open',
    });

    try {
      // Track sync endpoint calls
      let syncCallCount = 0;
      await page.route(`**/api/attempts/${attemptId}/sync-pr`, route => {
        syncCallCount++;
        route.continue();
      });

      // Open task panel
      await page.goto(`/projects/1?task=${task.id}&attempt=${attemptId}`);
      await page.waitForSelector('[data-testid="task-details-panel"]', { timeout: 5000 });

      // Wait a bit to ensure auto-sync completes
      await page.waitForTimeout(2000);

      // Sync should have been called exactly once (auto-sync on mount)
      expect(syncCallCount).toBe(1);

      // Wait more to ensure no additional calls
      await page.waitForTimeout(2000);
      expect(syncCallCount).toBe(1); // Still 1, no additional calls
    } finally {
      await deleteTask(request, task.id);
    }
  });
});
