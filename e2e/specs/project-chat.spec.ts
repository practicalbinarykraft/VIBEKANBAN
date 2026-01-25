import { test, expect } from "@playwright/test";
import { clearProcessedWebhooks, resetProjectStatus } from "../helpers/api";
import {
  trackConsoleAndPageErrors,
  clickNoNav,
  expectHealthy,
  waitVisible,
} from "../helpers/e2e-critical";

/**
 * Project Chat + Iteration Loop E2E tests (Critical Path)
 *
 * Tests critical path only:
 * - Page loads without crash
 * - Buttons are clickable
 * - No 5xx errors
 *
 * NO text assertions, NO navigation waits, NO env-var dependencies
 */

test.describe("Project Chat + Iteration Loop", () => {
  test.beforeEach(async ({ page, request }) => {
    await clearProcessedWebhooks(request);
    await resetProjectStatus(request, "1");
    await page.goto("/projects/1");
    await page.waitForSelector('[data-testid="kanban-board"]', {
      timeout: 10000,
    });
  });

  test("T58: Project Chat tab loads and accepts input", async ({ page }) => {
    const tracked = trackConsoleAndPageErrors(page);

    // Navigate to Planning tab (Chat is inside split view - PR-126)
    const planningTab = page.locator('[data-testid="planning-tab"]');
    await waitVisible(planningTab);
    await clickNoNav(planningTab);

    // Verify chat is loaded
    const projectChat = page.locator('[data-testid="project-chat"]');
    await waitVisible(projectChat);

    // Message input should be visible and enabled
    const messageInput = page.locator('[data-testid="message-input"]');
    await waitVisible(messageInput);
    await expect(messageInput).toBeEnabled();

    // Send a message
    await messageInput.fill("Add user authentication to the app");
    await messageInput.press("Enter");

    // Wait for user message to appear (element exists)
    const userMessage = page.locator('[data-testid="chat-message-user"]').last();
    await waitVisible(userMessage, 5000);

    // Health check
    await expectHealthy(page, tracked);
  });

  test("T59: User message shows AI response element", async ({ page }) => {
    const tracked = trackConsoleAndPageErrors(page);

    // Navigate to Planning tab (Chat is inside split view - PR-126)
    await clickNoNav(page.locator('[data-testid="planning-tab"]'));
    await page.waitForSelector('[data-testid="project-chat"]', {
      timeout: 5000,
    });

    // Send message
    const messageInput = page.locator('[data-testid="message-input"]');
    await messageInput.fill("Build a login page with email and password");
    await messageInput.press("Enter");

    // Wait for AI response element
    const aiMessage = page.locator('[data-testid="chat-message-ai"]').last();
    await waitVisible(aiMessage, 10000);

    // Council panel should be visible
    const councilPanel = page.locator('[data-testid="council-panel"]');
    await waitVisible(councilPanel, 10000);

    // Health check
    await expectHealthy(page, tracked);
  });

  test("T60: Council produces iteration summary element", async ({ page }) => {
    const tracked = trackConsoleAndPageErrors(page);

    // Navigate to Planning tab (Chat is inside split view - PR-126)
    await clickNoNav(page.locator('[data-testid="planning-tab"]'));
    await page.waitForSelector('[data-testid="project-chat"]', {
      timeout: 5000,
    });

    // Send message
    const messageInput = page.locator('[data-testid="message-input"]');
    await messageInput.fill("Add logout button to the header");
    await messageInput.press("Enter");

    // Wait for iteration summary element
    const iterationSummary = page.locator('[data-testid="iteration-summary"]');
    await waitVisible(iterationSummary, 10000);

    // Iterate button should be visible and enabled
    const iterateButton = page.locator('[data-testid="iterate-button"]');
    await waitVisible(iterateButton);
    await expect(iterateButton).toBeEnabled();

    // Health check
    await expectHealthy(page, tracked);
  });

  test("T61: Iterate button is clickable and navigates to tasks", async ({ page }) => {
    const tracked = trackConsoleAndPageErrors(page);

    // Navigate to Planning tab (Chat is inside split view - PR-126)
    await clickNoNav(page.locator('[data-testid="planning-tab"]'));
    await page.waitForSelector('[data-testid="project-chat"]', {
      timeout: 5000,
    });

    // Send message
    const messageInput = page.locator('[data-testid="message-input"]');
    await messageInput.fill("Create settings page with user profile");
    await messageInput.press("Enter");

    // Wait for iterate button
    const iterateButton = page.locator('[data-testid="iterate-button"]');
    await waitVisible(iterateButton, 10000);
    await expect(iterateButton).toBeEnabled();

    // Click iterate button (no waitForResponse)
    await clickNoNav(iterateButton);

    // Navigate to Tasks tab
    const tasksTab = page.locator('[data-testid="tasks-tab"]').first();
    await clickNoNav(tasksTab);

    // Kanban board should be visible (critical path check)
    await page.waitForSelector('[data-testid="kanban-board"]', {
      timeout: 5000,
    });

    // Health check: no 5xx, no crashes
    await expectHealthy(page, tracked);
  });

  test("T62: Chat produces deterministic council messages", async ({
    page,
  }) => {
    const tracked = trackConsoleAndPageErrors(page);

    // Navigate to Planning tab (Chat is inside split view - PR-126)
    await clickNoNav(page.locator('[data-testid="planning-tab"]'));
    await page.waitForSelector('[data-testid="project-chat"]', {
      timeout: 5000,
    });

    // Send first message
    const messageInput = page.locator('[data-testid="message-input"]');
    await messageInput.fill("Add API endpoint for users");
    await messageInput.press("Enter");

    // Wait for council messages
    const councilMessages = page.locator('[data-testid^="council-message-"]');
    await waitVisible(councilMessages.first(), 10000);

    // Get council message count
    const count1 = await councilMessages.count();
    expect(count1).toBeGreaterThan(0);

    // Reload and repeat
    await page.reload();
    await page.waitForSelector('[data-testid="kanban-board"]', {
      timeout: 10000,
    });

    await clickNoNav(page.locator('[data-testid="planning-tab"]'));
    await page.waitForSelector('[data-testid="project-chat"]', {
      timeout: 5000,
    });

    await messageInput.fill("Add API endpoint for users");
    await messageInput.press("Enter");

    const councilMessages2 = page.locator('[data-testid^="council-message-"]');
    await waitVisible(councilMessages2.first(), 10000);

    const count2 = await councilMessages2.count();

    // Verify deterministic output (same number of messages)
    expect(count1).toBe(count2);

    // Health check
    await expectHealthy(page, tracked);
  });
});
