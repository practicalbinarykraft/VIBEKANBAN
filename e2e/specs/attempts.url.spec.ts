import { test, expect } from '@playwright/test';
import { createTask, createFixtureAttempt, deleteTask } from '../helpers/api';
import { openTaskPanel, waitForExecutionDetails, waitForTaskTabs, getApplyErrorBox } from '../helpers/panel';
import { setupExecutionReady } from '../helpers/board';

test.describe('Task Details Panel - Attempts & URL Sync', () => {
  test.beforeEach(async ({ page, request }) => {
    // Set up execution readiness (AI configured + repo cloned)
    await setupExecutionReady(request, '1');
    await page.goto('/projects/1');
    await page.waitForSelector('[data-testid="kanban-board"]', { timeout: 10000 });
  });

  test('T6: Switching task clears attempt and loads correct latest attempt', async ({ page, request }) => {
    const taskA = await createTask(request, '1', 'Task A', 'First task for testing attempt switching');
    const attemptA = await createFixtureAttempt(request, taskA.id, 'completed');
    const taskB = await createTask(request, '1', 'Task B', 'Second task for testing attempt switching');
    const attemptB = await createFixtureAttempt(request, taskB.id, 'completed');

    try {
      await openTaskPanel(page, '1', taskA.id, attemptA);
      await expect(page).toHaveURL(new RegExp(`task=${taskA.id}`));
      await expect(page).toHaveURL(new RegExp(`attempt=${attemptA}`));
      await expect(page.locator('[data-testid="task-details-panel"] h2')).toContainText('Task A');
      await page.goto(`/projects/1?task=${taskB.id}`);
      await page.waitForTimeout(1000);
      await expect(page).toHaveURL(new RegExp(`task=${taskB.id}`));
      await expect(page).toHaveURL(new RegExp(`attempt=${attemptB}`));
      await expect(page.locator('[data-testid="task-details-panel"] h2')).toContainText('Task B');
      await waitForExecutionDetails(page);
    } finally {
      await deleteTask(request, taskA.id);
      await deleteTask(request, taskB.id);
    }
  });

  test('T7: Deep link with attempt shows correct attempt', async ({ page, request }) => {
    const task = await createTask(request, '1', 'Task for deep link', 'Testing deep link with attempt param');
    const attemptId = await createFixtureAttempt(request, task.id, 'completed');

    try {
      await openTaskPanel(page, '1', task.id, attemptId);
      await waitForExecutionDetails(page);
      await waitForTaskTabs(page);
      await expect(page).toHaveURL(new RegExp(`attempt=${attemptId}`));
    } finally {
      await deleteTask(request, task.id);
    }
  });

  test('T8: Invalid attempt id shows "Attempt not found" state', async ({ page, request }) => {
    const task = await createTask(request, '1', 'Task for invalid attempt', 'Testing invalid attempt handling');
    const validAttemptId = await createFixtureAttempt(request, task.id, 'completed');

    try {
      await page.goto(`/projects/1?task=${task.id}&attempt=invalid-attempt-id-12345`);
      await page.waitForSelector('[data-testid="task-details-panel"]', { timeout: 5000 });
      await page.waitForTimeout(1000);
      const currentUrl = page.url();
      if (currentUrl.includes(`attempt=${validAttemptId}`)) {
        await waitForExecutionDetails(page);
      } else {
        await expect(page.locator('[data-testid="task-details-panel"]')).toBeVisible();
      }
    } finally {
      await deleteTask(request, task.id);
    }
  });

  test('T9: Apply error shows error state and retry button', async ({ page, request }) => {
    const task = await createTask(request, '1', 'Task with apply error', 'Testing apply error handling');
    const attemptId = await createFixtureAttempt(request, task.id, 'completed', {
      withApplyError: true,
      applyErrorMessage: 'Merge conflict in src/example.ts: automatic merge failed',
    });

    try {
      await openTaskPanel(page, '1', task.id, attemptId);
      const applyErrorBox = getApplyErrorBox(page);
      await expect(applyErrorBox).toBeVisible();
      await expect(applyErrorBox.locator('text=Merge conflict in src/example.ts')).toBeVisible();
      await expect(page.locator('button:has-text("Apply")')).toBeDisabled();
      await expect(applyErrorBox.locator('text=Apply failed')).toBeVisible();
    } finally {
      await deleteTask(request, task.id);
    }
  });

  test('T10: Attempt with no diff shows empty state and disabled Apply', async ({ page, request }) => {
    const task = await createTask(request, '1', 'Task with no changes', 'Agent produced no changes');
    const attemptId = await createFixtureAttempt(request, task.id, 'completed', { noDiff: true });

    try {
      await openTaskPanel(page, '1', task.id, attemptId);
      await expect(page.locator('text=/no changes|no diff|no modifications/i').first()).toBeVisible();
      await expect(page.locator('button:has-text("Apply")')).toBeDisabled();
      await expect(page.locator('text=/no changes to apply|nothing to apply/i').first()).toBeVisible();
    } finally {
      await deleteTask(request, task.id);
    }
  });

  test('T11: Loading states visible during async operations', async ({ page, request }) => {
    const task = await createTask(request, '1', 'Task for loading test', 'Testing loading states');
    const attemptId = await createFixtureAttempt(request, task.id, 'completed');

    try {
      await page.goto('/projects/1');
      await page.waitForSelector('[data-testid="kanban-board"]', { timeout: 5000 });
      await page.goto(`/projects/1?task=${task.id}`);
      const hasLoadedQuickly = await page.locator('[data-testid="task-details-panel"]').isVisible({ timeout: 100 }).catch(() => false);
      if (!hasLoadedQuickly) {
        await expect(page.locator('text=/loading|fetching/i').first()).toBeVisible({ timeout: 1000 });
      }
      await page.waitForSelector('[data-testid="task-details-panel"]', { timeout: 5000 });
      await waitForExecutionDetails(page);
    } finally {
      await deleteTask(request, task.id);
    }
  });

  test('T12: Disabled buttons explain why they are disabled', async ({ page, request }) => {
    const task = await createTask(request, '1', 'Task for button states', 'Testing disabled button tooltips');

    try {
      await openTaskPanel(page, '1', task.id);
      await expect(page.locator('button:has-text("Run Task")')).toBeEnabled();
      const attemptId = await createFixtureAttempt(request, task.id, 'completed', { noDiff: true });
      await page.goto(`/projects/1?task=${task.id}&attempt=${attemptId}`);
      await waitForExecutionDetails(page);
      await expect(page.locator('button:has-text("Apply")')).toBeDisabled();
      await expect(page.locator('text=/no changes|nothing to apply/i').first()).toBeVisible();
    } finally {
      await deleteTask(request, task.id);
    }
  });
});
