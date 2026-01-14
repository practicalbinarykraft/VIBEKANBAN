import { test, expect } from '@playwright/test';
import {
  waitForBoardReady,
  getTaskCountInColumn,
  waitForTaskWithTextInColumn,
  waitForTaskCountToIncrease,
} from '../helpers/board';

/**
 * E2E tests for Planning tab within project page (Council Chat feature)
 *
 * Tests the UX skeleton:
 * 1. User navigates to project's Planning tab
 * 2. User enters idea in textarea
 * 3. User clicks "Run Council" button
 * 4. Mock API returns council messages
 * 5. Chat displays messages from council members
 */

test.describe('Project Planning Tab', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to project page
    await page.goto('/projects/1');
    await waitForBoardReady(page);
  });

  test('should display planning tab and allow starting council chat', async ({ page }) => {
    // Click on Planning tab
    const planningTab = page.locator('[data-testid="planning-tab"]');
    await expect(planningTab).toBeVisible();
    await planningTab.click();

    // Verify textarea is visible
    const ideaInput = page.locator('[data-testid="planning-idea-input"]');
    await expect(ideaInput).toBeVisible();

    // Enter idea text
    await ideaInput.fill('Build a user authentication system with OAuth support');

    // Click Run Council button
    const startButton = page.locator('[data-testid="planning-start-button"]');
    await expect(startButton).toBeVisible();
    await startButton.click();

    // Wait for council chat to appear
    const councilChat = page.locator('[data-testid="council-chat"]');
    await expect(councilChat).toBeVisible({ timeout: 10000 });

    // Verify at least 3 council messages appear
    const messages = page.locator('[data-testid="council-message"]');
    await expect(messages).toHaveCount(3, { timeout: 10000 });
  });

  test('should disable start button when textarea is empty', async ({ page }) => {
    // Click on Planning tab
    await page.locator('[data-testid="planning-tab"]').click();

    // Verify button is disabled when textarea is empty
    const startButton = page.locator('[data-testid="planning-start-button"]');
    await expect(startButton).toBeDisabled();

    // Enter some text
    const ideaInput = page.locator('[data-testid="planning-idea-input"]');
    await ideaInput.fill('Some idea');

    // Button should now be enabled
    await expect(startButton).toBeEnabled();
  });

  test('should show loading state while council is running', async ({ page }) => {
    await page.locator('[data-testid="planning-tab"]').click();

    const ideaInput = page.locator('[data-testid="planning-idea-input"]');
    await ideaInput.fill('Test idea for loading state');

    const startButton = page.locator('[data-testid="planning-start-button"]');
    await startButton.click();

    // Button should show loading state (disabled during request)
    await expect(startButton).toBeDisabled();

    // Wait for chat to appear (request completed)
    await expect(page.locator('[data-testid="council-chat"]')).toBeVisible({ timeout: 10000 });
  });

  test('T1: QUESTIONS flow - shows questions after finish', async ({ page }) => {
    await page.locator('[data-testid="planning-tab"]').click();

    // Enter idea WITHOUT "MVP" or "быстро" → should get QUESTIONS
    const ideaInput = page.locator('[data-testid="planning-idea-input"]');
    await ideaInput.fill('Хочу приложение для бюджета');

    // Start council
    await page.locator('[data-testid="planning-start-button"]').click();

    // Wait for council chat
    await expect(page.locator('[data-testid="council-chat"]')).toBeVisible({ timeout: 10000 });

    // Finish button should be visible
    const finishButton = page.locator('[data-testid="planning-finish-button"]');
    await expect(finishButton).toBeVisible();

    // Click finish
    await finishButton.click();

    // Product result should appear
    const productResult = page.locator('[data-testid="product-result"]');
    await expect(productResult).toBeVisible({ timeout: 10000 });

    // Should show questions (at least 2)
    const questions = page.locator('[data-testid="product-questions"]');
    await expect(questions).toBeVisible();

    const questionItems = questions.locator('li');
    const count = await questionItems.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('T2: PLAN flow - shows plan after finish', async ({ page }) => {
    await page.locator('[data-testid="planning-tab"]').click();

    // Enter idea WITH "MVP" or "быстро" → should get PLAN
    const ideaInput = page.locator('[data-testid="planning-idea-input"]');
    await ideaInput.fill('Сделаем MVP быстро');

    // Start council
    await page.locator('[data-testid="planning-start-button"]').click();

    // Wait for council chat
    await expect(page.locator('[data-testid="council-chat"]')).toBeVisible({ timeout: 10000 });

    // Finish button should be visible
    const finishButton = page.locator('[data-testid="planning-finish-button"]');
    await expect(finishButton).toBeVisible();

    // Click finish
    await finishButton.click();

    // Product result should appear
    const productResult = page.locator('[data-testid="product-result"]');
    await expect(productResult).toBeVisible({ timeout: 10000 });

    // Should show plan (not questions)
    const plan = page.locator('[data-testid="product-plan"]');
    await expect(plan).toBeVisible();

    // Should have at least 1 step
    const steps = page.locator('[data-testid="product-step"]');
    const stepCount = await steps.count();
    expect(stepCount).toBeGreaterThanOrEqual(1);
  });

  test('T3: Apply Plan creates tasks in TODO column', async ({ page }) => {
    await page.locator('[data-testid="planning-tab"]').click();

    // Enter idea WITH "MVP" → should get PLAN
    const ideaInput = page.locator('[data-testid="planning-idea-input"]');
    await ideaInput.fill('Build MVP quickly');

    // Start council
    await page.locator('[data-testid="planning-start-button"]').click();
    await expect(page.locator('[data-testid="council-chat"]')).toBeVisible({ timeout: 10000 });

    // Finish discussion
    await page.locator('[data-testid="planning-finish-button"]').click();
    await expect(page.locator('[data-testid="product-plan"]')).toBeVisible({ timeout: 10000 });

    // Apply Plan button should be visible
    const applyButton = page.locator('[data-testid="apply-plan-button"]');
    await expect(applyButton).toBeVisible();

    // Click Apply Plan
    await applyButton.click();

    // Should switch to tasks tab and show kanban board
    await waitForBoardReady(page);

    // Verify tasks appeared in TODO column (at least 1)
    const todoColumn = page.locator('[data-testid="column-todo"]');
    await expect(todoColumn).toBeVisible();

    // Wait for at least one task card to appear (tasks are created asynchronously)
    const taskCards = todoColumn.locator('[data-testid^="task-card-"]');
    await expect(taskCards.first()).toBeVisible({ timeout: 10000 });

    const taskCount = await taskCards.count();
    expect(taskCount).toBeGreaterThanOrEqual(1);
  });

  test('T4: Apply Plan increases TODO count and includes plan step text', async ({ page }) => {
    // 1. Wait for board ready, count tasks BEFORE
    await waitForBoardReady(page);
    const countBefore = await getTaskCountInColumn(page, 'todo');

    // 2. Go to Planning tab
    await page.locator('[data-testid="planning-tab"]').click();

    // 3. Enter idea that triggers PLAN mode
    const ideaInput = page.locator('[data-testid="planning-idea-input"]');
    await ideaInput.fill('Build MVP quickly');

    // 4. Start council → wait for chat
    await page.locator('[data-testid="planning-start-button"]').click();
    await expect(page.locator('[data-testid="council-chat"]')).toBeVisible({ timeout: 10000 });

    // 5. Finish discussion → wait for plan
    await page.locator('[data-testid="planning-finish-button"]').click();
    await expect(page.locator('[data-testid="product-plan"]')).toBeVisible({ timeout: 10000 });

    // 6. Get first step title text (to verify it appears on board)
    const firstStep = page.locator('[data-testid="product-step"]').first();
    const firstStepTitle = await firstStep.locator('h4').textContent();
    expect(firstStepTitle).toBeTruthy();

    // 7. Click Apply Plan (auto-switches to tasks tab)
    await page.locator('[data-testid="apply-plan-button"]').click();

    // 8. Wait for board ready
    await waitForBoardReady(page);

    // 9. Wait for task count to increase (polls until new tasks appear)
    await waitForTaskCountToIncrease(page, 'todo', countBefore);

    // 10. Count tasks AFTER (now that new tasks are in DOM)
    const countAfter = await getTaskCountInColumn(page, 'todo');

    // 11. Assert: count increased (redundant but explicit)
    expect(countAfter).toBeGreaterThan(countBefore);

    // 12. Verify task with plan step text exists
    await waitForTaskWithTextInColumn(page, 'todo', firstStepTitle!);
  });

  test('T5: Apply Plan is idempotent - second API call does not create duplicates', async ({ page }) => {
    // 1. Wait for board ready, count tasks BEFORE
    await waitForBoardReady(page);
    const countBefore = await getTaskCountInColumn(page, 'todo');

    // 2. Go to Planning tab
    await page.locator('[data-testid="planning-tab"]').click();

    // 3. Enter idea that triggers PLAN mode
    const ideaInput = page.locator('[data-testid="planning-idea-input"]');
    await ideaInput.fill('Build MVP for idempotency test');

    // 4. Start council → wait for chat
    await page.locator('[data-testid="planning-start-button"]').click();
    await expect(page.locator('[data-testid="council-chat"]')).toBeVisible({ timeout: 10000 });

    // 5. Finish discussion → wait for plan
    await page.locator('[data-testid="planning-finish-button"]').click();
    await expect(page.locator('[data-testid="product-plan"]')).toBeVisible({ timeout: 10000 });

    // 6. Intercept the apply request to capture sessionId
    let capturedSessionId: string | null = null;
    await page.route('**/api/projects/*/planning/apply', async (route, request) => {
      const postData = request.postDataJSON();
      capturedSessionId = postData?.sessionId;
      await route.continue();
    });

    // 7. Click Apply Plan (first time)
    await page.locator('[data-testid="apply-plan-button"]').click();

    // 8. Wait for board ready
    await waitForBoardReady(page);

    // 9. Wait for task count to increase (polls until new tasks appear)
    await waitForTaskCountToIncrease(page, 'todo', countBefore);

    // 10. Count tasks after first apply
    const countAfterFirstApply = await getTaskCountInColumn(page, 'todo');
    expect(countAfterFirstApply).toBeGreaterThan(countBefore);

    // 11. Call API directly second time (simulating race condition or retry)
    expect(capturedSessionId).toBeTruthy();
    const response = await page.request.post(`/api/projects/1/planning/apply`, {
      data: { sessionId: capturedSessionId },
    });
    const json = await response.json();

    // 12. API should return success with alreadyApplied flag
    expect(response.ok()).toBe(true);
    expect(json.alreadyApplied).toBe(true);

    // 13. Refresh tasks and verify count did NOT increase
    await page.locator('[data-testid="tasks-tab"]').click();
    await waitForBoardReady(page);
    const countAfterSecondApply = await getTaskCountInColumn(page, 'todo');

    // 14. Assert: count stays the same (no duplicates)
    expect(countAfterSecondApply).toBe(countAfterFirstApply);
  });

  test('T6: Apply Plan saves enrichment fields to created tasks', async ({ page }) => {
    // 1. Wait for board ready, count tasks BEFORE
    await waitForBoardReady(page);
    const countBefore = await getTaskCountInColumn(page, 'todo');

    // 2. Go to Planning tab
    await page.locator('[data-testid="planning-tab"]').click();

    // 3. Enter idea that triggers PLAN mode
    const ideaInput = page.locator('[data-testid="planning-idea-input"]');
    await ideaInput.fill('Build MVP for enrichment test');

    // 4. Start council → wait for chat
    await page.locator('[data-testid="planning-start-button"]').click();
    await expect(page.locator('[data-testid="council-chat"]')).toBeVisible({ timeout: 10000 });

    // 5. Finish discussion → wait for plan
    await page.locator('[data-testid="planning-finish-button"]').click();
    await expect(page.locator('[data-testid="product-plan"]')).toBeVisible({ timeout: 10000 });

    // 6. Get first step title text to identify the created task
    const firstStep = page.locator('[data-testid="product-step"]').first();
    const firstStepTitle = await firstStep.locator('h4').textContent();
    expect(firstStepTitle).toBeTruthy();

    // 7. Click Apply Plan
    await page.locator('[data-testid="apply-plan-button"]').click();

    // 8. Wait for board ready and task count to increase
    await waitForBoardReady(page);
    await waitForTaskCountToIncrease(page, 'todo', countBefore);

    // 9. Wait for task card with the plan step text to appear
    await waitForTaskWithTextInColumn(page, 'todo', firstStepTitle!);

    // 10. Click on the task card to open details panel
    const todoColumn = page.locator('[data-testid="column-todo"]');
    const taskCard = todoColumn.locator('[data-testid^="task-card-"]', { hasText: firstStepTitle! });
    await taskCard.first().click();

    // 11. Wait for task details panel to show the correct task (by title match)
    const taskDetailsPanel = page.locator('[data-testid="task-details-panel"]');
    await expect(taskDetailsPanel).toBeVisible({ timeout: 5000 });
    // Wait for panel to show a task whose title contains firstStepTitle
    await expect(taskDetailsPanel.locator('h2')).toContainText(firstStepTitle!, { timeout: 5000 });

    // 12. Get task description and verify enrichment marker
    const taskDescription = page.locator('[data-testid="task-description"]');
    await expect(taskDescription).toBeVisible();
    const descriptionText = await taskDescription.textContent();

    // 13. Assert: description contains enrichment marker [Px][S|M|L][tags]
    expect(descriptionText).toMatch(/^\[P[123]\]\[[SML]\]\[.*\]/);
  });
});
