import { test, expect } from '@playwright/test';
import { apiUrl } from '../helpers/base-url';

test.describe('Planning → AI Council → Project Bootstrap', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/planning');
    await page.waitForLoadState('networkidle');
  });

  test('T46: Planning page opens and session can be created', async ({ page }) => {
    // Check planning page loaded
    await expect(page.locator('h1')).toContainText('Planning');

    // Enter project idea
    const ideaText = 'Build a task management app with real-time collaboration';
    await page.fill('[data-testid="idea-input"]', ideaText);

    // Click Analyze
    await page.click('[data-testid="analyze-button"]');

    // Wait for status badge to appear with "Ready"
    await page.waitForSelector('[data-testid="session-status"]:has-text("Ready")', { timeout: 20000 });

    // Verify status is ready
    const statusBadge = page.locator('[data-testid="session-status"]');
    await expect(statusBadge).toContainText('Ready');

    // Verify plan draft is visible
    await page.waitForSelector('[data-testid="plan-draft"]', { timeout: 1000 });

    // Verify draft block is visible
    const draftBlock = page.locator('[data-testid="plan-draft"]');
    await expect(draftBlock).toBeVisible();

    // Verify draft contains goals
    await expect(draftBlock).toContainText('Goals');

    // Verify draft contains milestones
    await expect(draftBlock).toContainText('Milestones');

    // Verify draft contains tasks (at least 10)
    const tasksSection = page.locator('[data-testid="draft-tasks"]');
    await expect(tasksSection).toBeVisible();
    const taskItems = tasksSection.locator('[data-testid^="draft-task-"]');
    const taskCount = await taskItems.count();
    expect(taskCount).toBeGreaterThanOrEqual(10);
  });

  test('T47: Council messages visible', async ({ page }) => {
    // Reload page to reset state
    await page.goto('/planning');
    await page.waitForLoadState('networkidle');

    // Enter idea and analyze
    await page.fill('[data-testid="idea-input"]', 'Create an e-commerce platform');
    await page.click('[data-testid="analyze-button"]');

    // Wait for Ready status
    await page.waitForSelector('[data-testid="session-status"]:has-text("Ready")', { timeout: 20000 });

    // Wait for council messages
    await page.waitForSelector('[data-testid="council-messages"]', { timeout: 1000 });

    // Verify council panel is visible
    const councilPanel = page.locator('[data-testid="council-messages"]');
    await expect(councilPanel).toBeVisible();

    // Verify at least 3 messages from different roles
    const messages = councilPanel.locator('[data-testid^="council-message-"]');
    const messageCount = await messages.count();
    expect(messageCount).toBeGreaterThanOrEqual(3);

    // Verify different roles present
    const roles = new Set<string>();
    for (let i = 0; i < Math.min(messageCount, 6); i++) {
      const roleText = await messages.nth(i).locator('[data-testid="message-role"]').textContent();
      if (roleText) roles.add(roleText.trim());
    }
    expect(roles.size).toBeGreaterThanOrEqual(3);

    // Verify role badges visible (PM, ARCHITECT, BACKEND, etc.)
    await expect(councilPanel).toContainText('PM');
    await expect(councilPanel).toContainText('ARCHITECT');
  });

  test('T48: Confirm creates project and tasks', async ({ page, request }) => {
    // Reload page to reset state
    await page.goto('/planning');
    await page.waitForLoadState('networkidle');

    // Enter idea and analyze
    await page.fill('[data-testid="idea-input"]', 'Build a blog platform with comments');
    await page.click('[data-testid="analyze-button"]');

    // Wait for Ready status
    await page.waitForSelector('[data-testid="session-status"]:has-text("Ready")', { timeout: 20000 });

    // Wait for draft
    await page.waitForSelector('[data-testid="plan-draft"]', { timeout: 1000 });

    // Click Confirm
    await page.click('[data-testid="confirm-button"]');

    // Wait for redirect to project page
    await page.waitForURL(/\/projects\/[a-zA-Z0-9-]+/, { timeout: 10000 });

    // Extract project ID from URL
    const url = page.url();
    const projectId = url.match(/\/projects\/([a-zA-Z0-9-]+)/)?.[1];
    expect(projectId).toBeTruthy();

    // Verify kanban board loaded
    await page.waitForSelector('[data-testid="kanban-board"]', { timeout: 10000 });

    // Wait for tasks to load (at least one task card)
    await page.waitForSelector('[data-testid^="task-card-"]', { timeout: 10000 });

    // Verify tasks exist (at least 10)
    const taskCards = page.locator('[data-testid^="task-card-"]');
    const taskCount = await taskCards.count();
    expect(taskCount).toBeGreaterThanOrEqual(10);

    // Open first task
    await taskCards.first().click();

    // Verify task panel opens
    const taskPanel = page.locator('[data-testid="task-details-panel"]');
    await expect(taskPanel).toBeVisible();

    // Verify task has title and description
    await expect(taskPanel.locator('[data-testid="task-title"]')).toBeVisible();
    await expect(taskPanel.locator('.text-xs.text-muted-foreground')).toBeVisible();

    // Cleanup: delete project
    if (projectId) {
      await request.delete(apiUrl(`/api/projects/${projectId}`));
    }
  });

  test('T49: Determinism in test mode', async ({ page }) => {
    // Reload page to reset state
    await page.goto('/planning');
    await page.waitForLoadState('networkidle');

    // Use fixed seed idea for deterministic output
    const seedIdea = 'E2E Test Project: Build a kanban board';
    await page.fill('[data-testid="idea-input"]', seedIdea);
    await page.click('[data-testid="analyze-button"]');

    // Wait for Ready status
    await page.waitForSelector('[data-testid="session-status"]:has-text("Ready")', { timeout: 20000 });

    // Wait for draft
    await page.waitForSelector('[data-testid="plan-draft"]', { timeout: 1000 });

    // Verify specific task title exists (deterministic in PLAYWRIGHT=1)
    const tasksSection = page.locator('[data-testid="draft-tasks"]');
    await expect(tasksSection).toContainText('Setup project structure and dependencies');

    // Verify task count is deterministic
    const taskItems = tasksSection.locator('[data-testid^="draft-task-"]');
    const taskCount = await taskItems.count();
    expect(taskCount).toBe(15); // Fixed count in test mode

    // Verify council has deterministic messages
    const councilPanel = page.locator('[data-testid="council-messages"]');
    await expect(councilPanel).toContainText('I suggest we start with the core domain model');
  });
});
