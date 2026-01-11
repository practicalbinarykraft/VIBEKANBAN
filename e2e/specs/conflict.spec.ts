import { test, expect } from '@playwright/test';
import { createTask, createFixtureAttempt, deleteTask } from '../helpers/api';

test.describe('Task Details Panel - Merge Conflicts', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to project page
    await page.goto('/projects/1');
    // Wait for tasks to load
    await page.waitForSelector('[data-testid="kanban-board"]', { timeout: 10000 });
  });

  test('T17: Attempt with merge conflict shows Conflict Block', async ({ page, request }) => {
    // GIVEN: Task with completed attempt that has merge conflict
    const task = await createTask(request, '1', 'Task with conflict', 'Testing conflict resolution UI');
    const attemptId = await createFixtureAttempt(request, task.id, 'completed', {
      withConflict: true,
    });

    try {
      // WHEN: Navigate to task with conflicted attempt
      await page.goto(`/projects/1?task=${task.id}&attempt=${attemptId}`);
      await page.waitForSelector('[data-testid="conflict-block"]', { timeout: 5000 });

      // THEN: Conflict block should be visible
      const conflictBlock = page.locator('[data-testid="conflict-block"]');
      await expect(conflictBlock).toBeVisible();

      // THEN: Should show conflict warning
      await expect(conflictBlock).toContainText(/merge conflict detected/i);

      // THEN: Should show explanation text
      await expect(conflictBlock).toContainText(/cannot be applied automatically/i);
      await expect(conflictBlock).toContainText(/resolve conflicts manually/i);

      // THEN: Should show action buttons
      await expect(page.locator('[data-testid="open-workspace-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="mark-resolved-button"]')).toBeVisible();
    } finally {
      await deleteTask(request, task.id);
    }
  });

  test('T18: Apply and Create PR buttons hidden on conflict', async ({ page, request }) => {
    // GIVEN: Task with completed attempt that has merge conflict
    const task = await createTask(request, '1', 'Task with conflict', 'Testing buttons hidden on conflict');
    const attemptId = await createFixtureAttempt(request, task.id, 'completed', {
      withConflict: true,
    });

    try {
      // WHEN: Navigate to task with conflicted attempt
      await page.goto(`/projects/1?task=${task.id}&attempt=${attemptId}`);
      await page.waitForSelector('[data-testid="conflict-block"]', { timeout: 5000 });

      // THEN: Apply button should NOT be visible
      const applyButton = page.locator('button:has-text("Apply to Main")');
      await expect(applyButton).not.toBeVisible();

      // THEN: Create PR button should NOT be visible (PR preview block should not show create button)
      const createPRButton = page.locator('[data-testid="create-pr-button"]');
      await expect(createPRButton).not.toBeVisible();

      // THEN: Conflict block should be visible instead
      await expect(page.locator('[data-testid="conflict-block"]')).toBeVisible();
    } finally {
      await deleteTask(request, task.id);
    }
  });

  test('T19: Conflict files list is rendered', async ({ page, request }) => {
    // GIVEN: Task with completed attempt that has merge conflict in specific files
    const task = await createTask(request, '1', 'Task with conflict files', 'Testing conflict files list');
    const attemptId = await createFixtureAttempt(request, task.id, 'completed', {
      withConflict: true,
      conflictFiles: ['src/components/task-actions.tsx', 'server/api/apply.ts'],
    });

    try {
      // WHEN: Navigate to task with conflicted attempt
      await page.goto(`/projects/1?task=${task.id}&attempt=${attemptId}`);
      await page.waitForSelector('[data-testid="conflict-block"]', { timeout: 5000 });

      // THEN: Conflict files list should be visible
      const conflictFilesList = page.locator('[data-testid="conflict-files-list"]');
      await expect(conflictFilesList).toBeVisible();

      // THEN: Should show the conflicted file paths
      await expect(conflictFilesList).toContainText('src/components/task-actions.tsx');
      await expect(conflictFilesList).toContainText('server/api/apply.ts');
    } finally {
      await deleteTask(request, task.id);
    }
  });

  test('T20: Clicking "Mark as Resolved" re-enables Apply/PR', async ({ page, request }) => {
    // GIVEN: Task with completed attempt that has merge conflict
    const task = await createTask(request, '1', 'Task with conflict', 'Testing mark as resolved');
    const attemptId = await createFixtureAttempt(request, task.id, 'completed', {
      withConflict: true,
    });

    try {
      // WHEN: Navigate to task with conflicted attempt
      await page.goto(`/projects/1?task=${task.id}&attempt=${attemptId}`);
      await page.waitForSelector('[data-testid="conflict-block"]', { timeout: 5000 });

      // THEN: Conflict block visible, Apply/PR hidden
      await expect(page.locator('[data-testid="conflict-block"]')).toBeVisible();
      await expect(page.locator('button:has-text("Apply to Main")')).not.toBeVisible();

      // WHEN: Click "Mark as Resolved"
      const markResolvedButton = page.locator('[data-testid="mark-resolved-button"]');
      await markResolvedButton.click();

      // Wait for conflict block to disappear
      await page.waitForSelector('[data-testid="conflict-block"]', { state: 'hidden', timeout: 5000 });

      // THEN: Conflict block should be hidden
      await expect(page.locator('[data-testid="conflict-block"]')).not.toBeVisible();

      // THEN: Apply button should be visible again
      await expect(page.locator('button:has-text("Apply to Main")')).toBeVisible();

      // THEN: PR preview should be visible (with Create PR button)
      await expect(page.locator('[data-testid="pr-preview"]')).toBeVisible();
      await expect(page.locator('[data-testid="create-pr-button"]')).toBeVisible();
    } finally {
      await deleteTask(request, task.id);
    }
  });
});
