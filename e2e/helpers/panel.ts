import { Page } from '@playwright/test';

/**
 * Navigate to task and wait for panel to load
 */
export async function openTaskPanel(page: Page, projectId: string, taskId: string, attemptId?: string) {
  const url = attemptId
    ? `/projects/${projectId}?task=${taskId}&attempt=${attemptId}`
    : `/projects/${projectId}?task=${taskId}`;
  await page.goto(url);
  await page.waitForSelector('[data-testid="task-details-panel"]', { timeout: 5000 });
}

/**
 * Wait for execution details section
 */
export async function waitForExecutionDetails(page: Page) {
  await page.waitForSelector('[data-testid="execution-details"]', { timeout: 5000 });
}

/**
 * Wait for task tabs to be visible
 */
export async function waitForTaskTabs(page: Page) {
  await page.waitForSelector('[data-testid="task-tabs"]', { timeout: 5000 });
}

/**
 * Check if Apply error is visible
 */
export function getApplyErrorBox(page: Page) {
  return page.locator('[data-testid="apply-error"]');
}

/**
 * Get PR preview block
 */
export function getPRPreview(page: Page) {
  return page.locator('[data-testid="pr-preview"]');
}
