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
      'server/services/__tests__/planning-session-store.test.ts',
    ],
    exclude: ['node_modules/**'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
