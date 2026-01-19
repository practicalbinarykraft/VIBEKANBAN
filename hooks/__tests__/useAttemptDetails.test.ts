/**
 * useAttemptDetails Hook Tests (PR-63)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAttemptDetails } from "../useAttemptDetails";

const mockAttempt = {
  attemptId: "att-123",
  status: "running",
  startedAt: "2026-01-19T10:00:00Z",
  finishedAt: null,
  exitCode: null,
  error: null,
};

describe("useAttemptDetails", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches attempt details on mount", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockAttempt),
    });

    const { result } = renderHook(() =>
      useAttemptDetails("project-1", "att-123")
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.attempt).toBeDefined();
    expect(result.current.attempt?.attemptId).toBe("att-123");
    expect(result.current.attempt?.status).toBe("running");
  });

  it("handles error response", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const { result } = renderHook(() =>
      useAttemptDetails("project-1", "att-not-found")
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.attempt).toBeNull();
  });

  it("does not fetch when attemptId is null", async () => {
    const { result } = renderHook(() =>
      useAttemptDetails("project-1", null)
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.attempt).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("detects isRunning correctly", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockAttempt),
    });

    const { result } = renderHook(() =>
      useAttemptDetails("project-1", "att-123")
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isRunning).toBe(true);
  });

  it("isRunning false for completed attempt", async () => {
    const completedAttempt = { ...mockAttempt, status: "completed" };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(completedAttempt),
    });

    const { result } = renderHook(() =>
      useAttemptDetails("project-1", "att-123")
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isRunning).toBe(false);
  });
});
