/**
 * Unit tests for useProjectTasks hook
 *
 * Covers refresh contract:
 * - A) AbortController deduplication: second call aborts first, only latest updates state
 * - B) isRefreshing lifecycle: true during fetch, false after success/error
 * - C) Stale response protection: requestId prevents old responses from overwriting new data
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useProjectTasks } from '../useProjectTasks';
import { createFetchMock, createSimpleFetchMock } from '../../test/fetch-mock';

describe('useProjectTasks', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  describe('A) refreshTasks deduplication', () => {
    it('aborts first request when second is called immediately', async () => {
      const { mockFetch, calls } = createFetchMock();
      vi.stubGlobal('fetch', mockFetch);

      const { result } = renderHook(() => useProjectTasks('1'));
      await act(async () => { calls[0]?.resolve([]); });

      await act(async () => {
        result.current.refreshTasks();
        result.current.refreshTasks();
      });

      expect(calls[1]?.signal.aborted).toBe(true);
      expect(calls[2]?.signal.aborted).toBe(false);
    });

    it('state updates ONLY from second request', async () => {
      const { mockFetch, calls } = createFetchMock();
      vi.stubGlobal('fetch', mockFetch);

      const { result } = renderHook(() => useProjectTasks('1'));
      await act(async () => { calls[0]?.resolve([]); });

      await act(async () => {
        result.current.refreshTasks();
        result.current.refreshTasks();
      });

      await act(async () => {
        calls[2]?.resolve([{ id: '2', title: 'From second', status: 'todo' }]);
      });

      await waitFor(() => {
        expect(result.current.tasks).toHaveLength(1);
        expect(result.current.tasks[0].title).toBe('From second');
      });
    });
  });

  describe('B) isRefreshing lifecycle', () => {
    it('isRefreshing=true during request, false after', async () => {
      const { mockFetch, calls } = createFetchMock();
      vi.stubGlobal('fetch', mockFetch);

      const { result } = renderHook(() => useProjectTasks('1'));
      await act(async () => { calls[0]?.resolve([]); });

      act(() => { result.current.refreshTasks(); });
      expect(result.current.isRefreshing).toBe(true);

      await act(async () => { calls[1]?.resolve([{ id: '1', title: 'Task', status: 'todo' }]); });
      await waitFor(() => { expect(result.current.isRefreshing).toBe(false); });
    });

    it('isRefreshing=false after error', async () => {
      const { mockFetch, calls } = createFetchMock();
      vi.stubGlobal('fetch', mockFetch);

      const { result } = renderHook(() => useProjectTasks('1'));
      await act(async () => { calls[0]?.resolve([]); });

      act(() => { result.current.refreshTasks(); });
      expect(result.current.isRefreshing).toBe(true);

      await act(async () => { calls[1]?.reject(new Error('Network error')); });
      await waitFor(() => {
        expect(result.current.isRefreshing).toBe(false);
        expect(result.current.error).toBeTruthy();
      });
    });
  });

  describe('C) stale response protection', () => {
    it('ignores first response if aborted', async () => {
      const { mockFetch, calls } = createFetchMock();
      vi.stubGlobal('fetch', mockFetch);

      const { result } = renderHook(() => useProjectTasks('1'));
      await act(async () => { calls[0]?.resolve([]); });

      await act(async () => {
        result.current.refreshTasks();
        result.current.refreshTasks();
      });

      await act(async () => {
        calls[2]?.resolve([{ id: 'fresh', title: 'Fresh data', status: 'done' }]);
      });

      await waitFor(() => { expect(result.current.tasks[0]?.id).toBe('fresh'); });
      expect(result.current.tasks[0].title).toBe('Fresh data');
    });

    it('requestId prevents stale data from slow request', async () => {
      const { mockFetch, resolvers } = createSimpleFetchMock();
      vi.stubGlobal('fetch', mockFetch);

      const { result } = renderHook(() => useProjectTasks('1'));
      await act(async () => { resolvers[0]([]); });

      act(() => { result.current.refreshTasks(); });
      act(() => { result.current.refreshTasks(); });

      // Resolve SECOND first
      await act(async () => { resolvers[2]([{ id: 'new', title: 'New', status: 'todo' }]); });
      await waitFor(() => { expect(result.current.tasks[0]?.title).toBe('New'); });

      // Resolve FIRST (stale) - should be ignored
      await act(async () => { resolvers[1]([{ id: 'old', title: 'Old', status: 'todo' }]); });
      expect(result.current.tasks[0].title).toBe('New');
    });
  });
});
