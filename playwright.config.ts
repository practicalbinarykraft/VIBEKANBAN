import { defineConfig, devices } from '@playwright/test';
import { getE2EProfile } from './e2e/config/e2e-profile';

const profile = getE2EProfile();
const isCI = profile === 'ci';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: 1,

  // Profile-based reporter: CI uses html, local uses lightweight list
  reporter: isCI ? 'html' : 'list',

  use: {
    baseURL: 'http://localhost:8000',

    // Profile-based trace: CI captures on-first-retry, local disables for memory savings
    trace: isCI ? 'on-first-retry' : 'off',

    // Profile-based video: CI can capture, local disables to avoid OOM (exit 137)
    video: isCI ? 'on-first-retry' : 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: isCI
      ? 'PLAYWRIGHT=1 FEATURE_AUTOPILOT_V2=1 npm start'
      : 'PLAYWRIGHT=1 FEATURE_AUTOPILOT_V2=1 npm run dev',
    url: 'http://localhost:8000',
    reuseExistingServer: !isCI,
    timeout: 120000,
  },
});
