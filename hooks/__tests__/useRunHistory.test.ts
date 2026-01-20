/** useRunHistory Tests (PR-67) */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useRunHistory } from "../useRunHistory";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("useRunHistory", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("fetches runs on mount", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ runs: [{ runId: "run-1", status: "done" }] }),
    });

    const { result } = renderHook(() => useRunHistory("project-1"));

    await waitFor(() => {
      expect(result.current.runs).toHaveLength(1);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/projects/project-1/autopilot/runs")
    );
  });

  it("loads run details when selectRun called", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ runs: [{ runId: "run-1", status: "done" }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          run: { runId: "run-1", attempts: [], errors: [] },
        }),
      });

    const { result } = renderHook(() => useRunHistory("project-1"));

    await waitFor(() => {
      expect(result.current.runs).toHaveLength(1);
    });

    act(() => {
      result.current.selectRun("run-1");
    });

    await waitFor(() => {
      expect(result.current.selectedRun).not.toBeNull();
    });
  });

  it("calls stop endpoint when stopRun called", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          runs: [{ runId: "run-1", status: "running" }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

    const { result } = renderHook(() => useRunHistory("project-1"));

    await waitFor(() => {
      expect(result.current.runs).toHaveLength(1);
    });

    act(() => {
      result.current.stopRun("run-1");
    });

    expect(result.current.stoppingRunId).toBe("run-1");

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/autopilot/runs/run-1/stop"),
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  it("clears stoppingRunId after stop completes", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          runs: [{ runId: "run-1", status: "running" }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          runs: [{ runId: "run-1", status: "stopped" }],
        }),
      });

    const { result } = renderHook(() => useRunHistory("project-1"));

    await waitFor(() => {
      expect(result.current.runs).toHaveLength(1);
    });

    act(() => {
      result.current.stopRun("run-1");
    });

    await waitFor(() => {
      expect(result.current.stoppingRunId).toBeUndefined();
    });
  });
});
