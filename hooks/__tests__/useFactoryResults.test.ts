/** useFactoryResults Tests (PR-89) - TDD */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useFactoryResults } from "../useFactoryResults";
import type { FactoryResultsResponse } from "@/server/services/factory/factory-results.service";

const mockResults: FactoryResultsResponse = {
  runId: "run-123",
  status: "completed",
  totals: { queued: 0, running: 0, completed: 2, failed: 0 },
  attempts: [
    { taskId: 1, attemptId: "a1", status: "completed", prUrl: "https://pr/1", updatedAt: "2026-01-20T12:00:00Z" },
    { taskId: 2, attemptId: "a2", status: "completed", prUrl: null, updatedAt: "2026-01-20T11:00:00Z" },
  ],
};

const mockIdleResults: FactoryResultsResponse = {
  runId: null,
  status: "idle",
  totals: { queued: 0, running: 0, completed: 0, failed: 0 },
  attempts: [],
};

describe("useFactoryResults", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("fetches results on mount", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResults,
    } as Response);

    const { result } = renderHook(() => useFactoryResults("p1"));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockResults);
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/projects/p1/factory/results",
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it("sets error when fetch fails", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
    } as Response);

    const { result } = renderHook(() => useFactoryResults("p1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Failed to fetch factory results");
    expect(result.current.data).toBeNull();
  });

  it("handles idle state (no run)", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockIdleResults,
    } as Response);

    const { result } = renderHook(() => useFactoryResults("p1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data?.status).toBe("idle");
    expect(result.current.data?.runId).toBeNull();
  });

  it("cleans up on unmount", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => mockResults,
    } as Response);

    const { unmount } = renderHook(() => useFactoryResults("p1"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    // Unmount should cleanup without errors
    unmount();
  });
});
