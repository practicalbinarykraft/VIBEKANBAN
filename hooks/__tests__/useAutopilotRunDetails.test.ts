/**
 * useAutopilotRunDetails Tests (PR-75)
 * Tests hook fetching behavior
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAutopilotRunDetails } from "../useAutopilotRunDetails";
import type { RunDetails } from "@/types/autopilot-run";

const mockRunDetails: RunDetails = {
  runId: "run-123",
  projectId: "project-123",
  status: "done",
  startedAt: "2026-01-20T10:00:00Z",
  finishedAt: "2026-01-20T10:05:00Z",
  totalTasks: 2,
  doneTasks: 2,
  failedTasks: 0,
  attempts: [],
  errors: [],
};

const mockRunningDetails: RunDetails = {
  ...mockRunDetails,
  status: "running",
  finishedAt: null,
};

describe("useAutopilotRunDetails", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns null run when runId is null", async () => {
    const { result } = renderHook(() => useAutopilotRunDetails(null));

    expect(result.current.run).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("fetches run details on mount", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ run: mockRunDetails }),
    } as Response);

    const { result } = renderHook(() => useAutopilotRunDetails("run-123"));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.run).toEqual(mockRunDetails);
    expect(global.fetch).toHaveBeenCalledWith("/api/autopilot/runs/run-123");
  });

  it("sets error when fetch fails", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
    } as Response);

    const { result } = renderHook(() => useAutopilotRunDetails("run-123"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("Failed to fetch run details");
    expect(result.current.run).toBeNull();
  });

  it("sets isRunning true when status is running", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ run: mockRunningDetails }),
    } as Response);

    const { result } = renderHook(() => useAutopilotRunDetails("run-123"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isRunning).toBe(true);
  });

  it("sets isRunning false when status is done", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ run: mockRunDetails }),
    } as Response);

    const { result } = renderHook(() => useAutopilotRunDetails("run-123"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isRunning).toBe(false);
  });
});
