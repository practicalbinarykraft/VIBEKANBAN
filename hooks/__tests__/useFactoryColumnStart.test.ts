/** useFactoryColumnStart Hook Tests (PR-105) - TDD */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useFactoryColumnStart } from "../useFactoryColumnStart";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("useFactoryColumnStart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initial state", () => {
    it("returns isLoading false initially", () => {
      const { result } = renderHook(() =>
        useFactoryColumnStart({ projectId: "proj-1" })
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.runId).toBeNull();
    });
  });

  describe("startColumnRun", () => {
    it("calls start-batch API with correct payload", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ runId: "run-123", taskCount: 5, started: true }),
      });

      const { result } = renderHook(() =>
        useFactoryColumnStart({ projectId: "proj-1" })
      );

      await act(async () => {
        await result.current.startColumnRun("todo");
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/projects/proj-1/factory/start-batch",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            source: "column",
            columnStatus: "todo",
            maxParallel: 3,
          }),
        })
      );
    });

    it("passes agentProfileId when provided", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ runId: "run-123", taskCount: 5, started: true }),
      });

      const { result } = renderHook(() =>
        useFactoryColumnStart({ projectId: "proj-1", agentProfileId: "claude-default" })
      );

      await act(async () => {
        await result.current.startColumnRun("todo");
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/projects/proj-1/factory/start-batch",
        expect.objectContaining({
          body: JSON.stringify({
            source: "column",
            columnStatus: "todo",
            maxParallel: 3,
            agentProfileId: "claude-default",
          }),
        })
      );
    });

    it("sets isLoading true during request", async () => {
      let resolvePromise: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockFetch.mockReturnValueOnce(pendingPromise);

      const { result } = renderHook(() =>
        useFactoryColumnStart({ projectId: "proj-1" })
      );

      act(() => {
        result.current.startColumnRun("todo");
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise!({
          ok: true,
          json: () => Promise.resolve({ runId: "run-123", taskCount: 5, started: true }),
        });
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("sets runId on success", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ runId: "run-456", taskCount: 3, started: true }),
      });

      const { result } = renderHook(() =>
        useFactoryColumnStart({ projectId: "proj-1" })
      );

      await act(async () => {
        await result.current.startColumnRun("in_progress");
      });

      expect(result.current.runId).toBe("run-456");
      expect(result.current.error).toBeNull();
    });

    it("sets error on API failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "NO_TASKS" }),
      });

      const { result } = renderHook(() =>
        useFactoryColumnStart({ projectId: "proj-1" })
      );

      await act(async () => {
        await result.current.startColumnRun("todo");
      });

      expect(result.current.error).toBe("NO_TASKS");
      expect(result.current.runId).toBeNull();
    });

    it("sets error on network failure", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() =>
        useFactoryColumnStart({ projectId: "proj-1" })
      );

      await act(async () => {
        await result.current.startColumnRun("todo");
      });

      expect(result.current.error).toBe("Network error");
      expect(result.current.runId).toBeNull();
    });

    it("returns success result from startColumnRun", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ runId: "run-789", taskCount: 2, started: true }),
      });

      const { result } = renderHook(() =>
        useFactoryColumnStart({ projectId: "proj-1" })
      );

      let startResult: { ok: boolean; runId?: string };
      await act(async () => {
        startResult = await result.current.startColumnRun("todo");
      });

      expect(startResult!.ok).toBe(true);
      expect(startResult!.runId).toBe("run-789");
    });
  });

  describe("reset", () => {
    it("clears error and runId", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ runId: "run-123", taskCount: 1, started: true }),
      });

      const { result } = renderHook(() =>
        useFactoryColumnStart({ projectId: "proj-1" })
      );

      await act(async () => {
        await result.current.startColumnRun("todo");
      });

      expect(result.current.runId).toBe("run-123");

      act(() => {
        result.current.reset();
      });

      expect(result.current.runId).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });
});
