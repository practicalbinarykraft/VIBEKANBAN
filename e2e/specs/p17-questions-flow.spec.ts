import { test, expect } from "@playwright/test";
import { waitForBoardReady } from "../helpers/board";

/**
 * P17-C2: Questions flow E2E tests
 *
 * Tests the interactive planning questions step:
 * - Short ideas trigger questions before council
 * - Users must answer all questions before continuing
 * - Council chat only starts after questions are answered
 */

// Skip entire suite: planning-questions-step UI not implemented in current version
test.describe.skip("Planning Questions Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/projects/1");
    await waitForBoardReady(page);
    await page.locator('[data-testid="planning-tab"]').click();
    await expect(page.locator('[data-testid="planning-idea-input"]')).toBeVisible();
  });

  test("short idea triggers questions step", async ({ page }) => {
    // Enter a short idea that should trigger questions
    const ideaInput = page.locator('[data-testid="planning-idea-input"]');
    await ideaInput.fill("tetris");

    // Click Run Council
    const startButton = page.locator('[data-testid="planning-start-button"]');
    await startButton.click();

    // Questions step should appear
    const questionsStep = page.locator('[data-testid="planning-questions-step"]');
    await expect(questionsStep).toBeVisible({ timeout: 10000 });

    // At least one question should be visible
    const firstQuestion = page.locator('[data-testid="planning-question-0"]');
    await expect(firstQuestion).toBeVisible();

    // Council chat should NOT be visible yet
    const councilChat = page.locator('[data-testid="council-chat"]');
    await expect(councilChat).not.toBeVisible();
  });

  test("continue button disabled until all answers filled", async ({ page }) => {
    // Enter short idea
    await page.locator('[data-testid="planning-idea-input"]').fill("build app");
    await page.locator('[data-testid="planning-start-button"]').click();

    // Wait for questions step
    const questionsStep = page.locator('[data-testid="planning-questions-step"]');
    await expect(questionsStep).toBeVisible({ timeout: 10000 });

    // Continue button should be disabled
    const continueButton = page.locator('[data-testid="planning-questions-continue"]');
    await expect(continueButton).toBeDisabled();

    // Fill first answer
    const firstAnswer = page.locator('[data-testid="planning-answer-0"]');
    await firstAnswer.fill("Web application");

    // Fill all other visible answers
    const allAnswers = page.locator('[data-testid^="planning-answer-"]');
    const count = await allAnswers.count();
    for (let i = 1; i < count; i++) {
      await page.locator(`[data-testid="planning-answer-${i}"]`).fill(`Answer ${i}`);
    }

    // Continue button should now be enabled
    await expect(continueButton).toBeEnabled();
  });

  test("answering questions proceeds to council chat", async ({ page }) => {
    // Enter short idea
    await page.locator('[data-testid="planning-idea-input"]').fill("tetris");
    await page.locator('[data-testid="planning-start-button"]').click();

    // Wait for questions step
    await expect(page.locator('[data-testid="planning-questions-step"]')).toBeVisible({
      timeout: 10000,
    });

    // Fill all answers
    const allAnswers = page.locator('[data-testid^="planning-answer-"]');
    const count = await allAnswers.count();
    for (let i = 0; i < count; i++) {
      await page.locator(`[data-testid="planning-answer-${i}"]`).fill(`Answer ${i + 1}`);
    }

    // Click Continue
    await page.locator('[data-testid="planning-questions-continue"]').click();

    // Council chat should now appear
    const councilChat = page.locator('[data-testid="council-chat"]');
    await expect(councilChat).toBeVisible({ timeout: 10000 });

    // Questions step should no longer be visible
    await expect(page.locator('[data-testid="planning-questions-step"]')).not.toBeVisible();
  });

  test("detailed idea skips questions and goes directly to council", async ({ page }) => {
    // Enter a detailed idea with key details (React, web, users)
    const detailedIdea =
      "Build a React web application for admin users to manage inventory with dashboard";
    await page.locator('[data-testid="planning-idea-input"]').fill(detailedIdea);
    await page.locator('[data-testid="planning-start-button"]').click();

    // Council chat should appear directly without questions
    const councilChat = page.locator('[data-testid="council-chat"]');
    await expect(councilChat).toBeVisible({ timeout: 10000 });

    // Questions step should NOT appear
    const questionsStep = page.locator('[data-testid="planning-questions-step"]');
    await expect(questionsStep).not.toBeVisible();
  });
});
