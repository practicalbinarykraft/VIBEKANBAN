import { test, expect } from "@playwright/test";

test.describe("P17-A: Connection Badge", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to project board first to trigger seeding
    await page.goto("/projects/1");
    await page.waitForSelector('[data-testid="kanban-board"]', {
      timeout: 10000,
    });
  });

  test("shows 'Repo URL set' when no GitHub token", async ({ page }) => {
    // Go to projects page
    await page.goto("/projects");

    // Wait for the Projects header to be visible (indicates loading complete)
    await expect(page.locator('h1:has-text("Projects")')).toBeVisible({
      timeout: 10000,
    });

    // Wait for project cards to appear (seeded project)
    await page.waitForSelector('[data-testid="connection-badge"]', {
      timeout: 10000,
    });

    // Check connection badge shows "Repo URL set" (no token in test mode)
    const badge = page.locator('[data-testid="connection-badge"]').first();
    await expect(badge).toBeVisible();
    await expect(badge).toHaveAttribute("data-status", "url_set");
    await expect(badge).toHaveText("Repo URL set");
  });

  test("badge has correct data-status attribute", async ({ page }) => {
    // Go to projects list
    await page.goto("/projects");

    // Wait for the Projects header
    await expect(page.locator('h1:has-text("Projects")')).toBeVisible({
      timeout: 10000,
    });

    // Wait for badge to appear
    await page.waitForSelector('[data-testid="connection-badge"]', {
      timeout: 10000,
    });

    // Check badge exists and has correct status
    const badge = page.locator('[data-testid="connection-badge"]').first();
    await expect(badge).toBeVisible();

    // Verify it shows url_set since no GITHUB_TOKEN in tests
    await expect(badge).toHaveAttribute("data-status", "url_set");
  });
});
