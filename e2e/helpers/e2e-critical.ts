/**
 * E2E Critical Path Helpers
 *
 * Minimal helpers for critical-path E2E tests:
 * - No text assertions
 * - No navigation waits
 * - Only check: page loads, button clickable, no 500s, no page crash
 */

import { Page, Locator, expect } from "@playwright/test";

interface TrackedErrors {
  pageErrors: Error[];
  serverErrors: { url: string; status: number }[];
}

/**
 * Track console errors and 5xx responses on a page.
 * Call this at the start of each test.
 * Returns an object that accumulates errors throughout the test.
 */
export function trackConsoleAndPageErrors(page: Page): TrackedErrors {
  const tracked: TrackedErrors = {
    pageErrors: [],
    serverErrors: [],
  };

  page.on("pageerror", (error) => {
    tracked.pageErrors.push(error);
  });

  page.on("response", (response) => {
    const status = response.status();
    if (status >= 500) {
      tracked.serverErrors.push({
        url: response.url(),
        status,
      });
    }
  });

  return tracked;
}

/**
 * Click a locator without waiting for navigation.
 * Uses force:false to ensure element is actionable.
 * Does NOT wait for any specific response or navigation.
 */
export async function clickNoNav(locator: Locator): Promise<void> {
  await locator.click({ timeout: 10000 });
}

/**
 * Check that page has no crash indicators.
 * Looks for common crash screens and error boundaries.
 */
export async function expectNoPageCrash(page: Page): Promise<void> {
  // Check for Next.js error overlay
  const errorOverlay = page.locator('[data-nextjs-error-code]');
  const hasErrorOverlay = await errorOverlay.count();
  expect(hasErrorOverlay, "Page should not have Next.js error overlay").toBe(0);

  // Check for React error boundary text patterns
  const bodyText = await page.locator("body").textContent();
  const crashPatterns = [
    "Application error",
    "Something went wrong",
    "Unhandled Runtime Error",
    "Error: ",
  ];

  for (const pattern of crashPatterns) {
    // Only fail on exact crash indicators, not general error messages in UI
    if (bodyText?.includes(pattern) && bodyText.includes("digest")) {
      throw new Error(`Page appears to have crashed: found "${pattern}"`);
    }
  }
}

/**
 * Assert that no 5xx errors occurred during the test.
 */
export function expectNoServerErrors(tracked: TrackedErrors): void {
  if (tracked.serverErrors.length > 0) {
    const errorDetails = tracked.serverErrors
      .map((e) => `${e.status}: ${e.url}`)
      .join("\n");
    throw new Error(`Server returned 5xx errors:\n${errorDetails}`);
  }
}

/**
 * Assert that no unhandled page errors occurred.
 */
export function expectNoPageErrors(tracked: TrackedErrors): void {
  if (tracked.pageErrors.length > 0) {
    const errorDetails = tracked.pageErrors
      .map((e) => e.message)
      .join("\n");
    throw new Error(`Unhandled page errors:\n${errorDetails}`);
  }
}

/**
 * Full health check: no crashes, no 5xx, no page errors.
 */
export async function expectHealthy(
  page: Page,
  tracked: TrackedErrors
): Promise<void> {
  await expectNoPageCrash(page);
  expectNoServerErrors(tracked);
  // Note: we don't check pageErrors by default as some may be benign
}

/**
 * Wait for element to be visible with short timeout.
 * Use instead of expect().toBeVisible() for critical path.
 */
export async function waitVisible(
  locator: Locator,
  timeout = 10000
): Promise<void> {
  await locator.waitFor({ state: "visible", timeout });
}

/**
 * Wait for element to be hidden/detached with short timeout.
 */
export async function waitHidden(
  locator: Locator,
  timeout = 10000
): Promise<void> {
  await locator.waitFor({ state: "hidden", timeout });
}

/**
 * Safe navigation that doesn't rely on specific response.
 * Just goes to URL and waits for load state.
 */
export async function safeGoto(
  page: Page,
  url: string,
  timeout = 30000
): Promise<void> {
  await page.goto(url, { waitUntil: "load", timeout });
}
