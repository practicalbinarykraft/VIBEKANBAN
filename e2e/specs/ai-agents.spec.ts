import { test, expect } from '@playwright/test';
import { createTask, clearProcessedWebhooks, safeCleanup, resetProjectStatus } from '../helpers/api';
test.describe('AI Agents Runtime', () => {
  test.beforeEach(async ({ page, request }) => {
    await clearProcessedWebhooks(request);
    await resetProjectStatus(request, '1');
    await page.goto('/projects/1');
    await page.waitForSelector('[data-testid="kanban-board"]', { timeout: 10000 });
  });
  test('T54: Run All → task assigned to agent (role visible)', async ({ page, request }) => {
    const apiTask = await createTask(request, '1', 'Build API endpoint for user auth', 'Create POST /api/auth/login endpoint');
    try {
      await page.reload();
      await page.waitForSelector('[data-testid="kanban-board"]', { timeout: 10000 });
      const runAllButton = page.locator('[data-testid="run-all-button"]');
      await expect(runAllButton).toBeVisible();
      // Click Run All and wait for API response
      const runAllPromise = page.waitForResponse(
        (res) => res.url().includes('/api/projects/1/run-all') && res.status() === 200
      );
      await runAllButton.click();
      await runAllPromise;
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('RUNNING', { timeout: 5000 });
      // Reload to get fresh task state (UI doesn't auto-refresh task list)
      await page.reload();
      await page.waitForSelector('[data-testid="kanban-board"]', { timeout: 10000 });
      const inProgressColumn = page.locator('[data-testid="column-in_progress"]');
      await expect(inProgressColumn.locator(`[data-testid="task-card-${apiTask.id}"]`)).toBeVisible({ timeout: 5000 });
      await page.locator(`[data-testid="task-card-${apiTask.id}"]`).click();
      await page.waitForSelector('[data-testid="task-details-panel"]', { timeout: 5000 });
      const agentRole = page.locator('[data-testid="agent-role"]');
      await expect(agentRole).toBeVisible({ timeout: 5000 });
      await expect(agentRole).toContainText('Backend');
      const attemptsHistory = page.locator('[data-testid="attempts-history"]');
      await expect(attemptsHistory).toBeVisible({ timeout: 5000 });
      const attemptItems = attemptsHistory.locator('[data-testid^="attempt-item-"]');
      await expect(attemptItems.first()).toBeVisible({ timeout: 5000 });
    } finally {
      await safeCleanup(request, [apiTask.id]);
    }
  });
  test('T55: Agent creates PR automatically', async ({ page, request }) => {
    const task = await createTask(request, '1', 'Add API endpoint for user profile', 'Create GET /api/user/profile endpoint');
    try {
      await page.reload();
      await page.waitForSelector('[data-testid="kanban-board"]', { timeout: 10000 });
      const runAllButton = page.locator('[data-testid="run-all-button"]');
      const runAllPromise = page.waitForResponse(
        (res) => res.url().includes('/api/projects/1/run-all') && res.status() === 200
      );
      await runAllButton.click();
      await runAllPromise;
      // Reload to get fresh task state
      await page.reload();
      await page.waitForSelector('[data-testid="kanban-board"]', { timeout: 10000 });
      const inProgressColumn = page.locator('[data-testid="column-in_progress"]');
      await expect(inProgressColumn.locator(`[data-testid="task-card-${task.id}"]`)).toBeVisible({ timeout: 5000 });
      const attemptsResponse = await request.get(`http://localhost:8000/api/tasks/${task.id}/attempts`);
      const attempts = await attemptsResponse.json();
      const attemptId = attempts[0]?.id;
      if (attemptId) {
        // Finish attempt and reload to see updated task state
        await request.post(`http://localhost:8000/api/test/fixtures/attempt/${attemptId}/finish`);
        await page.reload();
        await page.waitForSelector('[data-testid="kanban-board"]', { timeout: 10000 });
        const inReviewColumn = page.locator('[data-testid="column-in_review"]');
        await expect(inReviewColumn.locator(`[data-testid="task-card-${task.id}"]`)).toBeVisible({ timeout: 5000 });
        await page.locator(`[data-testid="task-card-${task.id}"]`).click();
        await page.waitForSelector('[data-testid="task-details-panel"]', { timeout: 5000 });
        const prLink = page.locator('[data-testid="pr-link"]');
        await expect(prLink).toBeVisible({ timeout: 5000 });
        const prBadge = page.locator('[data-testid="pr-status-badge"]');
        await expect(prBadge).toBeVisible({ timeout: 5000 });
      }
    } finally {
      await safeCleanup(request, [task.id]);
    }
  });
  test('T56: Attempt finishes → next task starts', async ({ page, request }) => {
    const task1 = await createTask(request, '1', 'Build API endpoint', 'Task 1');
    const task2 = await createTask(request, '1', 'Build UI component', 'Task 2');
    const task3 = await createTask(request, '1', 'Add tests', 'Task 3');
    try {
      await page.reload();
      await page.waitForSelector('[data-testid="kanban-board"]', { timeout: 10000 });
      const runAllButton = page.locator('[data-testid="run-all-button"]');
      const runAllPromise = page.waitForResponse(
        (res) => res.url().includes('/api/projects/1/run-all') && res.status() === 200
      );
      await runAllButton.click();
      await runAllPromise;
      // Reload to get fresh task state
      await page.reload();
      await page.waitForSelector('[data-testid="kanban-board"]', { timeout: 10000 });
      const inProgressColumn = page.locator('[data-testid="column-in_progress"]');
      await expect(inProgressColumn.locator(`[data-testid="task-card-${task1.id}"]`)).toBeVisible({ timeout: 5000 });
      const attempts1Response = await request.get(`http://localhost:8000/api/tasks/${task1.id}/attempts`);
      const attempts1 = await attempts1Response.json();
      const attempt1Id = attempts1[0]?.id;
      if (attempt1Id) {
        await request.post(`http://localhost:8000/api/test/fixtures/attempt/${attempt1Id}/finish`);
        await page.reload();
        await page.waitForSelector('[data-testid="kanban-board"]', { timeout: 10000 });
        // Wait for task2 to move to in_progress (next task starts)
        const inProgressCol = page.locator('[data-testid="column-in_progress"]');
        await expect(inProgressCol.locator(`[data-testid="task-card-${task2.id}"]`)).toBeVisible({ timeout: 5000 });
        // Wait for task1 to move to in_review
        const inReviewColumn = page.locator('[data-testid="column-in_review"]');
        await expect(inReviewColumn.locator(`[data-testid="task-card-${task1.id}"]`)).toBeVisible({ timeout: 5000 });
      }
    } finally {
      await safeCleanup(request, [task1.id, task2.id, task3.id]);
    }
  });
  test('T57: Deterministic output in PLAYWRIGHT=1', async ({ page, request }) => {
    const task1 = await createTask(request, '1', 'Build API endpoint', 'Create POST /api/users endpoint');
    const task2 = await createTask(request, '1', 'Build API endpoint', 'Create POST /api/users endpoint');
    try {
      await page.reload();
      await page.waitForSelector('[data-testid="kanban-board"]', { timeout: 10000 });
      const runAllButton = page.locator('[data-testid="run-all-button"]');
      const runAllPromise = page.waitForResponse(
        (res) => res.url().includes('/api/projects/1/run-all') && res.status() === 200
      );
      await runAllButton.click();
      await runAllPromise;
      // Reload to get fresh task state
      await page.reload();
      await page.waitForSelector('[data-testid="kanban-board"]', { timeout: 10000 });
      // Wait for task1 to be in progress
      const inProgressColumn = page.locator('[data-testid="column-in_progress"]');
      await expect(inProgressColumn.locator(`[data-testid="task-card-${task1.id}"]`)).toBeVisible({ timeout: 5000 });
      const attempts1Response = await request.get(`http://localhost:8000/api/tasks/${task1.id}/attempts`);
      const attempts1 = await attempts1Response.json();
      const attempt1 = attempts1[0];
      if (attempt1?.id) {
        await request.post(`http://localhost:8000/api/test/fixtures/attempt/${attempt1.id}/finish`);
        await page.reload();
        await page.waitForSelector('[data-testid="kanban-board"]', { timeout: 10000 });
        // Wait for task1 to move to in_review
        const inReviewColumn = page.locator('[data-testid="column-in_review"]');
        await expect(inReviewColumn.locator(`[data-testid="task-card-${task1.id}"]`)).toBeVisible({ timeout: 5000 });
      }
      const attempts2Response = await request.get(`http://localhost:8000/api/tasks/${task2.id}/attempts`);
      const attempts2 = await attempts2Response.json();
      const attempt2 = attempts2[0];
      expect(attempt1.agent).toBe(attempt2.agent);
      await page.locator(`[data-testid="task-card-${task1.id}"]`).click();
      await page.waitForSelector('[data-testid="task-details-panel"]', { timeout: 5000 });
      const pr1Link = page.locator('[data-testid="pr-link"]');
      await expect(pr1Link).toBeVisible({ timeout: 5000 });
      const pr1Text = await pr1Link.textContent();
      await page.locator('[data-testid="close-details"]').click();
      await page.locator(`[data-testid="task-card-${task2.id}"]`).click();
      await page.waitForSelector('[data-testid="task-details-panel"]', { timeout: 5000 });
      const pr2Link = page.locator('[data-testid="pr-link"]');
      await expect(pr2Link).toBeVisible({ timeout: 5000 });
      const pr2Text = await pr2Link.textContent();
      expect(pr1Text).toBeTruthy();
      expect(pr2Text).toBeTruthy();
    } finally {
      await safeCleanup(request, [task1.id, task2.id]);
    }
  });
});
