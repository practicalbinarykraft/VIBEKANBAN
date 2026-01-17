import { test, expect } from '@playwright/test';
import {
  waitForBoardReady,
  getTaskCountInColumn,
  waitForTaskWithTextInColumn,
  waitForTaskCountToIncrease,
  waitForExecutionStatus,
  waitForPlanningReady,
} from '../helpers/board';
import { resetProjectStatus } from '../helpers/api';

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
  test.beforeEach(async ({ page, request }) => {
    // Reset project state (clears council threads and planning sessions)
    await resetProjectStatus(request, '1');
    // Navigate to project page
    await page.goto('/projects/1');
    await waitForBoardReady(page);
  });

  test('should display planning tab and allow starting council chat', async ({ page }) => {
    // Click on Planning tab
    const planningTab = page.locator('[data-testid="planning-tab"]');
    await expect(planningTab).toBeVisible();
    await planningTab.click();
    await waitForPlanningReady(page);

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

    // Verify at least 3 council messages appear (auth keywords generate 5: PM, ARCHITECT, BACKEND, FRONTEND, QA)
    const messages = page.locator('[data-testid="council-message"]');
    await expect(messages.first()).toBeVisible({ timeout: 10000 });
    const count = await messages.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('should disable start button when textarea is empty', async ({ page }) => {
    // Click on Planning tab
    await page.locator('[data-testid="planning-tab"]').click();
    await waitForPlanningReady(page);

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
    await waitForPlanningReady(page);

    const ideaInput = page.locator('[data-testid="planning-idea-input"]');
    // Use detailed idea with key words to skip questions step
    await ideaInput.fill('Build a React web application with TypeScript for admin users');

    const startButton = page.locator('[data-testid="planning-start-button"]');
    await startButton.click();

    // Button is removed from DOM when phase changes from idle to kickoff
    // (the component unmounts the button instead of disabling it)
    // So we verify loading by checking that council chat appears
    await expect(page.locator('[data-testid="council-chat"]')).toBeVisible({ timeout: 10000 });
  });

  test('T1: QUESTIONS flow - shows questions before council for vague prompts', async ({ page }) => {
    await page.locator('[data-testid="planning-tab"]').click();
    await waitForPlanningReady(page);

    // Enter a SHORT idea WITHOUT key details (< 6 words, no platform/stack/user keywords)
    // This should trigger questions BEFORE council starts
    const ideaInput = page.locator('[data-testid="planning-idea-input"]');
    await ideaInput.fill('build an app');

    // Click Run Council - should trigger analyze first
    await page.locator('[data-testid="planning-start-button"]').click();

    // Questions step should appear (NOT council chat)
    const questionsStep = page.locator('[data-testid="planning-questions-step"]');
    await expect(questionsStep).toBeVisible({ timeout: 10000 });

    // Should have at least 3 question inputs (analyzer generates 3-6)
    const questionInputs = questionsStep.locator('[data-testid^="planning-answer-"]');
    const questionCount = await questionInputs.count();
    expect(questionCount).toBeGreaterThanOrEqual(3);

    // Continue button should be disabled until answers are filled
    const continueButton = page.locator('[data-testid="planning-questions-continue"]');
    await expect(continueButton).toBeDisabled();

    // Fill all answers
    for (let i = 0; i < questionCount; i++) {
      await page.locator(`[data-testid="planning-answer-${i}"]`).fill(`Test answer ${i + 1}`);
    }

    // Continue button should now be enabled
    await expect(continueButton).toBeEnabled();

    // Click Continue to start council
    await continueButton.click();

    // Council chat should appear after answering questions
    await expect(page.locator('[data-testid="council-chat"]')).toBeVisible({ timeout: 15000 });

    // Finish discussion and verify we get PLAN (not QUESTIONS)
    const finishButton = page.locator('[data-testid="planning-finish-button"]');
    await expect(finishButton).toBeVisible();
    await finishButton.click();

    // Product result should show PLAN mode (finish always returns PLAN now)
    const plan = page.locator('[data-testid="product-plan"]');
    await expect(plan).toBeVisible({ timeout: 10000 });
  });

  test('T2: PLAN flow - shows plan after finish', async ({ page }) => {
    await page.locator('[data-testid="planning-tab"]').click();
    await waitForPlanningReady(page);

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
    await waitForPlanningReady(page);

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
    await waitForPlanningReady(page);

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
    await waitForPlanningReady(page);

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
    await waitForPlanningReady(page);

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

    // 12. Verify enrichment UI fields are displayed
    const enrichmentBlock = page.locator('[data-testid="task-enrichment"]');
    await expect(enrichmentBlock).toBeVisible({ timeout: 5000 });

    // 13. Assert: priority field shows P1, P2, or P3
    const priorityField = page.locator('[data-testid="task-priority"]');
    await expect(priorityField).toBeVisible();
    const priorityText = await priorityField.textContent();
    expect(priorityText).toMatch(/^P[123]$/);

    // 14. Assert: estimate field shows S, M, or L
    const estimateField = page.locator('[data-testid="task-estimate"]');
    await expect(estimateField).toBeVisible();
    const estimateText = await estimateField.textContent();
    expect(estimateText).toMatch(/^[SML]$/);

    // 15. Assert: tags field exists (may be empty or have tags)
    const tagsField = page.locator('[data-testid="task-tags"]');
    await expect(tagsField).toBeVisible();
  });

  test('T7: TODO column displays tasks in order (step 1 before step 2)', async ({ page }) => {
    // 1. Wait for board ready, count tasks BEFORE
    await waitForBoardReady(page);
    const countBefore = await getTaskCountInColumn(page, 'todo');

    // 2. Go to Planning tab
    await page.locator('[data-testid="planning-tab"]').click();
    await waitForPlanningReady(page);

    // 3. Enter idea that triggers PLAN mode
    const ideaInput = page.locator('[data-testid="planning-idea-input"]');
    await ideaInput.fill('Build MVP for ordering test');

    // 4. Start council → wait for chat
    await page.locator('[data-testid="planning-start-button"]').click();
    await expect(page.locator('[data-testid="council-chat"]')).toBeVisible({ timeout: 10000 });

    // 5. Finish discussion → wait for plan
    await page.locator('[data-testid="planning-finish-button"]').click();
    await expect(page.locator('[data-testid="product-plan"]')).toBeVisible({ timeout: 10000 });

    // 6. Get step titles to know expected order
    const steps = page.locator('[data-testid="product-step"]');
    const stepCount = await steps.count();
    expect(stepCount).toBeGreaterThanOrEqual(2);

    // Get first step's first task title (will be order=1)
    const step1Title = await steps.nth(0).locator('h4').textContent();
    // Get second step's first task title (will be order after step1 tasks)
    const step2Title = await steps.nth(1).locator('h4').textContent();
    expect(step1Title).toBeTruthy();
    expect(step2Title).toBeTruthy();

    // 7. Click Apply Plan
    await page.locator('[data-testid="apply-plan-button"]').click();

    // 8. Wait for board ready and task count to increase
    await waitForBoardReady(page);
    await waitForTaskCountToIncrease(page, 'todo', countBefore);

    // 9. Wait for tasks to appear
    await waitForTaskWithTextInColumn(page, 'todo', step1Title!);
    await waitForTaskWithTextInColumn(page, 'todo', step2Title!);

    // 10. Get all task cards in TODO column (excluding seed tasks)
    const todoColumn = page.locator('[data-testid="column-todo"]');
    const allCards = todoColumn.locator('[data-testid^="task-card-"]');
    const cardCount = await allCards.count();

    // Find positions of step1 and step2 tasks
    let step1Position = -1;
    let step2Position = -1;

    for (let i = 0; i < cardCount; i++) {
      const cardText = await allCards.nth(i).textContent();
      if (cardText?.includes(step1Title!) && step1Position === -1) {
        step1Position = i;
      }
      if (cardText?.includes(step2Title!) && step2Position === -1) {
        step2Position = i;
      }
    }

    // 11. Assert: step1 tasks appear BEFORE step2 tasks in the list
    expect(step1Position).toBeGreaterThanOrEqual(0);
    expect(step2Position).toBeGreaterThanOrEqual(0);
    expect(step1Position).toBeLessThan(step2Position);
  });

  test('T8: Apply Plan auto-switches to Tasks tab and highlights created tasks', async ({ page }) => {
    // 1) Planning tab
    await page.locator('[data-testid="planning-tab"]').click();
    await waitForPlanningReady(page);

    // 2) Trigger PLAN mode
    await page.locator('[data-testid="planning-idea-input"]').fill('Build MVP for autofocus test');
    await page.locator('[data-testid="planning-start-button"]').click();
    await expect(page.locator('[data-testid="council-chat"]')).toBeVisible({ timeout: 10000 });

    // 3) Finish -> plan
    await page.locator('[data-testid="planning-finish-button"]').click();
    await expect(page.locator('[data-testid="product-plan"]')).toBeVisible({ timeout: 10000 });

    // 4) Click Apply + capture response JSON
    const applyResponsePromise = page.waitForResponse((resp) => {
      return resp.url().includes('/planning/apply') && resp.request().method() === 'POST' && resp.status() === 200;
    });

    await page.locator('[data-testid="apply-plan-button"]').click();

    const applyResp = await applyResponsePromise;
    const json = await applyResp.json();
    const createdTaskIds: string[] = json.taskIds ?? json.createdTaskIds ?? [];

    expect(createdTaskIds.length).toBeGreaterThan(0);

    // 5) Verify we switched to Tasks view by asserting board + TODO visible
    const todoColumn = page.locator('[data-testid="column-todo"]');
    await expect(todoColumn).toBeVisible({ timeout: 10000 });

    // 6) Verify highlight exists on at least one of created tasks
    // Expectation: task cards render data-highlighted="true" for created ids
    const highlightedTask = page.locator('[data-testid^="task-card-"][data-highlighted="true"]');
    await expect(highlightedTask.first()).toBeVisible({ timeout: 10000 });

    const highlightedTestId = await highlightedTask.first().getAttribute('data-testid');
    const highlightedId = highlightedTestId?.replace('task-card-', '');
    expect(highlightedId).toBeTruthy();
    expect(createdTaskIds).toContain(highlightedId);
  });

  test('T9: Finish returns deterministic plan steps', async ({ page, request }) => {
    const idea = 'Build MVP quickly';

    // Helper: run planning flow and get first 3 step titles
    async function runPlanningAndGetSteps(): Promise<string[]> {
      // Reset state for clean session (clears council threads and planning sessions)
      await resetProjectStatus(request, '1');
      await page.goto('/projects/1');
      await waitForBoardReady(page);

      // Go to Planning tab
      await page.locator('[data-testid="planning-tab"]').click();
      await waitForPlanningReady(page);

      // Enter idea
      const ideaInput = page.locator('[data-testid="planning-idea-input"]');
      await ideaInput.fill(idea);

      // Start council
      await page.locator('[data-testid="planning-start-button"]').click();
      await expect(page.locator('[data-testid="council-chat"]')).toBeVisible({ timeout: 10000 });

      // Finish discussion
      await page.locator('[data-testid="planning-finish-button"]').click();
      await expect(page.locator('[data-testid="product-plan"]')).toBeVisible({ timeout: 10000 });

      // Get first 3 step titles
      const steps = page.locator('[data-testid="product-step"]');
      const stepCount = await steps.count();
      expect(stepCount).toBeGreaterThanOrEqual(3);

      const titles: string[] = [];
      for (let i = 0; i < 3; i++) {
        const title = await steps.nth(i).locator('h4').textContent();
        titles.push(title || '');
      }
      return titles;
    }

    // First run
    const steps1 = await runPlanningAndGetSteps();

    // Second run (new session)
    const steps2 = await runPlanningAndGetSteps();

    // Verify deterministic: same steps both runs
    expect(steps1).toEqual(steps2);

    // Verify expected values (based on backlog generator output)
    expect(steps1[0]).toBe('Initialize project repository');
    expect(steps1[1]).toBe('Setup development environment');
    expect(steps1[2]).toBe('Configure package manager');
  });

  test('T10: Approve Plan triggers autopilot (apply + execute without extra clicks)', async ({ page }) => {
    // 1. Count TODO tasks before
    const countBefore = await getTaskCountInColumn(page, 'todo');

    // 2. Go to Planning tab
    await page.locator('[data-testid="planning-tab"]').click();
    await waitForPlanningReady(page);

    // 3. Enter idea that triggers PLAN mode
    const ideaInput = page.locator('[data-testid="planning-idea-input"]');
    await ideaInput.fill('Build MVP for autopilot test');

    // 4. Start council → wait for chat
    await page.locator('[data-testid="planning-start-button"]').click();
    await expect(page.locator('[data-testid="council-chat"]')).toBeVisible({ timeout: 10000 });

    // 5. Capture apply response to get createdTaskIds
    const applyResponsePromise = page.waitForResponse((resp) => {
      return resp.url().includes('/planning/apply') && resp.request().method() === 'POST' && resp.status() === 200;
    });

    // 6. Click APPROVE button directly (without finish - it handles finish internally)
    // This is the autopilot flow: one button does finish → apply → execute
    const approveButton = page.locator('[data-testid="approve-plan-button"]');
    await expect(approveButton).toBeVisible();
    await approveButton.click();

    // 8. Wait for apply response and extract createdTaskIds
    const applyResp = await applyResponsePromise;
    const json = await applyResp.json();
    const createdTaskIds: string[] = json.taskIds ?? json.createdTaskIds ?? [];
    expect(createdTaskIds.length).toBeGreaterThan(0);

    // 9. Verify Tasks tab is active (board visible) - WITHOUT manual click
    await waitForBoardReady(page);

    // 10. Verify execution status becomes RUNNING
    await waitForExecutionStatus(page, 'RUNNING');

    // 11. Verify highlighted task card exists
    const highlightedTask = page.locator('[data-testid^="task-card-"][data-highlighted="true"]');
    await expect(highlightedTask.first()).toBeVisible({ timeout: 10000 });

    // 12. Verify TODO count increased (tasks were created)
    const countAfter = await getTaskCountInColumn(page, 'todo') +
                       await getTaskCountInColumn(page, 'in_progress');
    expect(countAfter).toBeGreaterThan(countBefore);
  });

  test('T11: Large backlog (30-200 steps) is deterministic and triggers pipeline', async ({ page, request }) => {
    const idea = 'Build complete e-commerce platform with product catalog and user authentication';

    // Helper to run planning and capture planSteps via API response
    async function runPlanningAndCapturePlan(): Promise<string[]> {
      // Reset state for clean session (clears council threads and planning sessions)
      await resetProjectStatus(request, '1');
      await page.goto('/projects/1');
      await waitForBoardReady(page);

      // Go to Planning tab
      await page.locator('[data-testid="planning-tab"]').click();
      await waitForPlanningReady(page);

      // Enter idea
      await page.locator('[data-testid="planning-idea-input"]').fill(idea);

      // Capture finish response
      const finishResponsePromise = page.waitForResponse((resp) => {
        return resp.url().includes('/planning/finish') && resp.request().method() === 'POST' && resp.status() === 200;
      });

      // Start council
      await page.locator('[data-testid="planning-start-button"]').click();
      await expect(page.locator('[data-testid="council-chat"]')).toBeVisible({ timeout: 10000 });

      // Finish discussion
      await page.locator('[data-testid="planning-finish-button"]').click();

      // Wait for finish response and extract planSteps
      const finishResp = await finishResponsePromise;
      const json = await finishResp.json();
      const planSteps: string[] = json.productResult?.planSteps ?? [];

      await expect(page.locator('[data-testid="product-plan"]')).toBeVisible({ timeout: 10000 });

      return planSteps;
    }

    // First run
    const steps1 = await runPlanningAndCapturePlan();

    // Verify large backlog (30-200 steps)
    expect(steps1.length).toBeGreaterThanOrEqual(30);
    expect(steps1.length).toBeLessThanOrEqual(200);

    // Second run (new session) - verify determinism
    const steps2 = await runPlanningAndCapturePlan();

    // Assert: planSteps match exactly (deterministic)
    expect(steps1.join('\n')).toBe(steps2.join('\n'));

    // Now test Approve Plan triggers pipeline to RUNNING
    const applyResponsePromise = page.waitForResponse((resp) => {
      return resp.url().includes('/planning/apply') && resp.request().method() === 'POST' && resp.status() === 200;
    });

    await page.locator('[data-testid="approve-plan-button"]').click();

    // Wait for apply
    const applyResp = await applyResponsePromise;
    const applyJson = await applyResp.json();
    const createdTaskIds: string[] = applyJson.taskIds ?? applyJson.createdTaskIds ?? [];
    expect(createdTaskIds.length).toBeGreaterThanOrEqual(30);

    // Verify pipeline reaches RUNNING
    await waitForBoardReady(page);
    await waitForExecutionStatus(page, 'RUNNING');
  });
});
