import { Page, expect, APIRequestContext } from '@playwright/test';
import { postWithRetry } from './request-utils';

/**
 * Wait for board to be ready (not refreshing)
 * Use after mutations to wait for UI auto-refresh to complete
 */
export async function waitForBoardReady(page: Page, timeout = 10000) {
  // Wait for board to exist
  await page.waitForSelector('[data-testid="kanban-board"]', { timeout });

  // Wait for refreshing overlay to disappear (if present)
  const refreshingOverlay = page.locator('[data-testid="board-refreshing"]');
  await expect(refreshingOverlay).toBeHidden({ timeout });
}

/**
 * Wait for a task to appear in a specific column
 * @param page Playwright page
 * @param taskId Task ID (UUID or numeric ID)
 * @param columnStatus Column status: 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled'
 * @param timeout Timeout in ms
 */
export async function waitForTaskInColumn(
  page: Page,
  taskId: string,
  columnStatus: string,
  timeout = 10000
) {
  const column = page.locator(`[data-testid="column-${columnStatus}"]`);
  const taskCard = column.locator(`[data-testid="task-card-${taskId}"]`);

  await expect(taskCard).toBeVisible({ timeout });
}

/**
 * Wait for a task to NOT be in a specific column
 * @param page Playwright page
 * @param taskId Task ID
 * @param columnStatus Column status
 * @param timeout Timeout in ms
 */
export async function waitForTaskNotInColumn(
  page: Page,
  taskId: string,
  columnStatus: string,
  timeout = 10000
) {
  const column = page.locator(`[data-testid="column-${columnStatus}"]`);
  const taskCard = column.locator(`[data-testid="task-card-${taskId}"]`);

  await expect(taskCard).toBeHidden({ timeout });
}

/**
 * Get task count in a column
 */
export async function getTaskCountInColumn(page: Page, columnStatus: string): Promise<number> {
  const column = page.locator(`[data-testid="column-${columnStatus}"]`);
  const taskCards = column.locator('[data-testid^="task-card-"]');
  return await taskCards.count();
}

/**
 * Combined helper: wait for board ready then task in column
 * Use after API mutations
 */
export async function waitForBoardAndTaskInColumn(
  page: Page,
  taskId: string,
  columnStatus: string,
  timeout = 10000
) {
  await waitForBoardReady(page, timeout);
  await waitForTaskInColumn(page, taskId, columnStatus, timeout);
}

/**
 * Wait for execution status badge to show specific state
 * @param status Expected status: 'RUNNING' | 'IDLE' | 'PAUSED' | 'COMPLETED'
 */
export async function waitForExecutionStatus(
  page: Page,
  status: 'RUNNING' | 'IDLE' | 'PAUSED' | 'COMPLETED',
  timeout = 10000
) {
  const statusBadge = page.locator('[data-testid="execution-status"]');
  await expect(statusBadge).toContainText(new RegExp(status, 'i'), { timeout });
}

/**
 * Wait for a task card containing specific text to appear in a column
 * @param page Playwright page
 * @param columnStatus Column status: 'todo' | 'in_progress' | 'in_review' | 'done'
 * @param text Text to search for in task card
 * @param timeout Timeout in ms
 */
export async function waitForTaskWithTextInColumn(
  page: Page,
  columnStatus: string,
  text: string,
  timeout = 10000
) {
  const column = page.locator(`[data-testid="column-${columnStatus}"]`);
  const taskCard = column.locator('[data-testid^="task-card-"]', { hasText: text });
  await expect(taskCard.first()).toBeVisible({ timeout });
}

/**
 * Wait for task count in a column to increase above a minimum value
 * Uses expect.poll() to retry until condition is met
 * @param page Playwright page
 * @param columnStatus Column status
 * @param minCount Minimum expected count (exclusive - count must be > minCount)
 * @param timeout Timeout in ms
 */
export async function waitForTaskCountToIncrease(
  page: Page,
  columnStatus: string,
  minCount: number,
  timeout = 10000
) {
  await expect.poll(
    async () => {
      const count = await getTaskCountInColumn(page, columnStatus);
      return count;
    },
    {
      message: `Expected task count in ${columnStatus} to be greater than ${minCount}`,
      timeout,
    }
  ).toBeGreaterThan(minCount);
}

/**
 * Set up execution readiness for tests that need Run Task enabled
 * - Sets AI provider to anthropic with test key
 * - Creates fake .git so repo appears cloned
 *
 * Includes health check + retry to handle ECONNRESET during server startup
 */
export async function setupExecutionReady(request: APIRequestContext, projectId: string) {
  await postWithRetry(request, '/api/test/fixtures/execution-ready', { projectId });
}
