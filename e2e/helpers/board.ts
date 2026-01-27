import { Page, expect, APIRequestContext } from '@playwright/test';

// Network errors that should trigger retry
const RETRYABLE_ERRORS = ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'EAI_AGAIN', 'EPIPE'];

/**
 * Check if error is retryable (network issue or 5xx)
 */
function isRetryableError(error: unknown, response?: { status: () => number }): boolean {
  if (response && response.status() >= 500) return true;
  if (error instanceof Error) {
    return RETRYABLE_ERRORS.some((code) => error.message.includes(code));
  }
  return false;
}

/**
 * Retry wrapper with exponential backoff
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxAttempts?: number; baseDelayMs?: number } = {}
): Promise<T> {
  const { maxAttempts = 4, baseDelayMs = 250 } = options;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts || !isRetryableError(error)) {
        throw error;
      }
      const delay = baseDelayMs * Math.pow(2, attempt - 1); // 250, 500, 1000
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

/**
 * Wait for server to be ready (health check)
 * Polls a lightweight endpoint until server responds
 */
async function waitForServerReady(
  request: APIRequestContext,
  options: { timeoutMs?: number; intervalMs?: number } = {}
): Promise<void> {
  const { timeoutMs = 10000, intervalMs = 250 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await request.get('/api/settings');
      if (response.ok()) return;
    } catch {
      // Server not ready yet, continue polling
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`Server not ready after ${timeoutMs}ms`);
}

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
  // Health check: wait for server to be ready before making mutations
  await waitForServerReady(request);

  // POST with retry for transient network errors
  await withRetry(async () => {
    const response = await request.post('/api/test/fixtures/execution-ready', {
      data: { projectId },
    });
    if (!response.ok()) {
      const text = await response.text();
      // Don't retry 4xx (contract/logic errors)
      if (response.status() >= 400 && response.status() < 500) {
        throw new Error(`Failed to set execution ready (${response.status()}): ${text}`);
      }
      // 5xx gets retried via isRetryableError
      const err = new Error(`Failed to set execution ready (${response.status()}): ${text}`);
      (err as any).response = response;
      throw err;
    }
  });
}
