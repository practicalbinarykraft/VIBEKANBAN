/**
 * useAttemptLogs Hook Tests (PR-63)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useAttemptLogs } from "../useAttemptLogs";

const mockLogs = {
  lines: [
    { timestamp: "2026-01-19T10:00:00Z", level: "info", message: "Starting..." },
    { timestamp: "2026-01-19T10:00:01Z", level: "info", message: "Processing..." },
  ],
  nextCursor: 2,
};

describe("useAttemptLogs", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches logs on mount", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockLogs),
    });

    const { result } = renderHook(() =>
      useAttemptLogs("project-1", "att-123", false)
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.lines).toHaveLength(2);
    expect(result.current.lines[0].message).toBe("Starting...");
  });

  it("handles error response", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() =>
      useAttemptLogs("project-1", "att-123", false)
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.lines).toEqual([]);
  });

  it("does not fetch when attemptId is null", async () => {
    const { result } = renderHook(() =>
      useAttemptLogs("project-1", null, false)
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.lines).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("appends new logs on subsequent fetches", async () => {
    const moreLogs = {
      lines: [
        { timestamp: "2026-01-19T10:00:02Z", level: "info", message: "Done!" },
      ],
      nextCursor: undefined,
    };

    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockLogs),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(moreLogs),
      });

    const { result } = renderHook(() =>
      useAttemptLogs("project-1", "att-123", false)
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.lines).toHaveLength(2);

    // Trigger load more
    await act(async () => {
      result.current.loadMore();
    });

    await waitFor(() => {
      expect(result.current.lines).toHaveLength(3);
    });
  });

  it("reset clears all lines", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockLogs),
    });

    const { result } = renderHook(() =>
      useAttemptLogs("project-1", "att-123", false)
    );

    await waitFor(() => {
      expect(result.current.lines).toHaveLength(2);
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.lines).toEqual([]);
  });

  it("hasMore reflects nextCursor presence", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockLogs),
    });

    const { result } = renderHook(() =>
      useAttemptLogs("project-1", "att-123", false)
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasMore).toBe(true);
  });
});
