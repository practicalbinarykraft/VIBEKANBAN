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

    // Wait for split view with chat and council
    await waitVisible(page.locator('[data-testid="project-chat"]'));
    await waitVisible(page.locator('[data-testid="council-console"]'));

    // Run Consilium should be disabled initially (no user messages)
    const runBtn = page.locator('[data-testid="run-consilium"]');
    await waitVisible(runBtn);
    await expect(runBtn).toBeDisabled();

    // Type message in chat
    const chatInput = page.locator('[data-testid="chat-input"]');
    await waitVisible(chatInput);
    await chatInput.fill("Build a todo app with React and TypeScript");

    // Send message
    const sendBtn = page.locator('[data-testid="chat-send"]');
    await expect(sendBtn).toBeEnabled();
    await clickNoNav(sendBtn);

    // Wait for AI response (typing indicator disappears, message appears)
    await waitVisible(page.locator('[data-testid="chat-message-ai"]').first(), 15000);

    // Allow time for React state propagation
    await page.waitForTimeout(500);

    // Run Consilium should now be enabled (poll with retries)
    await expect(runBtn).toBeEnabled({ timeout: 10000 });

    // Start council
    await clickNoNav(runBtn);

    // Wait for council dialogue to appear
    const councilDialogue = page.locator('[data-testid="council-dialogue"]');
    await waitVisible(councilDialogue, 15000);

    // Should have at least one council message
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

    // Wait for chat input
    const chatInput = page.locator('[data-testid="chat-input"]');
    await waitVisible(chatInput);

    // Send chat message
    await chatInput.fill("Build a simple blog with posts and comments");
    await clickNoNav(page.locator('[data-testid="chat-send"]'));
    await waitVisible(page.locator('[data-testid="chat-message-ai"]').first(), 15000);
    await page.waitForTimeout(500);

    // Start council
    const runBtn = page.locator('[data-testid="run-consilium"]');
    await expect(runBtn).toBeEnabled({ timeout: 10000 });
    await clickNoNav(runBtn);

    // Wait for council dialogue
    await waitVisible(page.locator('[data-testid="council-dialogue"]'), 15000);

    // Wait for response input (awaiting_response phase)
    const responseInput = page.locator('[data-testid="council-response-input"]');
    await waitVisible(responseInput, 15000);

    // Enter response
    await responseInput.fill("Yes, let's focus on the core blog functionality first.");
    await clickNoNav(page.locator('[data-testid="council-response-submit"]'));

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
    const approveBtn = page.locator('[data-testid="approve-plan"]');
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

    // Go to Planning tab
    await page.locator('[data-testid="planning-tab"]').click();

    // Wait for chat input
    const chatInput = page.locator('[data-testid="chat-input"]');
    await waitVisible(chatInput);

    // Send chat message
    await chatInput.fill("Build user authentication with login and signup");
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
    await responseInput.fill("Let's start with basic JWT authentication.");
    await clickNoNav(page.locator('[data-testid="council-response-submit"]'));

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
    const approveBtn = page.locator('[data-testid="approve-plan"]');
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

  test("Run Consilium button is disabled when chat has no messages", async ({
    page,
  }) => {
    const tracked = trackConsoleAndPageErrors(page);

    // Navigate to Planning tab
    await page.locator('[data-testid="planning-tab"]').click();

    // Wait for council console
    await waitVisible(page.locator('[data-testid="council-console"]'));

    // Run Consilium button should be disabled when no chat messages
    const runBtn = page.locator('[data-testid="run-consilium"]');
    await waitVisible(runBtn);
    await expect(runBtn).toBeDisabled();

    // Type message in chat
    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.fill("Test idea for planning");
    await clickNoNav(page.locator('[data-testid="chat-send"]'));

    // Wait for AI response
    await waitVisible(page.locator('[data-testid="chat-message-ai"]').first(), 15000);
    await page.waitForTimeout(500);

    // Button should now be enabled
    await expect(runBtn).toBeEnabled({ timeout: 10000 });

    // Health check
    await expectHealthy(page, tracked);
  });
});
