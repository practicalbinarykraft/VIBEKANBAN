import { test, expect } from '@playwright/test';
import { createTask, createFixtureAttempt, deleteTask } from '../helpers/api';
import { cleanupRunningAttempts, navigateToTask, refetchAttempts, waitForAttemptStatus, waitForAttemptsHistory } from '../helpers/queue';

test.describe('Task Details Panel - Queue & Concurrency', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/projects/1');
    await page.waitForSelector('[data-testid="kanban-board"]', { timeout: 10000 });
  });

  test('T21: Run when no running attempts → attempt becomes running immediately', async ({ page, request }) => {
    await cleanupRunningAttempts(request, '1');
    const task = await createTask(request, '1', 'Task for queue test', 'Testing immediate run');

    try {
      await navigateToTask(page, '1', task.id);
      await page.locator('button:has-text("Run Task")').click();
      await page.waitForSelector('button:has-text("Running...")', { timeout: 5000 });
      await waitForAttemptsHistory(page);
      await waitForAttemptStatus(page, 'running');
    } finally {
      await deleteTask(request, task.id);
    }
  });

  test('T22: Run when there is a running attempt in same project → new attempt is queued', async ({ page, request }) => {
    await cleanupRunningAttempts(request, '1');
    const task = await createTask(request, '1', 'Task for queue test', 'Testing queued state');
    await createFixtureAttempt(request, task.id, 'completed', { forceStatus: 'running' });
    const completedAttempt = await createFixtureAttempt(request, task.id, 'completed', { forceStatus: 'completed' });

    try {
      await navigateToTask(page, '1', task.id, completedAttempt);
      await refetchAttempts(page);
      await waitForAttemptsHistory(page);
      await page.locator('button:has-text("New Attempt")').click();
      await page.waitForFunction(() => new URL(window.location.href).searchParams.get('attempt') !== null, { timeout: 5000 });
      await refetchAttempts(page);
      await waitForAttemptStatus(page, 'queued');
      await expect(page.locator('button:has-text("Queued...")')).toBeVisible();
    } finally {
      await deleteTask(request, task.id);
    }
  });

  test('T23: When running attempt finishes → first queued attempt auto-starts', async ({ page, request }) => {
    await cleanupRunningAttempts(request, '1');
    const task = await createTask(request, '1', 'Task for auto-start', 'Testing auto-start after finish');
    const runningAttemptId = await createFixtureAttempt(request, task.id, 'completed', { forceStatus: 'running' });
    const queuedAttemptId = await createFixtureAttempt(request, task.id, 'completed', { forceStatus: 'queued' });

    try {
      await navigateToTask(page, '1', task.id, queuedAttemptId);
      await refetchAttempts(page);
      await waitForAttemptStatus(page, 'queued');
      await request.post(`http://localhost:8000/api/test/fixtures/attempt/${runningAttemptId}/finish`);
      await refetchAttempts(page);
      await waitForAttemptStatus(page, 'running');
    } finally {
      await deleteTask(request, task.id);
    }
  });


  test('T25: Stop running attempt → queued attempt starts next', async ({ page, request }) => {
    await cleanupRunningAttempts(request, '1');
    const task = await createTask(request, '1', 'Task for stop test', 'Testing stop triggers queue');
    const runningAttemptId = await createFixtureAttempt(request, task.id, 'completed', { forceStatus: 'running' });
    const queuedAttemptId = await createFixtureAttempt(request, task.id, 'completed', { forceStatus: 'queued' });

    try {
      await navigateToTask(page, '1', task.id, runningAttemptId);
      await refetchAttempts(page);
      await waitForAttemptStatus(page, 'running');
      await page.locator('button:has-text("Stop Execution")').click();
      await navigateToTask(page, '1', task.id, queuedAttemptId);
      await refetchAttempts(page);
      await waitForAttemptStatus(page, 'running');
    } finally {
      await deleteTask(request, task.id);
    }
  });

  test('T26: Cancel queued attempt → removed or marked stopped', async ({ page, request }) => {
    await cleanupRunningAttempts(request, '1');
    const task = await createTask(request, '1', 'Task for cancel test', 'Testing cancel queued');
    await createFixtureAttempt(request, task.id, 'completed', { forceStatus: 'running' });
    const queuedAttemptId = await createFixtureAttempt(request, task.id, 'completed', { forceStatus: 'queued' });

    try {
      await navigateToTask(page, '1', task.id, queuedAttemptId);
      await refetchAttempts(page);
      await waitForAttemptStatus(page, 'queued');
      await expect(page.locator('button:has-text("Queued...")')).toBeVisible();
      const cancelButton = page.locator('button:has-text("Cancel")');
      await cancelButton.click();
      await expect(cancelButton).not.toBeVisible({ timeout: 5000 });
      await refetchAttempts(page);
      await waitForAttemptStatus(page, 'stopped');
      await expect(page.locator('button:has-text("Run Task")')).toBeVisible();
    } finally {
      await deleteTask(request, task.id);
    }
  });
});
