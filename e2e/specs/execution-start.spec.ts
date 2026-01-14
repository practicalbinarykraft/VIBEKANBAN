/**
 * E2E tests for execution Start button (no reload)
 *
 * Tests the "Start" / "Run All" button functionality
 * without using page.reload() - uses __VIBE__.refreshTasks() instead
 */

import { test, expect } from '@playwright/test';
import { createTask, resetProjectStatus, safeCleanup } from '../helpers/api';
import {
  waitForBoardReady,
  waitForExecutionStatus,
  waitForTaskInColumn,
} from '../helpers/board';

// Increase timeout for execution tests (agent startup can take time)
test.setTimeout(60000);

test.describe('Execution Start Button (No Reload)', () => {
  test.beforeEach(async ({ request }) => {
    await resetProjectStatus(request, '1');
  });

  test('T1: Start button triggers run-all and moves task to in_progress without reload', async ({
    page,
    request,
  }) => {
    // 1. Create task via API
    const task = await createTask(
      request,
      '1',
      'No-reload execution test',
      'Testing Start button without reload'
    );

    try {
      // 2. Navigate and wait for board
      await page.goto('/projects/1');
      await waitForBoardReady(page);

      // 3. Trigger UI refresh to see API-created task (no reload!)
      await page.evaluate(() => (window as any).__VIBE__?.refreshTasks?.());
      await waitForBoardReady(page);

      // 4. Verify task appears in TODO
      await waitForTaskInColumn(page, task.id, 'todo');

      // 5. Click Start button (click inner button via wrapper selector)
      const startWrapper = page.locator('[data-testid="execution-start-button"]');
      await expect(startWrapper).toBeVisible();
      const startButton = startWrapper.locator('[data-testid="run-all-button"]');

      const runAllResponse = page.waitForResponse(
        (res) =>
          res.url().includes('/run-all') &&
          res.request().method() === 'POST' &&
          res.status() === 200
      );
      await startButton.click();
      await runAllResponse;

      // 6. Verify execution status becomes RUNNING
      await waitForExecutionStatus(page, 'RUNNING');

      // 7. Wait for board refresh and task to move to in_progress
      await waitForBoardReady(page);
      await waitForTaskInColumn(page, task.id, 'in_progress');
    } finally {
      // Cleanup (safe - won't throw if context closed)
      await safeCleanup(request, [task.id]);
    }
  });
});
