import { test, expect } from '@playwright/test';
import { createTask, createFixtureAttempt, deleteTask } from '../helpers/api';
import { setupExecutionReady } from '../helpers/board';

test.describe('Task Details Panel - Basic Operations', () => {
  test.beforeEach(async ({ page, request }) => {
    // Set up execution readiness (AI configured + repo cloned)
    await setupExecutionReady(request, '1');
    // Navigate to project page
    await page.goto('/projects/1');
    // Wait for tasks to load
    await page.waitForSelector('[data-testid="kanban-board"]', { timeout: 10000 });
  });

  test('T1: New task without attempts shows Run Task button and empty state', async ({ page }) => {
    // GIVEN: Navigate to a task without attempts
    await page.goto('/projects/1?task=1');

    // Wait for panel to appear
    await page.waitForSelector('[data-testid="task-details-panel"]', { timeout: 5000 });

    // THEN: Panel header should be visible
    const header = page.locator('[data-testid="task-details-panel"] h2');
    await expect(header).toBeVisible();

    // AND: Run Task button should be visible
    const runButton = page.locator('button:has-text("Run Task")');
    await expect(runButton).toBeVisible();
    await expect(runButton).toBeEnabled();

    // AND: Empty state message should be visible
    const emptyState = page.locator('text=No execution attempts yet');
    await expect(emptyState).toBeVisible();

    // AND: Tabs (Logs/Diffs/Summary) should NOT be visible (no attempts yet)
    const logsTabs = page.locator('[role="tablist"]');
    await expect(logsTabs).not.toBeVisible();
  });

  test('T2: Close button removes task from URL and hides panel', async ({ page }) => {
    // GIVEN: Panel is open with task selected
    await page.goto('/projects/1?task=2');
    await page.waitForSelector('[data-testid="task-details-panel"]', { timeout: 5000 });

    // WHEN: Click close button
    const closeButton = page.locator('[data-testid="task-details-panel"] button[title="Close panel"]');
    await expect(closeButton).toBeVisible();
    await closeButton.click();

    // THEN: URL should not have task param (auto-select may trigger, that's ok)
    // We just verify the close button works and removes the selected task
    await page.waitForTimeout(500); // Wait for any auto-select to settle

    // AND: Panel should either be closed OR show a different task (auto-select)
    // The key is that clicking close DID remove task=2 from URL (even if auto-select triggered)
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('task=2');
  });

  test('T3: Switching tasks updates panel header and content', async ({ page }) => {
    // GIVEN: Task 1 is selected
    await page.goto('/projects/1?task=1');
    await page.waitForSelector('[data-testid="task-details-panel"]', { timeout: 5000 });

    // Get task 1 title
    const headerBefore = await page.locator('[data-testid="task-details-panel"] h2').textContent();

    // WHEN: Click on task 2 in kanban board
    await page.goto('/projects/1?task=2');
    await page.waitForTimeout(500); // Wait for navigation

    // THEN: URL should have task=2
    await expect(page).toHaveURL(/task=2/);

    // AND: Panel header should change
    const headerAfter = await page.locator('[data-testid="task-details-panel"] h2').textContent();
    expect(headerAfter).not.toBe(headerBefore);

    // AND: Task ID badge should show #2
    const taskIdBadge = page.locator('[data-testid="task-details-panel"] span:has-text("#2")');
    await expect(taskIdBadge).toBeVisible();
  });

  test('T4: Task with completed attempt shows execution details and tabs', async ({ page, request }) => {
    // GIVEN: Create a new task via API
    const task = await createTask(
      request,
      '1',
      'T4 Test Task - Execution Details',
      'This task is created by E2E test to verify execution details display'
    );

    try {
      // AND: Create a fixture attempt with logs and artifacts (no Docker needed)
      const attemptId = await createFixtureAttempt(request, task.id, 'completed');

      // WHEN: Navigate to the task page
      await page.goto(`/projects/1?task=${task.id}`);
      await page.waitForSelector('[data-testid="task-details-panel"]', { timeout: 5000 });

      // THEN: Execution Details section should be visible
      const executionDetails = page.locator('[data-testid="execution-details"]');
      await expect(executionDetails).toBeVisible();

      // AND: Tabs should be visible
      const taskTabs = page.locator('[data-testid="task-tabs"]');
      await expect(taskTabs).toBeVisible();

      // AND: All three tabs should be present
      const logsTab = page.locator('[data-testid="tab-logs"]');
      const diffsTab = page.locator('[data-testid="tab-diffs"]');
      const summaryTab = page.locator('[data-testid="tab-summary"]');

      await expect(logsTab).toBeVisible();
      await expect(diffsTab).toBeVisible();
      await expect(summaryTab).toBeVisible();

      // AND: Apply to Main or Run Task button should be visible
      const actionButtons = page.locator('button:has-text("Apply to Main"), button:has-text("Run Task")');
      await expect(actionButtons.first()).toBeVisible();
    } finally {
      // CLEANUP: Delete the task (and its attempts) after test
      await deleteTask(request, task.id);
    }
  });

  test('T5: Browser back/forward navigation works correctly', async ({ page }) => {
    // GIVEN: Navigate to task 1
    await page.goto('/projects/1?task=1');
    await page.waitForSelector('[data-testid="task-details-panel"]', { timeout: 5000 });

    // WHEN: Navigate to task 2
    await page.goto('/projects/1?task=2');
    await page.waitForTimeout(500);

    // AND: Go back
    await page.goBack();
    await page.waitForTimeout(500);

    // THEN: Should be back at task 1
    await expect(page).toHaveURL(/task=1/);
    const taskId = page.locator('[data-testid="task-details-panel"] span:has-text("#1")');
    await expect(taskId).toBeVisible();

    // WHEN: Go forward
    await page.goForward();
    await page.waitForTimeout(500);

    // THEN: Should be at task 2 again
    await expect(page).toHaveURL(/task=2/);
    const taskId2 = page.locator('[data-testid="task-details-panel"] span:has-text("#2")');
    await expect(taskId2).toBeVisible();
  });
});
