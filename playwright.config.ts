import { defineConfig, devices } from '@playwright/test';

// In CI, use production build (more stable); locally use dev server (faster iteration)
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:8000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: isCI
      ? 'PLAYWRIGHT=1 FEATURE_AUTOPILOT_V2=1 npm start'        // Production server (stable for 77+ tests)
      : 'PLAYWRIGHT=1 FEATURE_AUTOPILOT_V2=1 npm run dev',     // Dev server (fast HMR for local dev)
    url: 'http://localhost:8000',
    reuseExistingServer: !isCI,
    timeout: 120000,
  },
});
