/**
 * Fetch mock utilities for testing async hooks
 * Provides controlled promise resolution for testing race conditions
 */
import { vi } from 'vitest';

interface FetchCall {
  resolve: (data: any) => void;
  reject: (error: Error) => void;
  signal: AbortSignal;
}

/**
 * Creates a fetch mock with AbortController support
 * Use for testing abort/deduplication behavior
 */
export function createFetchMock() {
  const calls: FetchCall[] = [];

  const mockFetch = vi.fn((_url: string, options?: RequestInit) => {
    return new Promise((resolve, reject) => {
      const signal = options?.signal;

      if (signal?.aborted) {
        reject(new DOMException('Aborted', 'AbortError'));
        return;
      }

      signal?.addEventListener('abort', () => {
        reject(new DOMException('Aborted', 'AbortError'));
      });

      calls.push({
        resolve: (data) => resolve({ ok: true, json: () => Promise.resolve(data) }),
        reject,
        signal: signal!,
      });
    });
  });

  return { mockFetch, calls };
}

/**
 * Creates a simple fetch mock without abort handling
 * Use for testing requestId-based stale response protection
 */
export function createSimpleFetchMock() {
  const resolvers: Array<(data: any) => void> = [];

  const mockFetch = vi.fn(() => {
    return new Promise((resolve) => {
      resolvers.push((data) => resolve({ ok: true, json: () => Promise.resolve(data) }));
    });
  });

  return { mockFetch, resolvers };
}
