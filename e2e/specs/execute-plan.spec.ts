/**
 * E2E tests for Execute Plan feature
 *
 * Execute Plan = Apply Plan + Run All in one click
 * Tests the full flow: planning → execute → tasks running
 */

import { test, expect } from '@playwright/test';
import { resetProjectStatus } from '../helpers/api';
import {
  waitForBoardReady,
  waitForExecutionStatus,
  waitForTaskInColumn,
  getTaskCountInColumn,
} from '../helpers/board';

// Increase timeout for execution tests
test.setTimeout(60000);

test.describe('Execute Plan', () => {
  test.beforeEach(async ({ page, request }) => {
    await resetProjectStatus(request, '1');
    await page.goto('/projects/1');
    await waitForBoardReady(page);
  });

  test('T1: Execute Plan applies plan and starts execution', async ({ page }) => {
    // 1. Count TODO tasks before
    const countBefore = await getTaskCountInColumn(page, 'todo');

    // 2. Go to Planning tab
    await page.locator('[data-testid="planning-tab"]').click();

    // 3. Enter idea that triggers PLAN mode
    const ideaInput = page.locator('[data-testid="planning-idea-input"]');
    await ideaInput.fill('Build MVP for execute plan test');

    // 4. Start council → wait for chat
    await page.locator('[data-testid="planning-start-button"]').click();
    await expect(page.locator('[data-testid="council-chat"]')).toBeVisible({ timeout: 10000 });

    // 5. Finish discussion → wait for plan
    await page.locator('[data-testid="planning-finish-button"]').click();
    await expect(page.locator('[data-testid="product-plan"]')).toBeVisible({ timeout: 10000 });

    // 6. Capture createdTaskIds from apply response
    const applyResponsePromise = page.waitForResponse((resp) => {
      return resp.url().includes('/planning/apply') && resp.request().method() === 'POST' && resp.status() === 200;
    });

    // 7. Click Execute Plan button
    const executeButton = page.locator('[data-testid="execute-plan-button"]');
    await expect(executeButton).toBeVisible();
    await executeButton.click();

    // 8. Wait for apply response and extract createdTaskIds
    const applyResp = await applyResponsePromise;
    const json = await applyResp.json();
    const createdTaskIds: string[] = json.taskIds ?? json.createdTaskIds ?? [];
    expect(createdTaskIds.length).toBeGreaterThan(0);

    // 9. Verify Tasks tab is active (board visible)
    await waitForBoardReady(page);

    // 10. Verify execution status becomes RUNNING
    await waitForExecutionStatus(page, 'RUNNING');

    // 11. Verify at least one created task appears on board (TODO or IN_PROGRESS)
    const todoColumn = page.locator('[data-testid="column-todo"]');
    const inProgressColumn = page.locator('[data-testid="column-in_progress"]');

    // Check if any of the created tasks is visible in either column
    let foundTask = false;
    for (const taskId of createdTaskIds) {
      const inTodo = await todoColumn.locator(`[data-testid="task-card-${taskId}"]`).count();
      const inProgress = await inProgressColumn.locator(`[data-testid="task-card-${taskId}"]`).count();
      if (inTodo > 0 || inProgress > 0) {
        foundTask = true;
        break;
      }
    }
    expect(foundTask).toBe(true);

    // 12. Verify TODO count increased (tasks were created)
    const countAfter = await getTaskCountInColumn(page, 'todo') +
                       await getTaskCountInColumn(page, 'in_progress');
    expect(countAfter).toBeGreaterThan(countBefore);
  });
});
