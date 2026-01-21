/** useAttemptSummary Tests (PR-90) - TDD */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAttemptSummary } from "../useAttemptSummary";
import type { AttemptSummaryResponse } from "@/server/services/attempts/attempt-summary.service";

const mockCompletedData: AttemptSummaryResponse = {
  attemptId: "a1",
  status: "completed",
  lastLogLine: "Done",
  errorMessage: null,
  updatedAt: "2026-01-20T12:05:00Z",
};

const mockFailedData: AttemptSummaryResponse = {
  attemptId: "a1",
  status: "failed",
  lastLogLine: "Error occurred",
  errorMessage: "Connection refused",
  updatedAt: "2026-01-20T12:05:00Z",
};

describe("useAttemptSummary", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("fetches summary on mount", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCompletedData,
    } as Response);

    const { result } = renderHook(() => useAttemptSummary("a1"));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockCompletedData);
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/attempts/a1/summary",
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it("sets error when fetch fails", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
    } as Response);

    const { result } = renderHook(() => useAttemptSummary("a1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Failed to fetch attempt summary");
    expect(result.current.data).toBeNull();
  });

  it("does not fetch when attemptId is null", () => {
    const { result } = renderHook(() => useAttemptSummary(null));

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns error message when present", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockFailedData,
    } as Response);

    const { result } = renderHook(() => useAttemptSummary("a1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data?.errorMessage).toBe("Connection refused");
    expect(result.current.data?.lastLogLine).toBe("Error occurred");
  });

  it("cleans up on unmount", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => mockCompletedData,
    } as Response);

    const { unmount } = renderHook(() => useAttemptSummary("a1"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    unmount();
  });
});
