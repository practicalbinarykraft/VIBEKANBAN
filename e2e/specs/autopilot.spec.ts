import { test, expect } from '@playwright/test';
import { waitForBoardReady } from '../helpers/board';

/**
 * E2E tests for Multi-PR Autopilot feature (P13)
 *
 * Tests autopilot panel, batch progress, and approval flow.
 */

test.describe('Multi-PR Autopilot', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/projects/1');
    await waitForBoardReady(page);
  });

  test('T13: Autopilot shows progress and allows batch approval', async ({ page, request }) => {
    // 1. Reset and navigate
    await request.post('/api/projects/1/reset');
    await page.goto('/projects/1');
    await waitForBoardReady(page);

    // 2. Go to Planning tab
    await page.locator('[data-testid="planning-tab"]').click();

    // 3. Enter idea that creates large backlog (30+ steps)
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

    // 7. Capture session ID from start request
    const startResponsePromise = page.waitForResponse((resp) =>
      resp.url().includes('/autopilot/start') && resp.request().method() === 'POST'
    );

    // 8. Click Start Autopilot button
    const startButton = page.locator('[data-testid="autopilot-start-button"]');
    await expect(startButton).toBeVisible();
    await startButton.click();

    // 9. Capture sessionId from response
    const startResponse = await startResponsePromise;
    const startJson = await startResponse.json();
    const sessionId = startJson.sessionId;
    expect(sessionId).toBeTruthy();

    // 10. Verify status changes to RUNNING
    const statusText = page.locator('[data-testid="autopilot-status"]');
    await expect(statusText).toContainText('Processing batch', { timeout: 5000 });

    // 11. Wait for current batch info to appear
    const currentBatch = page.locator('[data-testid="autopilot-current-batch"]');
    await expect(currentBatch).toBeVisible({ timeout: 10000 });

    // 12. Verify progress shows (e.g., "1/N")
    const progress = page.locator('[data-testid="autopilot-progress"]');
    const progressText = await progress.textContent();
    expect(progressText).toMatch(/^\d+\/\d+$/);

    // 13. Verify risk badge is shown
    const riskBadge = page.locator('[data-testid="batch-risk"]');
    await expect(riskBadge).toBeVisible();
    const riskText = await riskBadge.textContent();
    expect(riskText).toMatch(/(low|med|high) risk/);

    // 14. Call complete-batch API to transition to WAITING_APPROVAL (requires test header)
    const completeResponse = await request.post('/api/projects/1/planning/autopilot/complete-batch', {
      headers: { 'x-vibe-test': '1' },
      data: { sessionId },
    });
    expect(completeResponse.ok()).toBe(true);

    // 15. Poll until UI shows WAITING_APPROVAL
    await expect(statusText).toContainText('Waiting for approval', { timeout: 10000 });

    // 16. Approve button should be visible when waiting
    const approveButton = page.locator('[data-testid="autopilot-approve-button"]');
    await expect(approveButton).toBeVisible();

    // 17. Click approve to proceed to next batch
    await approveButton.click();

    // 18. Verify progress increments (was 1/N, now should be 2/N)
    await expect(async () => {
      const newProgress = await progress.textContent();
      const [current] = newProgress!.split('/').map(Number);
      expect(current).toBeGreaterThanOrEqual(2);
    }).toPass({ timeout: 10000 });

    // 19. Verify cancel button exists during execution
    const cancelButton = page.locator('[data-testid="autopilot-cancel-button"]');
    await expect(cancelButton).toBeVisible();
  });
});
