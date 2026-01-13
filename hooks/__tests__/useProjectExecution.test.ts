/**
 * Unit tests for useProjectExecution hook
 *
 * Covers:
 * - A) runAll calls API then triggers onTasksChanged
 * - B) pause/resume call API then trigger onTasksChanged
 * - C) Errors don't break state, set error correctly
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useProjectExecution } from '../useProjectExecution';

function mockFetchSequence(responses: Array<{ ok: boolean; data?: any; error?: string }>) {
  let callIndex = 0;
  return vi.fn(() => {
    const response = responses[callIndex] || responses[responses.length - 1];
    callIndex++;
    if (response.ok) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(response.data || {}),
      });
    }
    return Promise.resolve({
      ok: false,
      json: () => Promise.resolve({ error: response.error || 'Error' }),
    });
  });
}

describe('useProjectExecution', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('A) runAll triggers onTasksChanged', () => {
    it('calls API and onTasksChanged after success', async () => {
      const onTasksChanged = vi.fn();
      const mockFetch = mockFetchSequence([
        { ok: true, data: { executionStatus: 'idle' } },
        { ok: true },
        { ok: true, data: { executionStatus: 'running' } },
      ]);
      vi.stubGlobal('fetch', mockFetch);

      const { result } = renderHook(() =>
        useProjectExecution('1', { onTasksChanged })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.handleRunAll();
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/projects/1/run-all', { method: 'POST' });
      expect(onTasksChanged).toHaveBeenCalled();
    });

    it('does not call onTasksChanged on API error', async () => {
      const onTasksChanged = vi.fn();
      const mockFetch = mockFetchSequence([
        { ok: true, data: { executionStatus: 'idle' } },
        { ok: false, error: 'Server error' },
      ]);
      vi.stubGlobal('fetch', mockFetch);

      const { result } = renderHook(() =>
        useProjectExecution('1', { onTasksChanged })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        try { await result.current.handleRunAll(); } catch {}
      });

      expect(onTasksChanged).not.toHaveBeenCalled();
      expect(result.current.error).toBe('Server error');
    });
  });

  describe('B) pause/resume trigger onTasksChanged', () => {
    it('pause calls API and onTasksChanged', async () => {
      const onTasksChanged = vi.fn();
      const mockFetch = mockFetchSequence([
        { ok: true, data: { executionStatus: 'idle' } },
        { ok: true },
        { ok: true, data: { executionStatus: 'paused' } },
      ]);
      vi.stubGlobal('fetch', mockFetch);

      const { result } = renderHook(() =>
        useProjectExecution('1', { onTasksChanged })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.handlePause();
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/projects/1/pause', { method: 'POST' });
      expect(onTasksChanged).toHaveBeenCalled();
    });

    it('resume calls API and onTasksChanged', async () => {
      const onTasksChanged = vi.fn();
      const mockFetch = mockFetchSequence([
        { ok: true, data: { executionStatus: 'paused' } },
        { ok: true },
        { ok: true, data: { executionStatus: 'running' } },
      ]);
      vi.stubGlobal('fetch', mockFetch);

      const { result } = renderHook(() =>
        useProjectExecution('1', { onTasksChanged })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.handleResume();
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/projects/1/resume', { method: 'POST' });
      expect(onTasksChanged).toHaveBeenCalled();
    });
  });

  describe('C) Error handling', () => {
    it('sets error on runAll failure without breaking state', async () => {
      const mockFetch = mockFetchSequence([
        { ok: true, data: { executionStatus: 'idle' } },
        { ok: false, error: 'Network failure' },
      ]);
      vi.stubGlobal('fetch', mockFetch);

      const { result } = renderHook(() => useProjectExecution('1'));

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.executionStatus).toBe('idle');

      await act(async () => {
        try { await result.current.handleRunAll(); } catch {}
      });

      expect(result.current.error).toBe('Network failure');
      expect(result.current.executionStatus).toBe('idle');
    });

    it('clears previous error on new successful action', async () => {
      const mockFetch = mockFetchSequence([
        { ok: true, data: { executionStatus: 'idle' } },
        { ok: false, error: 'First error' },
        { ok: true },
        { ok: true, data: { executionStatus: 'idle' } },
      ]);
      vi.stubGlobal('fetch', mockFetch);

      const { result } = renderHook(() => useProjectExecution('1'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        try { await result.current.handleRunAll(); } catch {}
      });
      expect(result.current.error).toBe('First error');

      await act(async () => {
        await result.current.handleRunAll();
      });
      expect(result.current.error).toBeNull();
    });
  });
});
