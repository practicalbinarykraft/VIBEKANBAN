import { test, expect } from '@playwright/test';
import { waitForBoardReady } from '../helpers/board';

/**
 * E2E tests for Autopilot feature (EPIC-7)
 *
 * Tests autopilot panel visibility and initial state.
 */

test.describe('Autopilot', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/projects/1');
    await waitForBoardReady(page);
  });

  test('T13: Autopilot panel shows with plan and displays controls', async ({ page, request }) => {
    // 1. Reset and navigate
    await request.post('/api/projects/1/reset');
    await page.goto('/projects/1');
    await waitForBoardReady(page);

    // 2. Go to Planning tab
    await page.locator('[data-testid="planning-tab"]').click();

    // 3. Enter idea that creates plan with many steps
    const ideaInput = page.locator('[data-testid="planning-idea-input"]');
    await ideaInput.fill('Build complete e-commerce platform with product catalog and user authentication');

    // 4. Start council → wait for chat
    await page.locator('[data-testid="planning-start-button"]').click();
    await expect(page.locator('[data-testid="council-chat"]')).toBeVisible({ timeout: 10000 });

    // 5. Finish discussion → wait for plan
    await page.locator('[data-testid="planning-finish-button"]').click();
    await expect(page.locator('[data-testid="product-plan"]')).toBeVisible({ timeout: 10000 });

    // 6. Verify autopilot panel is visible (after plan exists)
    const autopilotPanel = page.locator('[data-testid="autopilot-panel"]');
    await expect(autopilotPanel).toBeVisible({ timeout: 5000 });

    // 7. Verify initial state shows "Ready to start"
    const statusText = page.locator('[data-testid="autopilot-status"]');
    await expect(statusText).toContainText('Ready to start');

    // 8. Verify task progress shows total tasks (from plan steps)
    const taskProgress = page.locator('[data-testid="autopilot-task-progress"]');
    const progressText = await taskProgress.textContent();
    expect(progressText).toMatch(/^0\/\d+$/); // Format: 0/N where N > 0

    // 9. Verify Run All button is enabled
    const runAllButton = page.locator('[data-testid="autopilot-auto-button"]');
    await expect(runAllButton).toBeEnabled({ timeout: 5000 });

    // 10. Verify Run Next button is enabled
    const runNextButton = page.locator('[data-testid="autopilot-step-button"]');
    await expect(runNextButton).toBeEnabled();
  });
});
