/**
 * useAttemptsList Hook Tests (PR-63)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAttemptsList } from "../useAttemptsList";

const mockAttempts = [
  {
    id: "att-1",
    taskId: "task-1",
    status: "completed",
    startedAt: "2026-01-19T10:00:00Z",
    finishedAt: "2026-01-19T10:05:00Z",
    exitCode: 0,
  },
  {
    id: "att-2",
    taskId: "task-2",
    status: "running",
    startedAt: "2026-01-19T11:00:00Z",
    finishedAt: null,
    exitCode: null,
  },
];

describe("useAttemptsList", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches attempts on mount", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockAttempts),
    });

    const { result } = renderHook(() => useAttemptsList("project-1"));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.attempts).toHaveLength(2);
    expect(result.current.error).toBeNull();
    expect(global.fetch).toHaveBeenCalledWith("/api/projects/project-1/attempts?limit=20");
  });

  it("handles fetch error", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useAttemptsList("project-1"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.attempts).toEqual([]);
  });

  it("detects hasRunning correctly", async () => {
    const runningAttempts = [mockAttempts[1]]; // only running

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(runningAttempts),
    });

    const { result } = renderHook(() => useAttemptsList("project-1"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasRunning).toBe(true);
  });

  it("hasRunning is false when no running attempts", async () => {
    const completedAttempts = [mockAttempts[0]]; // only completed

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(completedAttempts),
    });

    const { result } = renderHook(() => useAttemptsList("project-1"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasRunning).toBe(false);
  });

  it("provides refetch function", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockAttempts),
    });

    const { result } = renderHook(() => useAttemptsList("project-1"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.refetch).toBe("function");
  });
});
