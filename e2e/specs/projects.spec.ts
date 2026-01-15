import { test, expect } from '@playwright/test';

test.describe('Projects Page', () => {
  test('P16: Create new project via modal', async ({ page }) => {
    // Go to /projects
    await page.goto('/projects');

    // Wait for the page to finish loading (loading state shows "Loading projects...")
    await expect(page.locator('text=Loading projects...')).not.toBeVisible({ timeout: 10000 });

    // Wait for the Projects header to be visible
    await expect(page.locator('h1:has-text("Projects")')).toBeVisible({ timeout: 5000 });

    // Click new-project-button (use first() since there might be two: header and empty state)
    const newProjectButton = page.locator('[data-testid="new-project-button"]').first();
    await expect(newProjectButton).toBeVisible({ timeout: 5000 });
    await newProjectButton.click();

    // Expect modal visible
    const modal = page.locator('[data-testid="new-project-modal"]');
    await expect(modal).toBeVisible();

    // Fill name
    const nameInput = page.locator('[data-testid="new-project-name-input"]');
    await expect(nameInput).toBeVisible();
    const projectName = `test-project-${Date.now()}`;
    await nameInput.fill(projectName);

    // Submit
    const submitButton = page.locator('[data-testid="create-project-submit"]');
    await expect(submitButton).toBeVisible();
    await submitButton.click();

    // Wait for modal to close
    await expect(modal).not.toBeVisible({ timeout: 5000 });

    // Expect new project card visible (no page reload) - use h3 to avoid matching URL
    const projectCard = page.locator(`h3:has-text("${projectName}")`);
    await expect(projectCard).toBeVisible({ timeout: 5000 });
  });

  test('P16: Can open project board after creating', async ({ page }) => {
    // Go to /projects
    await page.goto('/projects');

    // Wait for the page to finish loading
    await expect(page.locator('text=Loading projects...')).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator('h1:has-text("Projects")')).toBeVisible({ timeout: 5000 });

    // Click new-project-button
    await page.locator('[data-testid="new-project-button"]').first().click();

    // Fill name and submit
    const projectName = `board-test-${Date.now()}`;
    await page.locator('[data-testid="new-project-name-input"]').fill(projectName);
    await page.locator('[data-testid="create-project-submit"]').click();

    // Wait for modal to close and project card to appear
    await expect(page.locator('[data-testid="new-project-modal"]')).not.toBeVisible({ timeout: 5000 });
    const projectTitle = page.locator(`h3:has-text("${projectName}")`);
    await expect(projectTitle).toBeVisible({ timeout: 5000 });

    // Click on the project card to open board
    await projectTitle.click();

    // Should navigate to project board
    await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+/);
  });
});
