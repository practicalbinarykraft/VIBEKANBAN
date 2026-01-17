/**
 * Base URL helper for E2E tests
 * Uses PLAYWRIGHT_BASE_URL env var or falls back to 127.0.0.1:3001
 * Using 127.0.0.1 to avoid IPv6 ::1 issues
 */
export const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3001';

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${BASE_URL}${normalizedPath}`;
}
