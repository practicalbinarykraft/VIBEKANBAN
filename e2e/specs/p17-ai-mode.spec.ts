import { test, expect } from "@playwright/test";

test.describe("P17-B: AI Mode Banner", () => {
  test.beforeEach(async ({ page, request }) => {
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
    // Click Planning tab
    const planningTab = page.locator('[data-testid="planning-tab"]');
    await expect(planningTab).toBeVisible();
    await planningTab.click();

    // Wait for banner to appear
    const banner = page.locator('[data-testid="ai-mode-banner"]');
    await expect(banner).toBeVisible({ timeout: 5000 });

    // In test mode (PLAYWRIGHT=1), should show Demo mode
    await expect(banner).toHaveAttribute("data-mode", "demo");
    await expect(banner).toContainText("Demo mode");
  });

  test("Settings page shows AI mode section", async ({ page }) => {
    // Go to settings
    await page.goto("/settings");

    // Wait for AI mode section
    const section = page.locator('[data-testid="ai-mode-section"]');
    await expect(section).toBeVisible({ timeout: 5000 });

    // Should show Demo badge (PLAYWRIGHT=1 in tests)
    await expect(section).toContainText("Demo");
  });

  test("Run Council button is enabled in demo mode", async ({ page }) => {
    // Click Planning tab
    await page.locator('[data-testid="planning-tab"]').click();

    // Wait for banner
    await expect(page.locator('[data-testid="ai-mode-banner"]')).toBeVisible({
      timeout: 5000,
    });

    // Enter some text
    await page.locator('[data-testid="planning-idea-input"]').fill("Test idea");

    // Run Council button should be enabled (demo mode allows AI)
    const button = page.locator('[data-testid="planning-start-button"]');
    await expect(button).toBeEnabled();
  });
});
