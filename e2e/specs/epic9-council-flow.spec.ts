import { test, expect } from "@playwright/test";
import { waitForBoardReady, getTaskCountInColumn } from "../helpers/board";
import { resetProjectStatus } from "../helpers/api";

/**
 * EPIC-9: Council-based Planning Flow E2E tests
 *
 * Tests the new council dialogue → plan → approve flow:
 * - Council dialogue appears after starting
 * - Plan is generated as separate artifact
 * - Approve + create tasks adds to backlog
 *
 * Phases: idle → kickoff → awaiting_response → plan_ready → approved → tasks_created
 */

test.describe("EPIC-9 Council Planning Flow", () => {
  test.beforeEach(async ({ page, request }) => {
    // Reset project state including council threads
    await resetProjectStatus(request, "1");

    await page.goto("/projects/1");
    await waitForBoardReady(page);
    await page.locator('[data-testid="planning-tab"]').click();
    await expect(page.locator('[data-testid="planning-idea-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="planning-idea-input"]')).toBeEnabled();
  });

  test("T_EPIC9_1: Council dialogue appears after start", async ({ page }) => {
    // Enter idea
    const ideaInput = page.locator('[data-testid="planning-idea-input"]');
    await ideaInput.fill("Build a todo app with React and TypeScript");

    // Start council
    const startButton = page.locator('[data-testid="planning-start-button"]');
    await expect(startButton).toBeEnabled();
    await startButton.click();

    // Wait for council console to appear
    const councilConsole = page.locator('[data-testid="council-console"]');
    await expect(councilConsole).toBeVisible({ timeout: 15000 });

    // Council dialogue should be visible
    const councilDialogue = page.locator('[data-testid="council-dialogue"]');
    await expect(councilDialogue).toBeVisible({ timeout: 10000 });

    // Should have at least one council message
    const messages = page.locator('[data-testid^="council-msg-"]');
    await expect(messages.first()).toBeVisible({ timeout: 10000 });
  });

  test("T_EPIC9_2: Generate plan produces plan artifact view", async ({ page }) => {
    // Enter idea
    const ideaInput = page.locator('[data-testid="planning-idea-input"]');
    await ideaInput.fill("Build a simple blog with posts and comments");

    // Start council
    await page.locator('[data-testid="planning-start-button"]').click();

    // Wait for council dialogue
    await expect(page.locator('[data-testid="council-dialogue"]')).toBeVisible({ timeout: 15000 });

    // Wait for response input to appear (awaiting_response phase)
    const responseInput = page.locator('[data-testid="response-input"]');
    await expect(responseInput).toBeVisible({ timeout: 15000 });

    // Enter response to move to plan_ready phase
    await responseInput.fill("Yes, let's focus on the core blog functionality first.");
    await page.locator('[data-testid="submit-response-btn"]').click();

    // Wait for Generate Plan button to appear (plan_ready phase)
    const generateBtn = page.locator('[data-testid="generate-plan-btn"]');
    await expect(generateBtn).toBeVisible({ timeout: 30000 });

    // Click Generate Plan to create the plan
    await generateBtn.click();

    // Wait for Plan tab to become enabled (plan generated, text changes to "Plan v1")
    const planTabBtn = page.getByRole("button", { name: /Plan v/i });
    await expect(planTabBtn).toBeEnabled({ timeout: 30000 });

    // Click Plan tab to see plan view
    await planTabBtn.click();

    // Approve Plan button should be visible
    const approveBtn = page.locator('[data-testid="approve-plan-btn"]');
    await expect(approveBtn).toBeVisible({ timeout: 10000 });
  });

  test("T_EPIC9_3: Approve plan and create tasks adds to backlog", async ({ page }) => {
    // Count TODO tasks before (we're already on Tasks tab from beforeEach → waitForBoardReady)
    await page.locator('[data-testid="tasks-tab"]').click();
    await waitForBoardReady(page);
    const countBefore = await getTaskCountInColumn(page, "todo");

    // Go back to Planning tab
    await page.locator('[data-testid="planning-tab"]').click();
    await expect(page.locator('[data-testid="planning-idea-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="planning-idea-input"]')).toBeEnabled();

    // Enter idea
    const ideaInput = page.locator('[data-testid="planning-idea-input"]');
    await ideaInput.fill("Build user authentication with login and signup");

    // Start council
    await page.locator('[data-testid="planning-start-button"]').click();

    // Wait for council dialogue
    await expect(page.locator('[data-testid="council-dialogue"]')).toBeVisible({ timeout: 15000 });

    // Wait for response input and submit response
    const responseInput = page.locator('[data-testid="response-input"]');
    await expect(responseInput).toBeVisible({ timeout: 15000 });
    await responseInput.fill("Let's start with basic JWT authentication.");
    await page.locator('[data-testid="submit-response-btn"]').click();

    // Wait for Generate Plan button to appear (plan_ready phase)
    const generateBtn = page.locator('[data-testid="generate-plan-btn"]');
    await expect(generateBtn).toBeVisible({ timeout: 30000 });

    // Click Generate Plan to create the plan
    await generateBtn.click();

    // Wait for Plan tab to become enabled (plan generated)
    const planTabBtn = page.getByRole("button", { name: /Plan v/i });
    await expect(planTabBtn).toBeEnabled({ timeout: 30000 });

    // Click Plan tab to see plan view
    await planTabBtn.click();

    // Click approve
    const approveBtn = page.locator('[data-testid="approve-plan-btn"]');
    await expect(approveBtn).toBeVisible({ timeout: 10000 });
    await approveBtn.click();

    // Click create tasks
    const createTasksBtn = page.locator('[data-testid="create-tasks-btn"]');
    await expect(createTasksBtn).toBeVisible({ timeout: 10000 });
    await createTasksBtn.click();

    // Wait for board ready (should switch to Tasks tab)
    await waitForBoardReady(page);

    // Verify TODO count increased
    const countAfter = await getTaskCountInColumn(page, "todo");
    expect(countAfter).toBeGreaterThan(countBefore);
  });

  test("should disable start button when textarea is empty", async ({ page }) => {
    // Verify button is disabled when textarea is empty
    const startButton = page.locator('[data-testid="planning-start-button"]');
    await expect(startButton).toBeDisabled();

    // Enter some text
    const ideaInput = page.locator('[data-testid="planning-idea-input"]');
    await ideaInput.fill("Some idea");

    // Button should now be enabled
    await expect(startButton).toBeEnabled();
  });
});
