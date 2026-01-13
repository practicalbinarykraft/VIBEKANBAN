import { test, expect } from '@playwright/test';
import { createTask, createFixtureAttempt, clearProcessedWebhooks, resetProjectStatus } from '../helpers/api';

test.describe('Project Execution Orchestrator', () => {
  test.beforeEach(async ({ page, request }) => {
    await clearProcessedWebhooks(request);
    await resetProjectStatus(request, '1');
    await page.goto('/projects/1');
    await page.waitForSelector('[data-testid="kanban-board"]', { timeout: 10000 });
  });

  test('T50: Run All starts project execution and marks first task in progress', async ({ page, request }) => {
    // Create 3 tasks for orchestrator to execute
    const task1 = await createTask(request, '1', 'Task 1 for orchestration', 'First task');
    const task2 = await createTask(request, '1', 'Task 2 for orchestration', 'Second task');
    const task3 = await createTask(request, '1', 'Task 3 for orchestration', 'Third task');

    try {
      // Reload to see new tasks
      await page.reload();
      await page.waitForSelector('[data-testid="kanban-board"]', { timeout: 10000 });

      // Find and click "Run All" button
      const runAllButton = page.locator('[data-testid="run-all-button"]');
      await expect(runAllButton).toBeVisible();
      await runAllButton.click();

      // Wait for execution to start
      await page.waitForTimeout(1000);

      // Verify execution status is "Running"
      const executionStatus = page.locator('[data-testid="execution-status"]');
      await expect(executionStatus).toContainText('Running');

      // Verify first task moved to "In Progress"
      const task1Card = page.locator(`[data-testid="task-card-${task1.id}"]`);
      await expect(task1Card).toBeVisible();

      // Check if task is in "In Progress" column
      const inProgressColumn = page.locator('[data-testid="column-in_progress"]');
      await expect(inProgressColumn.locator(`[data-testid="task-card-${task1.id}"]`)).toBeVisible();

      // Open first task to verify attempt was created
      await task1Card.click();
      await page.waitForSelector('[data-testid="task-details-panel"]', { timeout: 5000 });

      // Verify attempt exists in history
      const attemptsHistory = page.locator('[data-testid="attempts-history"]');
      await expect(attemptsHistory).toBeVisible();
      const attemptItems = attemptsHistory.locator('[data-testid^="attempt-item-"]');
      expect(await attemptItems.count()).toBeGreaterThanOrEqual(1);
    } finally {
      // Cleanup
      await request.delete(`http://localhost:8000/api/tasks/${task1.id}`);
      await request.delete(`http://localhost:8000/api/tasks/${task2.id}`);
      await request.delete(`http://localhost:8000/api/tasks/${task3.id}`);
    }
  });

  test('T51: Completing attempt triggers next task start (serial execution)', async ({ page, request }) => {
    // Create 3 tasks
    const task1 = await createTask(request, '1', 'Serial task 1', 'First in queue');
    const task2 = await createTask(request, '1', 'Serial task 2', 'Second in queue');
    const task3 = await createTask(request, '1', 'Serial task 3', 'Third in queue');

    try {
      await page.reload();
      await page.waitForSelector('[data-testid="kanban-board"]', { timeout: 10000 });

      // Start execution
      await page.click('[data-testid="run-all-button"]');
      await page.waitForTimeout(1000);

      // Wait for first task to be in progress
      const inProgressColumn = page.locator('[data-testid="column-in_progress"]');
      await expect(inProgressColumn.locator(`[data-testid="task-card-${task1.id}"]`)).toBeVisible({ timeout: 5000 });

      // Get the attempt ID for task1
      const task1Attempts = await request.get(`http://localhost:8000/api/tasks/${task1.id}/attempts`);
      const attempts1 = await task1Attempts.json();
      expect(attempts1.length).toBeGreaterThan(0);
      const attempt1Id = attempts1[0].id;

      // Complete first attempt via fixture finish endpoint
      await request.post(`http://localhost:8000/api/test/fixtures/attempt/${attempt1Id}/finish`, {
        data: { success: true },
      });

      // Wait for orchestrator to tick and start next task
      await page.waitForTimeout(2000);

      // Verify task1 moved to "In Review" or "Done"
      const inReviewColumn = page.locator('[data-testid="column-in_review"]');
      const doneColumn = page.locator('[data-testid="column-done"]');
      const task1InReview = await inReviewColumn.locator(`[data-testid="task-card-${task1.id}"]`).count();
      const task1InDone = await doneColumn.locator(`[data-testid="task-card-${task1.id}"]`).count();
      expect(task1InReview + task1InDone).toBeGreaterThan(0);

      // Verify task2 started (in progress)
      await expect(inProgressColumn.locator(`[data-testid="task-card-${task2.id}"]`)).toBeVisible({ timeout: 5000 });
    } finally {
      await request.delete(`http://localhost:8000/api/tasks/${task1.id}`);
      await request.delete(`http://localhost:8000/api/tasks/${task2.id}`);
      await request.delete(`http://localhost:8000/api/tasks/${task3.id}`);
    }
  });

  test('T52: Pause stops starting new tasks', async ({ page, request }) => {
    const task1 = await createTask(request, '1', 'Pause test task 1', 'First task');
    const task2 = await createTask(request, '1', 'Pause test task 2', 'Second task');

    try {
      await page.reload();
      await page.waitForSelector('[data-testid="kanban-board"]', { timeout: 10000 });

      // Start execution
      await page.click('[data-testid="run-all-button"]');
      await page.waitForTimeout(1000);

      // Wait for first task to be in progress
      const inProgressColumn = page.locator('[data-testid="column-in_progress"]');
      await expect(inProgressColumn.locator(`[data-testid="task-card-${task1.id}"]`)).toBeVisible({ timeout: 5000 });

      // Click Pause
      await page.click('[data-testid="pause-button"]');
      await page.waitForTimeout(500);

      // Verify status is "Paused"
      const executionStatus = page.locator('[data-testid="execution-status"]');
      await expect(executionStatus).toContainText('Paused');

      // Complete first attempt
      const task1Attempts = await request.get(`http://localhost:8000/api/tasks/${task1.id}/attempts`);
      const attempts1 = await task1Attempts.json();
      const attempt1Id = attempts1[0].id;
      await request.post(`http://localhost:8000/api/test/fixtures/attempt/${attempt1Id}/finish`, {
        data: { success: true },
      });

      await page.waitForTimeout(2000);

      // Verify task2 did NOT start (still in todo)
      const todoColumn = page.locator('[data-testid="column-todo"]');
      await expect(todoColumn.locator(`[data-testid="task-card-${task2.id}"]`)).toBeVisible();
    } finally {
      await request.delete(`http://localhost:8000/api/tasks/${task1.id}`);
      await request.delete(`http://localhost:8000/api/tasks/${task2.id}`);
    }
  });

  test('T53: Resume continues from where paused', async ({ page, request }) => {
    const task1 = await createTask(request, '1', 'Resume test task 1', 'First task');
    const task2 = await createTask(request, '1', 'Resume test task 2', 'Second task');

    try {
      await page.reload();
      await page.waitForSelector('[data-testid="kanban-board"]', { timeout: 10000 });

      // Start execution
      await page.click('[data-testid="run-all-button"]');
      await page.waitForTimeout(1000);

      // Pause immediately
      await page.click('[data-testid="pause-button"]');
      await page.waitForTimeout(500);

      // Complete first attempt while paused
      const task1Attempts = await request.get(`http://localhost:8000/api/tasks/${task1.id}/attempts`);
      const attempts1 = await task1Attempts.json();
      const attempt1Id = attempts1[0].id;
      await request.post(`http://localhost:8000/api/test/fixtures/attempt/${attempt1Id}/finish`, {
        data: { success: true },
      });

      await page.waitForTimeout(1000);

      // Verify task2 NOT started yet
      const todoColumn = page.locator('[data-testid="column-todo"]');
      await expect(todoColumn.locator(`[data-testid="task-card-${task2.id}"]`)).toBeVisible();

      // Resume execution
      await page.click('[data-testid="resume-button"]');
      await page.waitForTimeout(2000);

      // Verify status is "Running"
      const executionStatus = page.locator('[data-testid="execution-status"]');
      await expect(executionStatus).toContainText('Running');

      // Verify task2 started
      const inProgressColumn = page.locator('[data-testid="column-in_progress"]');
      await expect(inProgressColumn.locator(`[data-testid="task-card-${task2.id}"]`)).toBeVisible({ timeout: 5000 });
    } finally {
      await request.delete(`http://localhost:8000/api/tasks/${task1.id}`);
      await request.delete(`http://localhost:8000/api/tasks/${task2.id}`);
    }
  });
});
