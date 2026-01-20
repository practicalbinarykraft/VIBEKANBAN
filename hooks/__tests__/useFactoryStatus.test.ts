/** useFactoryStatus Tests (PR-83) */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useFactoryStatus } from "../useFactoryStatus";

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("useFactoryStatus", () => {
  beforeEach(() => { mockFetch.mockReset(); vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("fetches status on mount", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ hasRun: false, status: "idle", total: 0, completed: 0, failed: 0, cancelled: 0, running: 0, queued: 0 }),
    });
    vi.useRealTimers();
    const { result } = renderHook(() => useFactoryStatus("p1"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/api/projects/p1/factory/status"));
    expect(result.current.status).toBe("idle");
  });

  it("start calls endpoint and updates state", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ hasRun: false, status: "idle", total: 0, completed: 0, failed: 0, cancelled: 0, running: 0, queued: 0 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ autopilotRunId: "run-1", started: true }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ hasRun: true, status: "running", runId: "run-1", total: 3, completed: 0, failed: 0, cancelled: 0, running: 1, queued: 2 }) });
    vi.useRealTimers();
    const { result } = renderHook(() => useFactoryStatus("p1"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => { await result.current.start(3); });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/projects/p1/factory/start"),
      expect.objectContaining({ method: "POST", body: JSON.stringify({ maxParallel: 3 }) })
    );
  });

  it("stop calls endpoint and updates state", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ hasRun: true, status: "running", runId: "run-1", total: 3, completed: 1, failed: 0, cancelled: 0, running: 2, queued: 0 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ stopped: true, cancelledAttempts: 2, failedToCancel: 0 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ hasRun: true, status: "cancelled", runId: "run-1", total: 3, completed: 1, failed: 0, cancelled: 2, running: 0, queued: 0 }) });
    vi.useRealTimers();
    const { result } = renderHook(() => useFactoryStatus("p1"));
    await waitFor(() => expect(result.current.status).toBe("running"));
    await act(async () => { await result.current.stop(); });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/projects/p1/factory/stop"),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("returns counts from status", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ hasRun: true, status: "running", runId: "r1", total: 10, completed: 4, failed: 1, cancelled: 0, running: 3, queued: 2 }),
    });
    vi.useRealTimers();
    const { result } = renderHook(() => useFactoryStatus("p1"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.total).toBe(10);
    expect(result.current.completed).toBe(4);
    expect(result.current.failed).toBe(1);
    expect(result.current.running).toBe(3);
    expect(result.current.queued).toBe(2);
  });

  it("handles fetch error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));
    vi.useRealTimers();
    const { result } = renderHook(() => useFactoryStatus("p1"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeTruthy();
  });
});
