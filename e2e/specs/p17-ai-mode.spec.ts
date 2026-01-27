import { test, expect } from "@playwright/test";
import { resetProjectStatus } from "../helpers/api";
import {
  trackConsoleAndPageErrors,
  clickNoNav,
  expectHealthy,
  waitVisible,
} from "../helpers/e2e-critical";

/**
 * P17-B: AI Mode Banner E2E tests
 * PR-128: Updated for new Chat → Council flow
 */
test.describe("P17-B: AI Mode Banner", () => {
  test.beforeEach(async ({ page, request }) => {
    // Reset project state (clears chat history, council threads, etc.)
    await resetProjectStatus(request, "1");
    // Reset to demo mode for AI mode tests (other tests may set anthropic)
    await request.put("/api/settings", {
      data: { provider: "demo", anthropicApiKey: "", openaiApiKey: "" },
    });
    // Navigate to project board first to trigger seeding
    await page.goto("/projects/1");
    await page.waitForSelector('[data-testid="kanban-board"]', {
      timeout: 10000,
    });
  });

  test("Planning tab shows AI mode banner", async ({ page }) => {
    const tracked = trackConsoleAndPageErrors(page);

    // Click Planning tab
    const planningTab = page.locator('[data-testid="planning-tab"]');
    await expect(planningTab).toBeVisible();
    await planningTab.click();

    // Wait for banner to appear (in chat header)
    const banner = page.locator('[data-testid="ai-mode-banner"]');
    await expect(banner).toBeVisible({ timeout: 5000 });

    // In test mode (PLAYWRIGHT=1), should show Demo mode
    await expect(banner).toHaveAttribute("data-mode", "demo");
    await expect(banner).toContainText("Demo Mode");

    // Health check
    await expectHealthy(page, tracked);
  });

  test("Settings page shows AI mode section", async ({ page }) => {
    const tracked = trackConsoleAndPageErrors(page);

    // Go to settings
    await page.goto("/settings");

    // Wait for AI mode section
    const section = page.locator('[data-testid="ai-mode-section"]');
    await expect(section).toBeVisible({ timeout: 5000 });

    // Should show Demo badge (PLAYWRIGHT=1 in tests)
    await expect(section).toContainText("Demo");

    // Health check
    await expectHealthy(page, tracked);
  });

  test("Run Consilium button is enabled in demo mode after chat message", async ({ page }) => {
    const tracked = trackConsoleAndPageErrors(page);

    // Click Planning tab
    await page.locator('[data-testid="planning-tab"]').click();

    // Wait for banner (in chat header)
    await expect(page.locator('[data-testid="ai-mode-banner"]')).toBeVisible({
      timeout: 5000,
    });

    // Run Consilium button should be disabled initially (no chat messages)
    const runBtn = page.locator('[data-testid="run-consilium"]');
    await waitVisible(runBtn);
    await expect(runBtn).toBeDisabled();

    // Send a chat message
    const chatInput = page.locator('[data-testid="chat-input"]');
    await waitVisible(chatInput);
    await chatInput.fill("Test idea");
    await clickNoNav(page.locator('[data-testid="chat-send"]'));

    // Wait for AI response
    await waitVisible(page.locator('[data-testid="chat-message-ai"]').first(), 15000);
    await page.waitForTimeout(500);

    // Run Consilium button should now be enabled (demo mode allows AI + has user message)
    await expect(runBtn).toBeEnabled({ timeout: 10000 });

    // Health check
    await expectHealthy(page, tracked);
  });
});
