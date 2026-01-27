import { test, expect } from "@playwright/test";
import { waitForBoardReady } from "../helpers/board";
import { resetProjectStatus } from "../helpers/api";
import {
  trackConsoleAndPageErrors,
  clickNoNav,
  expectHealthy,
  waitVisible,
} from "../helpers/e2e-critical";

/**
 * EPIC-9 + Autopilot Integration E2E tests (Critical Path)
 * PR-128: Updated for new Chat → Council flow
 *
 * Tests critical path only:
 * - Page loads without crash
 * - Buttons are clickable
 * - No 5xx errors
 *
 * New flow (PR-128):
 * 1. User types message in Chat (left panel)
 * 2. User clicks "Run Consilium" button (right panel)
 * 3. Council dialogue appears, user responds
 * 4. Generate plan, approve, create tasks
 * 5. AutopilotPanel appears
 */

test.describe("EPIC-9 Autopilot Integration", () => {
  test.beforeEach(async ({ page, request }) => {
    await resetProjectStatus(request, "1");
    await page.goto("/projects/1");
    await waitForBoardReady(page);
  });

  test("T_AUTOPILOT_1: Council to AutopilotPanel flow completes without crash", async ({
    page,
  }) => {
    const tracked = trackConsoleAndPageErrors(page);

    // Navigate to Planning tab
    await page.locator('[data-testid="planning-tab"]').click();

    // Wait for chat input
    const chatInput = page.locator('[data-testid="chat-input"]');
    await waitVisible(chatInput);

    // Send chat message
    await chatInput.fill("Build a REST API with user authentication");
    await clickNoNav(page.locator('[data-testid="chat-send"]'));
    await waitVisible(page.locator('[data-testid="chat-message-ai"]').first(), 15000);
    await page.waitForTimeout(500);

    // Start council
    const runBtn = page.locator('[data-testid="run-consilium"]');
    await expect(runBtn).toBeEnabled({ timeout: 10000 });
    await clickNoNav(runBtn);

    // Wait for council dialogue
    await waitVisible(page.locator('[data-testid="council-dialogue"]'), 15000);

    // Wait for response input and submit
    const responseInput = page.locator('[data-testid="council-response-input"]');
    await waitVisible(responseInput, 15000);
    await responseInput.fill("Use JWT tokens for auth.");
    await clickNoNav(page.locator('[data-testid="council-response-submit"]'));

    // Wait for Generate Plan button and click
    const generateBtn = page.locator('[data-testid="generate-plan-btn"]');
    await waitVisible(generateBtn, 30000);
    await clickNoNav(generateBtn);

    // Wait for Plan tab to be enabled
    const planTabBtn = page.getByRole("button", { name: /Plan v/i });
    await expect(planTabBtn).toBeEnabled({ timeout: 30000 });
    await clickNoNav(planTabBtn);

    // Approve plan
    const approveBtn = page.locator('[data-testid="approve-plan"]');
    await waitVisible(approveBtn, 10000);
    await clickNoNav(approveBtn);

    // Create tasks (button becomes visible after approval)
    const createTasksBtn = page.locator('[data-testid="create-tasks-btn"]');
    await waitVisible(createTasksBtn, 15000);
    await expect(createTasksBtn).toBeEnabled({ timeout: 15000 });
    await clickNoNav(createTasksBtn);

    // Wait for kanban board (tab switches to Tasks)
    const kanbanBoard = page.locator('[data-testid="kanban-board"]');
    await waitVisible(kanbanBoard, 15000);

    // AutopilotPanel should be visible
    const autopilotPanel = page.locator('[data-testid="autopilot-panel"]');
    await waitVisible(autopilotPanel, 10000);

    // Run All button should be visible and enabled
    const runAllBtn = page.locator('[data-testid="autopilot-auto-button"]');
    await waitVisible(runAllBtn);
    await expect(runAllBtn).toBeEnabled();

    // Health check: no 5xx, no crashes
    await expectHealthy(page, tracked);
  });

  test("T_AUTOPILOT_2: Run Autopilot button is clickable", async ({ page }) => {
    const tracked = trackConsoleAndPageErrors(page);

    // Navigate to Planning tab
    await page.locator('[data-testid="planning-tab"]').click();

    // Wait for chat input
    const chatInput = page.locator('[data-testid="chat-input"]');
    await waitVisible(chatInput);

    // Full council flow
    await chatInput.fill("Create a simple CRUD for products");
    await clickNoNav(page.locator('[data-testid="chat-send"]'));
    await waitVisible(page.locator('[data-testid="chat-message-ai"]').first(), 15000);
    await page.waitForTimeout(500);

    // Start council
    const runBtn = page.locator('[data-testid="run-consilium"]');
    await expect(runBtn).toBeEnabled({ timeout: 10000 });
    await clickNoNav(runBtn);

    // Wait for response input
    const responseInput = page.locator('[data-testid="council-response-input"]');
    await waitVisible(responseInput, 15000);
    await responseInput.fill("Keep it simple.");
    await clickNoNav(page.locator('[data-testid="council-response-submit"]'));

    // Generate plan
    const generateBtn = page.locator('[data-testid="generate-plan-btn"]');
    await waitVisible(generateBtn, 30000);
    await clickNoNav(generateBtn);

    // Switch to Plan tab
    const planTabBtn = page.getByRole("button", { name: /Plan v/i });
    await expect(planTabBtn).toBeEnabled({ timeout: 30000 });
    await clickNoNav(planTabBtn);

    // Approve and create tasks
    const approveBtn = page.locator('[data-testid="approve-plan"]');
    await waitVisible(approveBtn, 10000);
    await clickNoNav(approveBtn);

    // Create tasks (button becomes visible after approval)
    const createTasksBtn = page.locator('[data-testid="create-tasks-btn"]');
    await waitVisible(createTasksBtn, 15000);
    await expect(createTasksBtn).toBeEnabled({ timeout: 15000 });
    await clickNoNav(createTasksBtn);

    // Wait for kanban board
    const kanbanBoard = page.locator('[data-testid="kanban-board"]');
    await waitVisible(kanbanBoard, 15000);

    // AutopilotPanel should be visible
    const autopilotPanel = page.locator('[data-testid="autopilot-panel"]');
    await waitVisible(autopilotPanel, 10000);

    // Click "Run All" button
    const runAllBtn = page.locator('[data-testid="autopilot-auto-button"]');
    await waitVisible(runAllBtn);
    await clickNoNav(runAllBtn);

    // Health check: no 5xx, no crashes
    await expectHealthy(page, tracked);
  });

  test("T_AUTOPILOT_3: Autopilot panel shows task progress element", async ({
    page,
  }) => {
    const tracked = trackConsoleAndPageErrors(page);

    // Navigate to Planning tab
    await page.locator('[data-testid="planning-tab"]').click();

    // Wait for chat input
    const chatInput = page.locator('[data-testid="chat-input"]');
    await waitVisible(chatInput);

    // Full council flow
    await chatInput.fill("Build a notification system");
    await clickNoNav(page.locator('[data-testid="chat-send"]'));
    await waitVisible(page.locator('[data-testid="chat-message-ai"]').first(), 15000);
    await page.waitForTimeout(500);

    // Start council
    const runBtn = page.locator('[data-testid="run-consilium"]');
    await expect(runBtn).toBeEnabled({ timeout: 10000 });
    await clickNoNav(runBtn);

    const responseInput = page.locator('[data-testid="council-response-input"]');
    await waitVisible(responseInput, 15000);
    await responseInput.fill("Email and push notifications.");
    await clickNoNav(page.locator('[data-testid="council-response-submit"]'));

    const generateBtn = page.locator('[data-testid="generate-plan-btn"]');
    await waitVisible(generateBtn, 30000);
    await clickNoNav(generateBtn);

    const planTabBtn = page.getByRole("button", { name: /Plan v/i });
    await expect(planTabBtn).toBeEnabled({ timeout: 30000 });
    await clickNoNav(planTabBtn);

    const approveBtn = page.locator('[data-testid="approve-plan"]');
    await waitVisible(approveBtn, 10000);
    await clickNoNav(approveBtn);

    // Create tasks (button becomes visible after approval)
    const createTasksBtn = page.locator('[data-testid="create-tasks-btn"]');
    await waitVisible(createTasksBtn, 15000);
    await expect(createTasksBtn).toBeEnabled({ timeout: 15000 });
    await clickNoNav(createTasksBtn);

    // Wait for kanban board
    const kanbanBoard = page.locator('[data-testid="kanban-board"]');
    await waitVisible(kanbanBoard, 15000);

    // AutopilotPanel should be visible
    const autopilotPanel = page.locator('[data-testid="autopilot-panel"]');
    await waitVisible(autopilotPanel, 10000);

    // Task progress element should exist
    const taskProgress = page.locator('[data-testid="autopilot-task-progress"]');
    await waitVisible(taskProgress);

    // Progress bar element should exist
    const progressBar = page.locator('[data-testid="autopilot-progress-bar"]');
    await expect(progressBar).toBeAttached();

    // Health check: no 5xx, no crashes
    await expectHealthy(page, tracked);
  });
});
