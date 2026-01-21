/** useFactoryRunResults Tests (PR-88) - TDD */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useFactoryRunResults } from "../useFactoryRunResults";
import type { FactoryRunResultsDTO } from "@/server/services/factory/factory-run-results.service";

const mockResults: FactoryRunResultsDTO = {
  runId: "run-123",
  status: "completed",
  counts: { total: 2, ok: 2, failed: 0, running: 0, queued: 0 },
  items: [
    { taskId: "t1", taskTitle: "Task 1", attemptId: "a1", attemptStatus: "completed", prUrl: "https://pr/1" },
    { taskId: "t2", taskTitle: "Task 2", attemptId: "a2", attemptStatus: "completed", prUrl: "https://pr/2" },
  ],
};

const mockRunningResults: FactoryRunResultsDTO = {
  ...mockResults,
  status: "running",
  counts: { total: 2, ok: 1, failed: 0, running: 1, queued: 0 },
};

describe("useFactoryRunResults", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when runId is null", () => {
    const { result } = renderHook(() => useFactoryRunResults("p1", null));
    expect(result.current.results).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("fetches results on mount", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResults,
    } as Response);

    const { result } = renderHook(() => useFactoryRunResults("p1", "run-123"));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.results).toEqual(mockResults);
    expect(global.fetch).toHaveBeenCalledWith("/api/projects/p1/factory/runs/run-123/results");
  });

  it("sets error when fetch fails", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
    } as Response);

    const { result } = renderHook(() => useFactoryRunResults("p1", "run-123"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("Failed to fetch results");
    expect(result.current.results).toBeNull();
  });

  it("sets isRunning true when status is running", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockRunningResults,
    } as Response);

    const { result } = renderHook(() => useFactoryRunResults("p1", "run-123"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isRunning).toBe(true);
  });

  it("sets isRunning false when status is completed", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResults,
    } as Response);

    const { result } = renderHook(() => useFactoryRunResults("p1", "run-123"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isRunning).toBe(false);
  });
});
