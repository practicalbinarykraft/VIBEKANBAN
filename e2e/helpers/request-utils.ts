/**
 * E2E Request Utilities
 *
 * Shared retry/health-check logic for all fixture API calls.
 * Prevents flaky ECONNRESET failures during server startup.
 */
import { APIRequestContext } from '@playwright/test';

// Network errors that should trigger retry
const RETRYABLE_ERRORS = ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'EAI_AGAIN', 'EPIPE'];

/**
 * Check if error is retryable (network issue or 5xx)
 */
function isRetryableError(error: unknown, statusCode?: number): boolean {
  if (statusCode && statusCode >= 500) return true;
  if (error instanceof Error) {
    return RETRYABLE_ERRORS.some((code) => error.message.includes(code));
  }
  return false;
}

interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
}

/**
 * Retry wrapper with exponential backoff
 * Retries only for network errors and 5xx responses
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxAttempts = 4, baseDelayMs = 250 } = options;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts || !isRetryableError(error)) {
        throw error;
      }
      const delay = baseDelayMs * Math.pow(2, attempt - 1); // 250, 500, 1000
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

interface HealthCheckOptions {
  timeoutMs?: number;
  intervalMs?: number;
}

/**
 * Wait for server to be ready (health check)
 * Polls a lightweight endpoint until server responds
 */
export async function waitForServerReady(
  request: APIRequestContext,
  options: HealthCheckOptions = {}
): Promise<void> {
  const { timeoutMs = 10000, intervalMs = 250 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await request.get('/api/settings');
      if (response.ok()) return;
    } catch {
      // Server not ready yet, continue polling
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`Server not ready after ${timeoutMs}ms`);
}

interface PostOptions {
  skipHealthCheck?: boolean;
  retryOptions?: RetryOptions;
}

/**
 * POST JSON with health check + retry
 * Use for all fixture API calls
 */
export async function postJsonWithRetry<T = unknown>(
  request: APIRequestContext,
  url: string,
  data: Record<string, unknown>,
  options: PostOptions = {}
): Promise<T> {
  const { skipHealthCheck = false, retryOptions } = options;

  // Health check before first request
  if (!skipHealthCheck) {
    await waitForServerReady(request);
  }

  return withRetry(async () => {
    const response = await request.post(url, { data });

    if (!response.ok()) {
      const text = await response.text();
      const status = response.status();

      // Don't retry 4xx (contract/logic errors)
      if (status >= 400 && status < 500) {
        throw new Error(`Request failed (${status}): ${text}`);
      }

      // 5xx - create error that will be retried
      const err = new Error(`Request failed (${status}): ${text}`);
      (err as any).statusCode = status;
      throw err;
    }

    return response.json() as Promise<T>;
  }, retryOptions);
}

/**
 * POST with health check + retry (no JSON response expected)
 */
export async function postWithRetry(
  request: APIRequestContext,
  url: string,
  data: Record<string, unknown>,
  options: PostOptions = {}
): Promise<void> {
  const { skipHealthCheck = false, retryOptions } = options;

  if (!skipHealthCheck) {
    await waitForServerReady(request);
  }

  await withRetry(async () => {
    const response = await request.post(url, { data });

    if (!response.ok()) {
      const text = await response.text();
      const status = response.status();

      if (status >= 400 && status < 500) {
        throw new Error(`Request failed (${status}): ${text}`);
      }

      const err = new Error(`Request failed (${status}): ${text}`);
      (err as any).statusCode = status;
      throw err;
    }
  }, retryOptions);
}

/**
 * DELETE with health check + retry
 */
export async function deleteWithRetry(
  request: APIRequestContext,
  url: string,
  options: PostOptions = {}
): Promise<void> {
  const { skipHealthCheck = false, retryOptions } = options;

  if (!skipHealthCheck) {
    await waitForServerReady(request);
  }

  await withRetry(async () => {
    const response = await request.delete(url);

    if (!response.ok()) {
      const text = await response.text();
      const status = response.status();

      if (status >= 400 && status < 500) {
        throw new Error(`Request failed (${status}): ${text}`);
      }

      const err = new Error(`Request failed (${status}): ${text}`);
      (err as any).statusCode = status;
      throw err;
    }
  }, retryOptions);
}
