/** useFactoryEnqueue Hook Tests (PR-106) - TDD */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useFactoryEnqueue } from "../useFactoryEnqueue";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("useFactoryEnqueue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initial state", () => {
    it("returns enqueueTask function", () => {
      const { result } = renderHook(() =>
        useFactoryEnqueue({ projectId: "proj-1" })
      );

      expect(typeof result.current.enqueueTask).toBe("function");
    });

    it("returns lastResult as null initially", () => {
      const { result } = renderHook(() =>
        useFactoryEnqueue({ projectId: "proj-1" })
      );

      expect(result.current.lastResult).toBeNull();
    });
  });

  describe("enqueueTask", () => {
    it("calls enqueue API with correct payload", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ runId: "run-123", enqueued: true }),
      });

      const { result } = renderHook(() =>
        useFactoryEnqueue({ projectId: "proj-1" })
      );

      await act(async () => {
        result.current.enqueueTask("task-1");
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/projects/proj-1/factory/enqueue",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId: "task-1" }),
        })
      );
    });

    it("updates lastResult on success", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ runId: "run-123", enqueued: true }),
      });

      const { result } = renderHook(() =>
        useFactoryEnqueue({ projectId: "proj-1" })
      );

      await act(async () => {
        result.current.enqueueTask("task-1");
      });

      await waitFor(() => {
        expect(result.current.lastResult).toEqual({
          ok: true,
          runId: "run-123",
          enqueued: true,
        });
      });
    });

    it("handles deduplicated response (enqueued: false)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ runId: "run-123", enqueued: false }),
      });

      const { result } = renderHook(() =>
        useFactoryEnqueue({ projectId: "proj-1" })
      );

      await act(async () => {
        result.current.enqueueTask("task-already-queued");
      });

      await waitFor(() => {
        expect(result.current.lastResult).toEqual({
          ok: true,
          runId: "run-123",
          enqueued: false,
        });
      });
    });

    it("handles API error response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "TASK_NOT_RUNNABLE" }),
      });

      const { result } = renderHook(() =>
        useFactoryEnqueue({ projectId: "proj-1" })
      );

      await act(async () => {
        result.current.enqueueTask("task-done");
      });

      await waitFor(() => {
        expect(result.current.lastResult).toEqual({
          ok: false,
          error: "TASK_NOT_RUNNABLE",
        });
      });
    });

    it("handles network error gracefully", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() =>
        useFactoryEnqueue({ projectId: "proj-1" })
      );

      await act(async () => {
        result.current.enqueueTask("task-1");
      });

      await waitFor(() => {
        expect(result.current.lastResult).toEqual({
          ok: false,
          error: "Network error",
        });
      });
    });

    it("uses fire-and-forget pattern (does not block)", async () => {
      let resolvePromise: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockFetch.mockReturnValueOnce(pendingPromise);

      const { result } = renderHook(() =>
        useFactoryEnqueue({ projectId: "proj-1" })
      );

      // enqueueTask should not throw even when fetch is pending
      act(() => {
        result.current.enqueueTask("task-1");
      });

      // lastResult should still be null while pending
      expect(result.current.lastResult).toBeNull();

      await act(async () => {
        resolvePromise!({
          ok: true,
          json: () => Promise.resolve({ runId: "run-123", enqueued: true }),
        });
      });

      await waitFor(() => {
        expect(result.current.lastResult?.ok).toBe(true);
      });
    });

    it("calls onEnqueue callback when provided", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ runId: "run-123", enqueued: true }),
      });

      const onEnqueue = vi.fn();
      const { result } = renderHook(() =>
        useFactoryEnqueue({ projectId: "proj-1", onEnqueue })
      );

      await act(async () => {
        result.current.enqueueTask("task-1");
      });

      await waitFor(() => {
        expect(onEnqueue).toHaveBeenCalledWith({
          ok: true,
          runId: "run-123",
          enqueued: true,
        });
      });
    });
  });
});
