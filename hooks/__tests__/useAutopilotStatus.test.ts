/** useAutopilotStatus Hook Tests (PR-68) - TDD */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useAutopilotStatus } from "../useAutopilotStatus";

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("useAutopilotStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches status on mount", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ enabled: true, status: "idle", sessionId: null }),
    });

    const { result } = renderHook(() => useAutopilotStatus("project-1"));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockFetch).toHaveBeenCalledWith("/api/projects/project-1/planning/autopilot/status");
    expect(result.current.status).toBe("idle");
  });

  it("returns sessionId when available", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        enabled: true,
        status: "running",
        sessionId: "session-123",
        currentTaskId: "task-1",
      }),
    });

    const { result } = renderHook(() => useAutopilotStatus("project-1"));

    await waitFor(() => expect(result.current.status).toBe("running"));
    expect(result.current.sessionId).toBe("session-123");
    expect(result.current.currentTaskId).toBe("task-1");
  });

  it("start calls start API with sessionId", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ enabled: true, status: "idle", sessionId: "s-1" }),
      })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true }) })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ enabled: true, status: "running", sessionId: "s-1" }),
      });

    const { result } = renderHook(() => useAutopilotStatus("project-1"));
    await waitFor(() => expect(result.current.sessionId).toBe("s-1"));

    await act(async () => { await result.current.start(); });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/projects/project-1/planning/autopilot/start",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("stop calls cancel API with sessionId", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ enabled: true, status: "running", sessionId: "s-1" }),
      })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true }) })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ enabled: true, status: "stopped", sessionId: "s-1" }),
      });

    const { result } = renderHook(() => useAutopilotStatus("project-1"));
    await waitFor(() => expect(result.current.status).toBe("running"));

    await act(async () => { await result.current.stop(); });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/projects/project-1/planning/autopilot/cancel",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("calls refresh after start", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ enabled: true, status: "idle", sessionId: "s-1" }),
      })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true }) })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ enabled: true, status: "running", sessionId: "s-1" }),
      });

    const { result } = renderHook(() => useAutopilotStatus("project-1"));
    // Wait for sessionId to be set (start() requires sessionId)
    await waitFor(() => expect(result.current.sessionId).toBe("s-1"));

    await act(async () => { await result.current.start(); });

    // Verify refresh was called (3 fetches total: initial, start, refresh)
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("returns isLoading true initially", () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => new Promise(() => {}), // Never resolves
    });

    const { result } = renderHook(() => useAutopilotStatus("project-1"));
    expect(result.current.isLoading).toBe(true);
  });

  it("returns enabled from status", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ enabled: true, status: "idle", sessionId: null }),
    });

    const { result } = renderHook(() => useAutopilotStatus("project-1"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.enabled).toBe(true);
  });
});
