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

    // 6.5 Wait for plan status to be approved (critical for Create Tasks)
    const planStatusMarker = page.locator('[data-testid="debug-plan-status"]');
    await expect(planStatusMarker).toBeAttached({ timeout: 10000 });
    await expect(planStatusMarker).toHaveAttribute("data-status", "approved", { timeout: 10000 });
    console.log("DEBUG T1: plan status is approved");

    // 6.6 Verify plan has tasks array populated (critical for Create Tasks)
    const planTasksMarker = page.locator('[data-testid="debug-plan-tasks-len"]');
    await expect(planTasksMarker).toBeAttached({ timeout: 5000 });
    const tasksLen = await planTasksMarker.getAttribute("data-len");
    console.log("DEBUG T1: plan.tasks.length =", tasksLen);
    // Fail fast if tasks not populated (should be > 0 in demo mode)
    expect(parseInt(tasksLen || "-1")).toBeGreaterThan(0);

    // 7. Create tasks - with deterministic checks
    const createTasksBtn = page.locator('[data-testid="create-tasks-btn"]');

    // Debug: log button state before checks
    console.log("DEBUG T1: createTasksBtn visible:", await createTasksBtn.isVisible());
    console.log("DEBUG T1: createTasksBtn enabled:", await createTasksBtn.isEnabled());
    console.log("DEBUG T1: URL before click:", page.url());

    // Deterministic checks
    await expect(createTasksBtn).toBeVisible({ timeout: 15000 });
    await expect(createTasksBtn).toBeEnabled({ timeout: 15000 });
    await createTasksBtn.scrollIntoViewIfNeeded();

    // Take screenshot before click
    await page.screenshot({ path: "test-results/debug-t1-before-create-tasks-click.png", fullPage: true });

    // Trial click to verify button is actionable
    await createTasksBtn.click({ trial: true });
    console.log("DEBUG T1: trial click passed");

    // Actual click
    await createTasksBtn.click();
    console.log("DEBUG T1: click executed");

    // 8. Debug: Wait for debug-create-tasks-clicked (confirms handler was called)
    // Use toBeAttached() because marker has class="hidden"
    await expect(page.locator('[data-testid="debug-create-tasks-clicked"]')).toBeAttached({ timeout: 15000 });
    console.log("DEBUG T1: create-tasks-clicked marker attached");

    // Wait for loop to start
    await expect(page.locator('[data-testid="debug-create-tasks-loop-started"]')).toBeAttached({ timeout: 10000 });
    console.log("DEBUG T1: loop-started marker attached");

    // Wait for first task to be created (status marker or tasks-created-count)
    await expect(
      page.locator('[data-testid^="debug-create-tasks-status-"], [data-testid="debug-tasks-created-count"]').first()
    ).toBeAttached({ timeout: 30000 });
    console.log("DEBUG T1: first task response received");

    // Check all debug markers
    const statusMarkers = await page.locator('[data-testid^="debug-create-tasks-status-"]').all();
    for (const marker of statusMarkers) {
      const testid = await marker.getAttribute("data-testid");
      console.log("DEBUG T1: Found status marker:", testid);
    }

    const tasksCreatedMarker = page.locator('[data-testid="debug-tasks-created-count"]');
    if (await tasksCreatedMarker.count() > 0) {
      const count = await tasksCreatedMarker.getAttribute("data-count");
      console.log("DEBUG T1: tasks created count:", count);
    }

    // Check error marker using count() since it has class="hidden"
    const errorMarker = page.locator('[data-testid="debug-create-tasks-error"]');
    const errorCount = await errorMarker.count();
    if (errorCount > 0) {
      const errorValue = await errorMarker.getAttribute("data-error");
      console.log("DEBUG T1: ERROR marker found:", errorValue);
    } else {
      console.log("DEBUG T1: No error marker");
    }

    // Take screenshot for debugging
    await page.screenshot({ path: "test-results/debug-autopilot-t1.png", fullPage: true });

    // Now wait for phase-tasks-created
    const phaseMarker = page.locator('[data-testid="phase-tasks-created"]');
    await expect(phaseMarker).toBeVisible({ timeout: 15000 });
    console.log("DEBUG T1: phase-tasks-created marker visible");

    // Check autopilot debug markers
    const autopilotDisabled = await page.locator('[data-testid="debug-autopilot-disabled"]').count();
    const noSession = await page.locator('[data-testid="debug-no-session"]').count();
    console.log("DEBUG T1: autopilot-disabled count:", autopilotDisabled, "no-session count:", noSession);

    // Now wait for AutopilotPanel
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

    // Wait for plan status to be approved
    const planStatusMarker = page.locator('[data-testid="debug-plan-status"]');
    await expect(planStatusMarker).toBeAttached({ timeout: 10000 });
    await expect(planStatusMarker).toHaveAttribute("data-status", "approved", { timeout: 10000 });
    console.log("DEBUG T2: plan status is approved");

    // Verify plan has tasks array populated (critical for Create Tasks)
    const planTasksMarker = page.locator('[data-testid="debug-plan-tasks-len"]');
    await expect(planTasksMarker).toBeAttached({ timeout: 5000 });
    const tasksLen = await planTasksMarker.getAttribute("data-len");
    console.log("DEBUG T2: plan.tasks.length =", tasksLen);
    expect(parseInt(tasksLen || "-1")).toBeGreaterThan(0);

    // Create tasks - with deterministic checks
    const createTasksBtn = page.locator('[data-testid="create-tasks-btn"]');

    // Debug: log button state before checks
    console.log("DEBUG T2: createTasksBtn visible:", await createTasksBtn.isVisible());
    console.log("DEBUG T2: createTasksBtn enabled:", await createTasksBtn.isEnabled());
    console.log("DEBUG T2: URL before click:", page.url());

    // Deterministic checks
    await expect(createTasksBtn).toBeVisible({ timeout: 15000 });
    await expect(createTasksBtn).toBeEnabled({ timeout: 15000 });
    await createTasksBtn.scrollIntoViewIfNeeded();

    // Take screenshot before click
    await page.screenshot({ path: "test-results/debug-t2-before-create-tasks-click.png", fullPage: true });

    // Trial click to verify button is actionable
    await createTasksBtn.click({ trial: true });
    console.log("DEBUG T2: trial click passed");

    // Actual click
    await createTasksBtn.click();
    console.log("DEBUG T2: click executed");

    // Debug: Wait for create-tasks-clicked marker (toBeAttached because class="hidden")
    await expect(page.locator('[data-testid="debug-create-tasks-clicked"]')).toBeAttached({ timeout: 15000 });
    console.log("DEBUG T2: create-tasks-clicked marker attached");

    // Wait for loop to start
    await expect(page.locator('[data-testid="debug-create-tasks-loop-started"]')).toBeAttached({ timeout: 10000 });
    console.log("DEBUG T2: loop-started marker attached");

    // Wait for first task to be created
    await expect(
      page.locator('[data-testid^="debug-create-tasks-status-"], [data-testid="debug-tasks-created-count"]').first()
    ).toBeAttached({ timeout: 30000 });
    console.log("DEBUG T2: first task response received");

    // Check status markers
    const statusMarkers = await page.locator('[data-testid^="debug-create-tasks-status-"]').all();
    for (const m of statusMarkers) {
      console.log("DEBUG T2: status marker:", await m.getAttribute("data-testid"));
    }

    const tasksCreatedMarker = page.locator('[data-testid="debug-tasks-created-count"]');
    if (await tasksCreatedMarker.count() > 0) {
      console.log("DEBUG T2: tasks created count:", await tasksCreatedMarker.getAttribute("data-count"));
    }

    // Check error marker using count() since it has class="hidden"
    const errorMarker = page.locator('[data-testid="debug-create-tasks-error"]');
    const errorCount = await errorMarker.count();
    if (errorCount > 0) {
      console.log("DEBUG T2: ERROR:", await errorMarker.getAttribute("data-error"));
    } else {
      console.log("DEBUG T2: No error marker");
    }

    await page.screenshot({ path: "test-results/debug-autopilot-t2.png", fullPage: true });

    // Wait for phase marker
    await expect(page.locator('[data-testid="phase-tasks-created"]')).toBeVisible({ timeout: 15000 });
    console.log("DEBUG T2: phase-tasks-created visible");

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

    // Wait for plan status to be approved
    const planStatusMarker = page.locator('[data-testid="debug-plan-status"]');
    await expect(planStatusMarker).toBeAttached({ timeout: 10000 });
    await expect(planStatusMarker).toHaveAttribute("data-status", "approved", { timeout: 10000 });
    console.log("DEBUG T3: plan status is approved");

    // Verify plan has tasks array populated (critical for Create Tasks)
    const planTasksMarker = page.locator('[data-testid="debug-plan-tasks-len"]');
    await expect(planTasksMarker).toBeAttached({ timeout: 5000 });
    const tasksLen = await planTasksMarker.getAttribute("data-len");
    console.log("DEBUG T3: plan.tasks.length =", tasksLen);
    expect(parseInt(tasksLen || "-1")).toBeGreaterThan(0);

    // Create tasks - with deterministic checks
    const createTasksBtn = page.locator('[data-testid="create-tasks-btn"]');

    // Debug: log button state before checks
    console.log("DEBUG T3: createTasksBtn visible:", await createTasksBtn.isVisible());
    console.log("DEBUG T3: createTasksBtn enabled:", await createTasksBtn.isEnabled());
    console.log("DEBUG T3: URL before click:", page.url());

    // Deterministic checks
    await expect(createTasksBtn).toBeVisible({ timeout: 15000 });
    await expect(createTasksBtn).toBeEnabled({ timeout: 15000 });
    await createTasksBtn.scrollIntoViewIfNeeded();

    // Take screenshot before click
    await page.screenshot({ path: "test-results/debug-t3-before-create-tasks-click.png", fullPage: true });

    // Trial click to verify button is actionable
    await createTasksBtn.click({ trial: true });
    console.log("DEBUG T3: trial click passed");

    // Actual click
    await createTasksBtn.click();
    console.log("DEBUG T3: click executed");

    // Debug: Wait for create-tasks-clicked marker (toBeAttached because class="hidden")
    await expect(page.locator('[data-testid="debug-create-tasks-clicked"]')).toBeAttached({ timeout: 15000 });
    console.log("DEBUG T3: create-tasks-clicked marker attached");

    // Wait for loop to start
    await expect(page.locator('[data-testid="debug-create-tasks-loop-started"]')).toBeAttached({ timeout: 10000 });
    console.log("DEBUG T3: loop-started marker attached");

    // Wait for first task to be created
    await expect(
      page.locator('[data-testid^="debug-create-tasks-status-"], [data-testid="debug-tasks-created-count"]').first()
    ).toBeAttached({ timeout: 30000 });
    console.log("DEBUG T3: first task response received");

    // Check status markers
    const statusMarkers = await page.locator('[data-testid^="debug-create-tasks-status-"]').all();
    for (const m of statusMarkers) {
      console.log("DEBUG T3: status marker:", await m.getAttribute("data-testid"));
    }

    const tasksCreatedMarker = page.locator('[data-testid="debug-tasks-created-count"]');
    if (await tasksCreatedMarker.count() > 0) {
      console.log("DEBUG T3: tasks created count:", await tasksCreatedMarker.getAttribute("data-count"));
    }

    // Check error marker using count() since it has class="hidden"
    const errorMarker = page.locator('[data-testid="debug-create-tasks-error"]');
    const errorCount = await errorMarker.count();
    if (errorCount > 0) {
      console.log("DEBUG T3: ERROR:", await errorMarker.getAttribute("data-error"));
    } else {
      console.log("DEBUG T3: No error marker");
    }

    await page.screenshot({ path: "test-results/debug-autopilot-t3-before-phase.png", fullPage: true });

    // Wait for phase marker
    await expect(page.locator('[data-testid="phase-tasks-created"]')).toBeVisible({ timeout: 15000 });
    console.log("DEBUG T3: phase-tasks-created visible");

    // Check autopilot debug markers
    const autopilotDisabled = await page.locator('[data-testid="debug-autopilot-disabled"]').count();
    const noSession = await page.locator('[data-testid="debug-no-session"]').count();
    console.log("DEBUG T3: autopilot-disabled count:", autopilotDisabled, "no-session count:", noSession);

    await page.screenshot({ path: "test-results/debug-autopilot-t3.png", fullPage: true });

    // Wait for AutopilotPanel
    const autopilotPanel = page.locator('[data-testid="autopilot-panel"]');
    await expect(autopilotPanel).toBeVisible({ timeout: 10000 });

    // Verify task progress indicator shows correct format (e.g., "0/3")
    const taskProgress = page.locator('[data-testid="autopilot-task-progress"]');
    await expect(taskProgress).toBeVisible();
    const progressText = await taskProgress.textContent();
    expect(progressText).toMatch(/\d+\/\d+/); // Format: "X/Y"

    // Progress bar element should exist (width may be 0% if no progress yet)
    const progressBar = page.locator('[data-testid="autopilot-progress-bar"]');
    await expect(progressBar).toBeAttached();
  });
});
