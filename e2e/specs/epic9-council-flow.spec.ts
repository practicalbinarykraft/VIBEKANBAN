import { test, expect } from "@playwright/test";
import { waitForBoardReady, getTaskCountInColumn } from "../helpers/board";
import { resetProjectStatus } from "../helpers/api";
import {
  trackConsoleAndPageErrors,
  clickNoNav,
  expectHealthy,
  waitVisible,
} from "../helpers/e2e-critical";

/**
 * EPIC-9: Council-based Planning Flow E2E tests (Critical Path)
 *
 * Tests critical path only:
 * - Page loads without crash
 * - Buttons are clickable
 * - No 5xx errors
 *
 * NO text assertions, NO navigation waits, NO env-var dependencies
 */

test.describe("EPIC-9 Council Planning Flow", () => {
  test.beforeEach(async ({ page, request }) => {
    await resetProjectStatus(request, "1");
    await page.goto("/projects/1");
    await waitForBoardReady(page);
  });

  test("T_EPIC9_1: Council dialogue appears after start", async ({ page }) => {
    const tracked = trackConsoleAndPageErrors(page);

    // Navigate to Planning tab
    await page.locator('[data-testid="planning-tab"]').click();
    await waitVisible(page.locator('[data-testid="planning-idea-input"]'));

    // Enter idea
    const ideaInput = page.locator('[data-testid="planning-idea-input"]');
    await ideaInput.fill("Build a todo app with React and TypeScript");

    // Start council
    const startButton = page.locator('[data-testid="planning-start-button"]');
    await expect(startButton).toBeEnabled();
    await clickNoNav(startButton);

    // Wait for council console to appear
    const councilConsole = page.locator('[data-testid="council-console"]');
    await waitVisible(councilConsole, 15000);

    // Council dialogue should be visible
    const councilDialogue = page.locator('[data-testid="council-dialogue"]');
    await waitVisible(councilDialogue, 10000);

    // Should have at least one council message (element exists)
    const messages = page.locator('[data-testid^="council-msg-"]');
    await waitVisible(messages.first(), 10000);

    // Health check
    await expectHealthy(page, tracked);
  });

  test("T_EPIC9_2: Generate plan produces plan artifact view", async ({
    page,
  }) => {
    const tracked = trackConsoleAndPageErrors(page);

    // Navigate to Planning tab
    await page.locator('[data-testid="planning-tab"]').click();
    await waitVisible(page.locator('[data-testid="planning-idea-input"]'));

    // Enter idea
    const ideaInput = page.locator('[data-testid="planning-idea-input"]');
    await ideaInput.fill("Build a simple blog with posts and comments");

    // Start council
    await clickNoNav(page.locator('[data-testid="planning-start-button"]'));

    // Wait for council dialogue
    await waitVisible(page.locator('[data-testid="council-dialogue"]'), 15000);

    // Wait for response input (awaiting_response phase)
    const responseInput = page.locator('[data-testid="response-input"]');
    await waitVisible(responseInput, 15000);

    // Enter response
    await responseInput.fill("Yes, let's focus on the core blog functionality first.");
    await clickNoNav(page.locator('[data-testid="submit-response-btn"]'));

    // Wait for Generate Plan button (plan_ready phase)
    const generateBtn = page.locator('[data-testid="generate-plan-btn"]');
    await waitVisible(generateBtn, 30000);

    // Click Generate Plan
    await clickNoNav(generateBtn);

    // Wait for Plan tab to become enabled
    const planTabBtn = page.getByRole("button", { name: /Plan v/i });
    await expect(planTabBtn).toBeEnabled({ timeout: 30000 });

    // Click Plan tab
    await clickNoNav(planTabBtn);

    // Approve Plan button should be visible
    const approveBtn = page.locator('[data-testid="approve-plan-btn"]');
    await waitVisible(approveBtn, 10000);

    // Health check
    await expectHealthy(page, tracked);
  });

  test("T_EPIC9_3: Approve plan and create tasks adds to backlog", async ({
    page,
  }) => {
    const tracked = trackConsoleAndPageErrors(page);

    // Count TODO tasks before
    await page.locator('[data-testid="tasks-tab"]').click();
    await waitForBoardReady(page);
    const countBefore = await getTaskCountInColumn(page, "todo");

    // Go back to Planning tab
    await page.locator('[data-testid="planning-tab"]').click();
    await waitVisible(page.locator('[data-testid="planning-idea-input"]'));

    // Enter idea
    const ideaInput = page.locator('[data-testid="planning-idea-input"]');
    await ideaInput.fill("Build user authentication with login and signup");

    // Start council
    await clickNoNav(page.locator('[data-testid="planning-start-button"]'));

    // Wait for council dialogue
    await waitVisible(page.locator('[data-testid="council-dialogue"]'), 15000);

    // Wait for response input and submit
    const responseInput = page.locator('[data-testid="response-input"]');
    await waitVisible(responseInput, 15000);
    await responseInput.fill("Let's start with basic JWT authentication.");
    await clickNoNav(page.locator('[data-testid="submit-response-btn"]'));

    // Wait for Generate Plan button
    const generateBtn = page.locator('[data-testid="generate-plan-btn"]');
    await waitVisible(generateBtn, 30000);

    // Click Generate Plan
    await clickNoNav(generateBtn);

    // Wait for Plan tab to become enabled
    const planTabBtn = page.getByRole("button", { name: /Plan v/i });
    await expect(planTabBtn).toBeEnabled({ timeout: 30000 });

    // Click Plan tab
    await clickNoNav(planTabBtn);

    // Click approve
    const approveBtn = page.locator('[data-testid="approve-plan-btn"]');
    await waitVisible(approveBtn, 10000);
    await clickNoNav(approveBtn);

    // Click create tasks
    const createTasksBtn = page.locator('[data-testid="create-tasks-btn"]');
    await waitVisible(createTasksBtn, 10000);
    await clickNoNav(createTasksBtn);

    // Wait for board ready (should switch to Tasks tab)
    await waitForBoardReady(page);

    // Verify TODO count increased
    const countAfter = await getTaskCountInColumn(page, "todo");
    expect(countAfter).toBeGreaterThan(countBefore);

    // Health check
    await expectHealthy(page, tracked);
  });

  test("should disable start button when textarea is empty", async ({
    page,
  }) => {
    const tracked = trackConsoleAndPageErrors(page);

    // Navigate to Planning tab
    await page.locator('[data-testid="planning-tab"]').click();
    await waitVisible(page.locator('[data-testid="planning-idea-input"]'));

    // Verify button is disabled when textarea is empty
    const startButton = page.locator('[data-testid="planning-start-button"]');
    await expect(startButton).toBeDisabled();

    // Enter some text
    const ideaInput = page.locator('[data-testid="planning-idea-input"]');
    await ideaInput.fill("Some idea");

    // Button should now be enabled
    await expect(startButton).toBeEnabled();

    // Health check
    await expectHealthy(page, tracked);
  });
});
