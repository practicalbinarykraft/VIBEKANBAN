import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration
 *
 * Supports two modes:
 * 1. External runner (e2e:ci): PLAYWRIGHT_BASE_URL is set, no webServer needed
 * 2. Legacy mode: webServer auto-starts on port 8000
 */

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8000';
const useExternalServer = !!process.env.PLAYWRIGHT_BASE_URL;
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: useExternalServer ? 2 : 1,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Only start webServer if not using external runner
  ...(useExternalServer
    ? {}
    : {
        webServer: {
          command: isCI
            ? 'PLAYWRIGHT=1 npm start'
            : 'PLAYWRIGHT=1 npm run dev',
          url: 'http://localhost:8000',
          reuseExistingServer: !isCI,
          timeout: 120000,
        },
      }),
});
