import { test, expect } from "@playwright/test";
import { waitForBoardReady } from "../helpers/board";

/**
 * P17-C3: Plan Quality Gate E2E tests
 *
 * @deprecated EPIC-9 replaced the quality gate UI with a new plan artifact view.
 * The new council-based planning flow has different validation logic.
 * See: e2e/specs/epic9-council-flow.spec.ts for the new tests.
 *
 * Tests the plan validation and quality gate UI:
 * - Quality gate appears when plan is displayed
 * - Approve button enabled when plan passes validation
 * - Approve button disabled when plan fails validation (<10 steps)
 */

// Deprecated: legacy planning flow. Replaced by EPIC-9 council-based planning.
test.describe.skip("Plan Quality Gate", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/projects/1");
    await waitForBoardReady(page);
    await page.locator('[data-testid="planning-tab"]').click();
    await expect(page.locator('[data-testid="planning-idea-input"]')).toBeVisible();
  });

  test("quality gate shows success for valid plan", async ({ page }) => {
    // Enter idea that triggers PLAN mode (includes "MVP")
    const ideaInput = page.locator('[data-testid="planning-idea-input"]');
    await ideaInput.fill("Build MVP quickly");

    // Start council
    await page.locator('[data-testid="planning-start-button"]').click();
    await expect(page.locator('[data-testid="council-chat"]')).toBeVisible({ timeout: 10000 });

    // Finish discussion
    await page.locator('[data-testid="planning-finish-button"]').click();
    await expect(page.locator('[data-testid="product-plan"]')).toBeVisible({ timeout: 10000 });

    // Quality gate should show success (plan has 60+ steps)
    const qualityGate = page.locator('[data-testid="plan-quality-gate"]');
    await expect(qualityGate).toBeVisible();
    await expect(qualityGate).toContainText("Plan meets quality requirements");
  });

  test("approve button enabled when plan passes validation", async ({ page }) => {
    // Enter idea that triggers PLAN mode
    const ideaInput = page.locator('[data-testid="planning-idea-input"]');
    await ideaInput.fill("Build MVP quickly");

    // Start council
    await page.locator('[data-testid="planning-start-button"]').click();
    await expect(page.locator('[data-testid="council-chat"]')).toBeVisible({ timeout: 10000 });

    // Finish discussion
    await page.locator('[data-testid="planning-finish-button"]').click();
    await expect(page.locator('[data-testid="product-plan"]')).toBeVisible({ timeout: 10000 });

    // Approve button should be visible and enabled
    const approveButton = page.locator('[data-testid="approve-plan-button"]');
    await expect(approveButton).toBeVisible();
    await expect(approveButton).toBeEnabled();
  });

  test("approve button disabled when plan has fewer than 10 steps", async ({ page }) => {
    // Intercept finish API and modify response to return only 3 steps
    await page.route("**/api/projects/*/planning/finish", async (route) => {
      const response = await route.fetch();
      const json = await response.json();

      // Modify productResult to have only 3 steps (below MIN_TASKS threshold)
      if (json.productResult?.mode === "PLAN" && json.productResult?.steps) {
        json.productResult.steps = json.productResult.steps.slice(0, 3);
        json.productResult.planSteps = json.productResult.planSteps?.slice(0, 3);
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(json),
      });
    });

    // Enter idea that triggers PLAN mode
    const ideaInput = page.locator('[data-testid="planning-idea-input"]');
    await ideaInput.fill("Build MVP quickly");

    // Start council
    await page.locator('[data-testid="planning-start-button"]').click();
    await expect(page.locator('[data-testid="council-chat"]')).toBeVisible({ timeout: 10000 });

    // Finish discussion (intercepted to return only 3 steps)
    await page.locator('[data-testid="planning-finish-button"]').click();
    await expect(page.locator('[data-testid="product-plan"]')).toBeVisible({ timeout: 10000 });

    // Quality gate should show failure reason
    const qualityGate = page.locator('[data-testid="plan-quality-gate"]');
    await expect(qualityGate).toBeVisible();
    await expect(qualityGate).toContainText("Plan needs improvement");

    // Should show min_tasks reason
    const reason = page.locator('[data-testid="plan-quality-reason-0"]');
    await expect(reason).toBeVisible();
    await expect(reason).toContainText("at least 10 tasks");

    // Approve button should be disabled
    const approveButton = page.locator('[data-testid="approve-plan-button"]');
    await expect(approveButton).toBeVisible();
    await expect(approveButton).toBeDisabled();

    // Apply button should also be disabled
    const applyButton = page.locator('[data-testid="apply-plan-button"]');
    await expect(applyButton).toBeDisabled();
  });

  test("quality gate shows placeholder validation error", async ({ page }) => {
    // Intercept finish API to inject placeholder text
    await page.route("**/api/projects/*/planning/finish", async (route) => {
      const response = await route.fetch();
      const json = await response.json();

      // Add placeholder text to some steps
      if (json.productResult?.mode === "PLAN" && json.productResult?.steps) {
        json.productResult.steps[2] = { title: "TBD feature", tasks: [] };
        json.productResult.planSteps[2] = "TBD feature";
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(json),
      });
    });

    // Enter idea
    const ideaInput = page.locator('[data-testid="planning-idea-input"]');
    await ideaInput.fill("Build MVP quickly");

    // Start and finish council
    await page.locator('[data-testid="planning-start-button"]').click();
    await expect(page.locator('[data-testid="council-chat"]')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="planning-finish-button"]').click();
    await expect(page.locator('[data-testid="product-plan"]')).toBeVisible({ timeout: 10000 });

    // Quality gate should show placeholder error
    const qualityGate = page.locator('[data-testid="plan-quality-gate"]');
    await expect(qualityGate).toBeVisible();
    await expect(qualityGate).toContainText("placeholder");

    // Approve should be disabled
    await expect(page.locator('[data-testid="approve-plan-button"]')).toBeDisabled();
  });
});
