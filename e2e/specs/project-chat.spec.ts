import { test, expect } from '@playwright/test';
import { clearProcessedWebhooks } from '../helpers/api';

test.describe('Project Chat + Iteration Loop', () => {
  test.beforeEach(async ({ page, request }) => {
    await clearProcessedWebhooks(request);
    await page.goto('/projects/1');
    await page.waitForSelector('[data-testid="kanban-board"]', { timeout: 10000 });
  });

  test('T58: Project Chat saves messages between reloads', async ({ page }) => {
    // Navigate to Chat tab
    const chatTab = page.locator('[data-testid="chat-tab"]');
    await expect(chatTab).toBeVisible();
    await chatTab.click();

    // Verify chat is loaded
    const projectChat = page.locator('[data-testid="project-chat"]');
    await expect(projectChat).toBeVisible();

    // Send a message
    const messageInput = page.locator('[data-testid="message-input"]');
    await messageInput.fill('Add user authentication to the app');
    await messageInput.press('Enter');

    // Wait for message to appear
    await page.waitForTimeout(1000);

    // Verify message is visible
    const userMessage = page.locator('[data-testid="chat-message-user"]').last();
    await expect(userMessage).toContainText('Add user authentication');

    // Reload page
    await page.reload();
    await page.waitForSelector('[data-testid="kanban-board"]', { timeout: 10000 });

    // Navigate back to Chat tab
    await page.locator('[data-testid="chat-tab"]').click();
    await page.waitForSelector('[data-testid="project-chat"]', { timeout: 5000 });

    // Verify message is still there
    const savedMessage = page.locator('[data-testid="chat-message-user"]').last();
    await expect(savedMessage).toContainText('Add user authentication');
  });

  test('T59: User message → council discussion visible', async ({ page }) => {
    // Navigate to Chat tab
    await page.locator('[data-testid="chat-tab"]').click();
    await page.waitForSelector('[data-testid="project-chat"]', { timeout: 5000 });

    // Send message
    const messageInput = page.locator('[data-testid="message-input"]');
    await messageInput.fill('Build a login page with email and password');
    await messageInput.press('Enter');

    // Wait for AI response
    await page.waitForTimeout(1500);

    // Verify AI Product response
    const aiMessage = page.locator('[data-testid="chat-message-ai"]').last();
    await expect(aiMessage).toBeVisible();

    // Verify Council panel is visible
    const councilPanel = page.locator('[data-testid="council-panel"]');
    await expect(councilPanel).toBeVisible();

    // Verify council messages from different roles
    const productMessage = page.locator('[data-testid="council-message-product"]').first();
    const architectMessage = page.locator('[data-testid="council-message-architect"]').first();
    const backendMessage = page.locator('[data-testid="council-message-backend"]').first();

    await expect(productMessage).toBeVisible();
    await expect(architectMessage).toBeVisible();
    await expect(backendMessage).toBeVisible();
  });

  test('T60: Council produces iteration summary', async ({ page }) => {
    // Navigate to Chat tab
    await page.locator('[data-testid="chat-tab"]').click();
    await page.waitForSelector('[data-testid="project-chat"]', { timeout: 5000 });

    // Send message
    const messageInput = page.locator('[data-testid="message-input"]');
    await messageInput.fill('Add logout button to the header');
    await messageInput.press('Enter');

    // Wait for council to finish
    await page.waitForTimeout(2000);

    // Verify iteration summary is visible
    const iterationSummary = page.locator('[data-testid="iteration-summary"]');
    await expect(iterationSummary).toBeVisible();

    // Verify summary contains task plan
    await expect(iterationSummary).toContainText('task');

    // Verify iterate button is visible
    const iterateButton = page.locator('[data-testid="iterate-button"]');
    await expect(iterateButton).toBeVisible();
    await expect(iterateButton).toBeEnabled();
  });

  test('T61: Confirm iteration → tasks updated in kanban', async ({ page, request }) => {
    // Navigate to Chat tab
    await page.locator('[data-testid="chat-tab"]').click();
    await page.waitForSelector('[data-testid="project-chat"]', { timeout: 5000 });

    // Send message
    const messageInput = page.locator('[data-testid="message-input"]');
    await messageInput.fill('Create settings page with user profile');
    await messageInput.press('Enter');

    // Wait for council
    await page.waitForTimeout(2000);

    // Click iterate button
    const iterateButton = page.locator('[data-testid="iterate-button"]');
    await iterateButton.click();

    // Wait for tasks to be created
    await page.waitForTimeout(1500);

    // Navigate to Tasks tab to verify
    const tasksTab = page.locator('[data-testid="tasks-tab"]').first();
    await tasksTab.click();
    await page.waitForSelector('[data-testid="kanban-board"]', { timeout: 5000 });

    // Verify new tasks are in kanban
    const todoColumn = page.locator('[data-testid="column-todo"]');
    const taskCards = todoColumn.locator('[data-testid^="task-card-"]');

    const count = await taskCards.count();
    expect(count).toBeGreaterThan(0);

    // Verify at least one task contains relevant keywords
    const firstCard = taskCards.first();
    const cardText = await firstCard.textContent();
    expect(cardText?.toLowerCase()).toMatch(/settings|profile/);
  });

  test('T62: Deterministic output in PLAYWRIGHT=1', async ({ page }) => {
    // Navigate to Chat tab
    await page.locator('[data-testid="chat-tab"]').click();
    await page.waitForSelector('[data-testid="project-chat"]', { timeout: 5000 });

    // Send first message
    const messageInput = page.locator('[data-testid="message-input"]');
    await messageInput.fill('Add API endpoint for users');
    await messageInput.press('Enter');

    // Wait for council
    await page.waitForTimeout(2000);

    // Get council message count
    const councilMessages1 = page.locator('[data-testid^="council-message-"]');
    const count1 = await councilMessages1.count();

    // Get first council message text
    const firstMessage1 = await councilMessages1.first().textContent();

    // Reload and repeat
    await page.reload();
    await page.waitForSelector('[data-testid="kanban-board"]', { timeout: 10000 });

    await page.locator('[data-testid="chat-tab"]').click();
    await page.waitForSelector('[data-testid="project-chat"]', { timeout: 5000 });

    await messageInput.fill('Add API endpoint for users');
    await messageInput.press('Enter');
    await page.waitForTimeout(2000);

    const councilMessages2 = page.locator('[data-testid^="council-message-"]');
    const count2 = await councilMessages2.count();
    const firstMessage2 = await councilMessages2.first().textContent();

    // Verify deterministic output
    expect(count1).toBe(count2);
    expect(firstMessage1).toBe(firstMessage2);
  });
});
