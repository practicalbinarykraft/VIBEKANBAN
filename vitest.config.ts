import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: [
      'hooks/__tests__/**/*.test.{ts,tsx}',
      'lib/__tests__/**/*.test.{ts,tsx}',
      'server/services/__tests__/**/*.test.ts',
      'server/services/execution/__tests__/**/*.test.ts',
      'server/services/autopilot/__tests__/**/*.test.ts',
      'server/jobs/__tests__/**/*.test.ts',
      'components/**/__tests__/**/*.test.{ts,tsx}',
    ],
    exclude: [
      'node_modules/**',
      // Exclude tests that use node:test instead of vitest
      'server/services/__tests__/github-client.test.ts',
      'server/services/__tests__/pr-status.test.ts',
    ],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
