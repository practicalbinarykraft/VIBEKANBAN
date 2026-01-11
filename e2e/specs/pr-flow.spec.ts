import { test, expect } from '@playwright/test';
import { createTask, createFixtureAttempt, deleteTask } from '../helpers/api';

test.describe('Task Details Panel - PR Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to project page
    await page.goto('/projects/1');
    // Wait for tasks to load
    await page.waitForSelector('[data-testid="kanban-board"]', { timeout: 10000 });
  });

  test('T13: Completed attempt shows PR preview block', async ({ page, request }) => {
    // GIVEN: Create task with completed attempt (with diff)
    const task = await createTask(request, '1', 'Task for PR preview', 'Testing PR preview UI');
    const attemptId = await createFixtureAttempt(request, task.id, 'completed');

    try {
      // WHEN: Navigate to task with attempt
      await page.goto(`/projects/1?task=${task.id}&attempt=${attemptId}`);
      await page.waitForSelector('[data-testid="task-details-panel"]', { timeout: 5000 });

      // THEN: PR Preview block should be visible
      const prPreview = page.locator('[data-testid="pr-preview"]');
      await expect(prPreview).toBeVisible();

      // AND: Should show branch info
      const branchInfo = page.locator('text=/branch|attempt/i');
      await expect(branchInfo.first()).toBeVisible();

      // AND: Should show Create PR button (since PR not created yet)
      const createPRButton = page.locator('button:has-text("Create PR")');
      await expect(createPRButton).toBeVisible();
      await expect(createPRButton).toBeEnabled();
    } finally {
      await deleteTask(request, task.id);
    }
  });

  test('T14: Create PR button creates PR and shows PR link', async ({ page, request }) => {
    // GIVEN: Create task with completed attempt
    const task = await createTask(request, '1', 'Task for PR creation', 'Testing PR creation flow');
    const attemptId = await createFixtureAttempt(request, task.id, 'completed');

    try {
      // WHEN: Navigate to task with attempt
      await page.goto(`/projects/1?task=${task.id}&attempt=${attemptId}`);
      await page.waitForSelector('[data-testid="pr-preview"]', { timeout: 5000 });

      // AND: Click Create PR button
      const createPRButton = page.locator('button:has-text("Create PR")');
      await createPRButton.click();

      // THEN: Should show loading state briefly
      await page.waitForTimeout(500);

      // AND: PR link should appear (mock PR created)
      const prLink = page.locator('[data-testid="pr-link"]');
      await expect(prLink).toBeVisible({ timeout: 5000 });

      // AND: PR status badge should show "Open"
      const prBadge = page.locator('[data-testid="pr-status-badge"]');
      await expect(prBadge).toBeVisible();
      await expect(prBadge).toContainText(/open/i);

      // AND: Create PR button should be hidden (replaced by PR info)
      await expect(createPRButton).not.toBeVisible();
    } finally {
      await deleteTask(request, task.id);
    }
  });

  test('T15: Attempt with PR hides Apply button', async ({ page, request }) => {
    // GIVEN: Create task with completed attempt that has PR
    const task = await createTask(request, '1', 'Task with PR', 'Attempt already has PR');
    const attemptId = await createFixtureAttempt(request, task.id, 'completed', {
      withPR: true,
      prStatus: 'open',
    });

    try {
      // WHEN: Navigate to task with attempt
      await page.goto(`/projects/1?task=${task.id}&attempt=${attemptId}`);
      await page.waitForSelector('[data-testid="task-details-panel"]', { timeout: 5000 });

      // THEN: Apply button should NOT be visible
      const applyButton = page.locator('button:has-text("Apply to Main")');
      await expect(applyButton).not.toBeVisible();

      // AND: PR info should be visible instead
      const prLink = page.locator('[data-testid="pr-link"]');
      await expect(prLink).toBeVisible();

      // AND: Should show explanation why Apply is not available
      const explanation = page.locator('text=/pull request|pr created/i');
      await expect(explanation.first()).toBeVisible();
    } finally {
      await deleteTask(request, task.id);
    }
  });

  test('T16: PR status shown correctly (open / merged / closed)', async ({ page, request }) => {
    // Test each PR status state

    // GIVEN: Task with PR in "open" state
    const taskOpen = await createTask(request, '1', 'Task with open PR', 'Testing open PR status');
    const attemptOpen = await createFixtureAttempt(request, taskOpen.id, 'completed', {
      withPR: true,
      prStatus: 'open',
    });

    try {
      // WHEN: Navigate to attempt with open PR
      await page.goto(`/projects/1?task=${taskOpen.id}&attempt=${attemptOpen}`);
      await page.waitForSelector('[data-testid="pr-status-badge"]', { timeout: 5000 });

      // THEN: Status should show "Open"
      const openBadge = page.locator('[data-testid="pr-status-badge"]');
      await expect(openBadge).toContainText(/open/i);

      // GIVEN: Task with PR in "merged" state
      const taskMerged = await createTask(request, '1', 'Task with merged PR', 'Testing merged PR status');
      const attemptMerged = await createFixtureAttempt(request, taskMerged.id, 'completed', {
        withPR: true,
        prStatus: 'merged',
      });

      // WHEN: Navigate to attempt with merged PR
      await page.goto(`/projects/1?task=${taskMerged.id}&attempt=${attemptMerged}`);
      await page.waitForSelector('[data-testid="pr-status-badge"]', { timeout: 5000 });

      // THEN: Status should show "Merged"
      const mergedBadge = page.locator('[data-testid="pr-status-badge"]');
      await expect(mergedBadge).toContainText(/merged/i);

      // GIVEN: Task with PR in "closed" state
      const taskClosed = await createTask(request, '1', 'Task with closed PR', 'Testing closed PR status');
      const attemptClosed = await createFixtureAttempt(request, taskClosed.id, 'completed', {
        withPR: true,
        prStatus: 'closed',
      });

      // WHEN: Navigate to attempt with closed PR
      await page.goto(`/projects/1?task=${taskClosed.id}&attempt=${attemptClosed}`);
      await page.waitForSelector('[data-testid="pr-status-badge"]', { timeout: 5000 });

      // THEN: Status should show "Closed"
      const closedBadge = page.locator('[data-testid="pr-status-badge"]');
      await expect(closedBadge).toContainText(/closed/i);

      // CLEANUP
      await deleteTask(request, taskMerged.id);
      await deleteTask(request, taskClosed.id);
    } finally {
      await deleteTask(request, taskOpen.id);
    }
  });
});
