import { Page, expect } from '@playwright/test';

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
