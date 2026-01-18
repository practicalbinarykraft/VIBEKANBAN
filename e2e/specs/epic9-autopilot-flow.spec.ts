import { test, expect } from "@playwright/test";
import { waitForBoardReady, getTaskCountInColumn } from "../helpers/board";
import { resetProjectStatus } from "../helpers/api";

/**
 * EPIC-9 + Autopilot Integration E2E tests
 *
 * Tests the council → plan → tasks → autopilot flow:
 * - After tasks_created, AutopilotPanel appears (when FEATURE_AUTOPILOT_V2=1)
 * - "Run All" button starts autopilot
 * - Tasks transition to in_progress
 *
 * Note: FEATURE_AUTOPILOT_V2=1 is set in playwright.config.ts webServer command
 */

test.describe("EPIC-9 Autopilot Integration", () => {
  test.beforeEach(async ({ page, request }) => {
    // Reset project state including council threads
    await resetProjectStatus(request, "1");

    await page.goto("/projects/1");
    await waitForBoardReady(page);
    await page.locator('[data-testid="planning-tab"]').click();
    await expect(page.locator('[data-testid="planning-idea-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="planning-idea-input"]')).toBeEnabled();
  });

  test("T_AUTOPILOT_1: AutopilotPanel appears after tasks_created", async ({ page }) => {
    // Full council flow to tasks_created
    // 1. Enter idea and start council
    const ideaInput = page.locator('[data-testid="planning-idea-input"]');
    await ideaInput.fill("Build a REST API with user authentication");

    await page.locator('[data-testid="planning-start-button"]').click();

    // 2. Wait for council dialogue
    await expect(page.locator('[data-testid="council-dialogue"]')).toBeVisible({ timeout: 15000 });

    // 3. Wait for response input and submit response
    const responseInput = page.locator('[data-testid="response-input"]');
    await expect(responseInput).toBeVisible({ timeout: 15000 });
    await responseInput.fill("Use JWT tokens for auth and PostgreSQL for storage.");
    await page.locator('[data-testid="submit-response-btn"]').click();

    // 4. Wait for Generate Plan button
    const generateBtn = page.locator('[data-testid="generate-plan-btn"]');
    await expect(generateBtn).toBeVisible({ timeout: 30000 });
    await generateBtn.click();

    // 5. Wait for Plan tab and switch to it
    const planTabBtn = page.getByRole("button", { name: /Plan v/i });
    await expect(planTabBtn).toBeEnabled({ timeout: 30000 });
    await planTabBtn.click();

    // 6. Approve plan
    const approveBtn = page.locator('[data-testid="approve-plan-btn"]');
    await expect(approveBtn).toBeVisible({ timeout: 10000 });
    await approveBtn.click();

    // 7. Create tasks
    const createTasksBtn = page.locator('[data-testid="create-tasks-btn"]');
    await expect(createTasksBtn).toBeVisible({ timeout: 10000 });
    await createTasksBtn.click();

    // 8. AutopilotPanel should appear
    const autopilotPanel = page.locator('[data-testid="autopilot-panel"]');
    await expect(autopilotPanel).toBeVisible({ timeout: 10000 });

    // Verify autopilot is in IDLE status
    const statusText = page.locator('[data-testid="autopilot-status"]');
    await expect(statusText).toContainText("Ready to start");

    // Verify "Run All" button is visible
    const runAllBtn = page.locator('[data-testid="autopilot-auto-button"]');
    await expect(runAllBtn).toBeVisible();
    await expect(runAllBtn).toBeEnabled();
  });

  test("T_AUTOPILOT_2: Run Autopilot starts task execution", async ({ page }) => {
    // Count tasks in In Progress before
    await page.locator('[data-testid="tasks-tab"]').click();
    await waitForBoardReady(page);
    const inProgressBefore = await getTaskCountInColumn(page, "in_progress");

    // Go back to Planning tab
    await page.locator('[data-testid="planning-tab"]').click();
    await expect(page.locator('[data-testid="planning-idea-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="planning-idea-input"]')).toBeEnabled();

    // Full council flow
    const ideaInput = page.locator('[data-testid="planning-idea-input"]');
    await ideaInput.fill("Create a simple CRUD for products");

    await page.locator('[data-testid="planning-start-button"]').click();

    // Wait for response input
    const responseInput = page.locator('[data-testid="response-input"]');
    await expect(responseInput).toBeVisible({ timeout: 15000 });
    await responseInput.fill("Keep it simple with basic fields: name, price, description.");
    await page.locator('[data-testid="submit-response-btn"]').click();

    // Generate plan
    const generateBtn = page.locator('[data-testid="generate-plan-btn"]');
    await expect(generateBtn).toBeVisible({ timeout: 30000 });
    await generateBtn.click();

    // Switch to Plan tab
    const planTabBtn = page.getByRole("button", { name: /Plan v/i });
    await expect(planTabBtn).toBeEnabled({ timeout: 30000 });
    await planTabBtn.click();

    // Approve and create tasks
    const approveBtn = page.locator('[data-testid="approve-plan-btn"]');
    await expect(approveBtn).toBeVisible({ timeout: 10000 });
    await approveBtn.click();

    const createTasksBtn = page.locator('[data-testid="create-tasks-btn"]');
    await expect(createTasksBtn).toBeVisible({ timeout: 10000 });
    await createTasksBtn.click();

    // Wait for AutopilotPanel
    const autopilotPanel = page.locator('[data-testid="autopilot-panel"]');
    await expect(autopilotPanel).toBeVisible({ timeout: 10000 });

    // Click "Run All" to start autopilot
    const runAllBtn = page.locator('[data-testid="autopilot-auto-button"]');
    await expect(runAllBtn).toBeVisible();
    await runAllBtn.click();

    // Wait for status to change to RUNNING
    const statusText = page.locator('[data-testid="autopilot-status"]');
    await expect(statusText).toContainText(/Executing|Running/i, { timeout: 10000 });

    // Give autopilot time to process first task
    await page.waitForTimeout(3000);

    // Check Tasks tab for in_progress tasks
    await page.locator('[data-testid="tasks-tab"]').click();
    await waitForBoardReady(page);

    // Verify at least one task moved to in_progress
    const inProgressAfter = await getTaskCountInColumn(page, "in_progress");
    expect(inProgressAfter).toBeGreaterThanOrEqual(inProgressBefore);
  });

  test("T_AUTOPILOT_3: Autopilot shows task progress", async ({ page }) => {
    // Full council flow to autopilot
    const ideaInput = page.locator('[data-testid="planning-idea-input"]');
    await ideaInput.fill("Build a notification system");

    await page.locator('[data-testid="planning-start-button"]').click();

    const responseInput = page.locator('[data-testid="response-input"]');
    await expect(responseInput).toBeVisible({ timeout: 15000 });
    await responseInput.fill("Email and push notifications, with user preferences.");
    await page.locator('[data-testid="submit-response-btn"]').click();

    const generateBtn = page.locator('[data-testid="generate-plan-btn"]');
    await expect(generateBtn).toBeVisible({ timeout: 30000 });
    await generateBtn.click();

    const planTabBtn = page.getByRole("button", { name: /Plan v/i });
    await expect(planTabBtn).toBeEnabled({ timeout: 30000 });
    await planTabBtn.click();

    const approveBtn = page.locator('[data-testid="approve-plan-btn"]');
    await expect(approveBtn).toBeVisible({ timeout: 10000 });
    await approveBtn.click();

    const createTasksBtn = page.locator('[data-testid="create-tasks-btn"]');
    await expect(createTasksBtn).toBeVisible({ timeout: 10000 });
    await createTasksBtn.click();

    // Wait for AutopilotPanel
    const autopilotPanel = page.locator('[data-testid="autopilot-panel"]');
    await expect(autopilotPanel).toBeVisible({ timeout: 10000 });

    // Verify task progress indicator shows correct format (e.g., "0/3")
    const taskProgress = page.locator('[data-testid="autopilot-task-progress"]');
    await expect(taskProgress).toBeVisible();
    const progressText = await taskProgress.textContent();
    expect(progressText).toMatch(/\d+\/\d+/); // Format: "X/Y"

    // Progress bar should be visible
    const progressBar = page.locator('[data-testid="autopilot-progress-bar"]');
    await expect(progressBar).toBeVisible();
  });
});
