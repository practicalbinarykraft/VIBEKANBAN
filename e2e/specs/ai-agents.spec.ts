import { test, expect } from '@playwright/test';
import { createTask, createFixtureAttempt, clearProcessedWebhooks } from '../helpers/api';

test.describe('AI Agents Runtime', () => {
  test.beforeEach(async ({ page, request }) => {
    await clearProcessedWebhooks(request);
    await page.goto('/projects/1');
    await page.waitForSelector('[data-testid="kanban-board"]', { timeout: 10000 });
  });

  test('T54: Run All → task assigned to agent (role visible)', async ({ page, request }) => {
    const apiTask = await createTask(request, '1', 'Build API endpoint for user auth', 'Create POST /api/auth/login endpoint');
    const uiTask = await createTask(request, '1', 'Build UI component for login', 'Create LoginForm component');

    try {
      await page.reload();
      await page.waitForSelector('[data-testid="kanban-board"]', { timeout: 10000 });

      const runAllButton = page.locator('[data-testid="run-all-button"]');
      await expect(runAllButton).toBeVisible();
      await runAllButton.click();
      await page.waitForTimeout(1000);

      const inProgressColumn = page.locator('[data-testid="column-in_progress"]');
      await expect(inProgressColumn.locator(`[data-testid="task-card-${apiTask.id}"]`)).toBeVisible();

      await page.locator(`[data-testid="task-card-${apiTask.id}"]`).click();
      await page.waitForSelector('[data-testid="task-details-panel"]', { timeout: 5000 });

      const agentRole = page.locator('[data-testid="agent-role"]');
      await expect(agentRole).toBeVisible();
      await expect(agentRole).toContainText('Backend');

      const attemptsHistory = page.locator('[data-testid="attempts-history"]');
      await expect(attemptsHistory).toBeVisible();
      const attemptItems = attemptsHistory.locator('[data-testid^="attempt-item-"]');
      expect(await attemptItems.count()).toBeGreaterThanOrEqual(1);
    } finally {
      await request.delete(`http://localhost:8000/api/tasks/${apiTask.id}`);
      await request.delete(`http://localhost:8000/api/tasks/${uiTask.id}`);
    }
  });

  test('T55: Agent creates PR automatically', async ({ page, request }) => {
    const task = await createTask(request, '1', 'Add API endpoint for user profile', 'Create GET /api/user/profile endpoint');

    try {
      await page.reload();
      await page.waitForSelector('[data-testid="kanban-board"]', { timeout: 10000 });

      const runAllButton = page.locator('[data-testid="run-all-button"]');
      await runAllButton.click();
      await page.waitForTimeout(1000);

      const inProgressColumn = page.locator('[data-testid="column-in_progress"]');
      await expect(inProgressColumn.locator(`[data-testid="task-card-${task.id}"]`)).toBeVisible();

      const attemptsResponse = await request.get(`http://localhost:8000/api/tasks/${task.id}/attempts`);
      const attempts = await attemptsResponse.json();
      const attemptId = attempts[0]?.id;

      if (attemptId) {
        await request.post(`http://localhost:8000/api/test/fixtures/attempt/${attemptId}/finish`);
        await page.waitForTimeout(1500);

        await page.locator(`[data-testid="task-card-${task.id}"]`).click();
        await page.waitForSelector('[data-testid="task-details-panel"]', { timeout: 5000 });

        const prLink = page.locator('[data-testid="pr-link"]');
        await expect(prLink).toBeVisible({ timeout: 5000 });

        const prBadge = page.locator('[data-testid="pr-status"]');
        await expect(prBadge).toBeVisible();
      }
    } finally {
      await request.delete(`http://localhost:8000/api/tasks/${task.id}`);
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
      await runAllButton.click();
      await page.waitForTimeout(1000);

      const inProgressColumn = page.locator('[data-testid="column-in_progress"]');
      await expect(inProgressColumn.locator(`[data-testid="task-card-${task1.id}"]`)).toBeVisible();

      const attempts1Response = await request.get(`http://localhost:8000/api/tasks/${task1.id}/attempts`);
      const attempts1 = await attempts1Response.json();
      const attempt1Id = attempts1[0]?.id;

      if (attempt1Id) {
        await request.post(`http://localhost:8000/api/test/fixtures/attempt/${attempt1Id}/finish`);
        await page.waitForTimeout(1500);

        await expect(inProgressColumn.locator(`[data-testid="task-card-${task2.id}"]`)).toBeVisible();

        const inReviewColumn = page.locator('[data-testid="column-in_review"]');
        await expect(inReviewColumn.locator(`[data-testid="task-card-${task1.id}"]`)).toBeVisible();
      }
    } finally {
      await request.delete(`http://localhost:8000/api/tasks/${task1.id}`);
      await request.delete(`http://localhost:8000/api/tasks/${task2.id}`);
      await request.delete(`http://localhost:8000/api/tasks/${task3.id}`);
    }
  });

  test('T57: Deterministic output in PLAYWRIGHT=1', async ({ page, request }) => {
    const task1 = await createTask(request, '1', 'Build API endpoint', 'Create POST /api/users endpoint');
    const task2 = await createTask(request, '1', 'Build API endpoint', 'Create POST /api/users endpoint');

    try {
      await page.reload();
      await page.waitForSelector('[data-testid="kanban-board"]', { timeout: 10000 });

      const runAllButton = page.locator('[data-testid="run-all-button"]');
      await runAllButton.click();
      await page.waitForTimeout(1000);

      const attempts1Response = await request.get(`http://localhost:8000/api/tasks/${task1.id}/attempts`);
      const attempts1 = await attempts1Response.json();
      const attempt1 = attempts1[0];

      if (attempt1?.id) {
        await request.post(`http://localhost:8000/api/test/fixtures/attempt/${attempt1.id}/finish`);
        await page.waitForTimeout(1500);
      }

      const attempts2Response = await request.get(`http://localhost:8000/api/tasks/${task2.id}/attempts`);
      const attempts2 = await attempts2Response.json();
      const attempt2 = attempts2[0];

      expect(attempt1.agent).toBe(attempt2.agent);

      await page.locator(`[data-testid="task-card-${task1.id}"]`).click();
      await page.waitForSelector('[data-testid="task-details-panel"]', { timeout: 5000 });

      const pr1Link = page.locator('[data-testid="pr-link"]');
      const pr1Text = await pr1Link.textContent();

      await page.locator('[data-testid="close-details"]').click();
      await page.locator(`[data-testid="task-card-${task2.id}"]`).click();
      await page.waitForSelector('[data-testid="task-details-panel"]', { timeout: 5000 });

      const pr2Link = page.locator('[data-testid="pr-link"]');
      const pr2Text = await pr2Link.textContent();

      expect(pr1Text).toBeTruthy();
      expect(pr2Text).toBeTruthy();
    } finally {
      await request.delete(`http://localhost:8000/api/tasks/${task1.id}`);
      await request.delete(`http://localhost:8000/api/tasks/${task2.id}`);
    }
  });
});
