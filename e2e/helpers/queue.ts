import { Page, APIRequestContext } from '@playwright/test';

/**
 * Cleanup all running/queued attempts in a project
 */
export async function cleanupRunningAttempts(request: APIRequestContext, projectId: string) {
  await request.post('/api/test/fixtures/attempt/cleanup-running', {
    data: { projectId }
  });
}

/**
 * Wait for attempts history to load and refetch attempts
 */
export async function waitForAttemptsHistory(page: Page) {
  await page.waitForSelector('[data-testid="attempts-history"]', { timeout: 5000 });
}

/**
 * Trigger refetch of attempts via window.__VIBE__ bridge
 */
export async function refetchAttempts(page: Page) {
  await page.evaluate(() => (window as any).__VIBE__.refetchAttempts());
}

/**
 * Wait for attempt status badge with specific status
 */
export async function waitForAttemptStatus(page: Page, status: 'running' | 'queued' | 'completed' | 'stopped') {
  await page.waitForSelector(`[data-testid="attempt-status"][data-status="${status}"]`, { timeout: 5000 });
}

/**
 * Navigate to task panel and wait for it to load
 */
export async function navigateToTask(page: Page, projectId: string, taskId: string, attemptId?: string) {
  const url = attemptId
    ? `/projects/${projectId}?task=${taskId}&attempt=${attemptId}`
    : `/projects/${projectId}?task=${taskId}`;
  await page.goto(url);
  await page.waitForSelector('[data-testid="task-details-panel"]', { timeout: 5000 });
}
