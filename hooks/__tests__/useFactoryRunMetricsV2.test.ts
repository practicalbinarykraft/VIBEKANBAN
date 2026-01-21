/** useFactoryRunMetricsV2 Hook Tests (PR-95) - TDD first */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useFactoryRunMetricsV2 } from "../useFactoryRunMetricsV2";
import type { FactoryRunMetricsV2 } from "@/server/services/factory/factory-run-metrics-v2.service";

const mockMetrics: FactoryRunMetricsV2 = {
  runId: "run-1",
  windowMinutes: 5,
  startedAtISO: "2026-01-21T10:00:00.000Z",
  finishedAtISO: null,
  totals: { started: 3, completed: 2, failed: 1, cancelled: 0 },
  timing: { avgDurationSec: 60, p95DurationSec: 90, throughputPerMin: 1.5, peakRunning: 2 },
  timeline: [{ t: "2026-01-21T10:00:00.000Z", started: 3, completed: 2, failed: 1 }],
};

const mockFinishedMetrics: FactoryRunMetricsV2 = {
  ...mockMetrics,
  finishedAtISO: "2026-01-21T11:00:00.000Z",
};

describe("useFactoryRunMetricsV2", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  // Test 1: fetch success sets data
  it("fetches data successfully and sets state", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockMetrics),
    } as Response);

    const { result } = renderHook(() => useFactoryRunMetricsV2("run-1"));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockMetrics);
    expect(result.current.error).toBeNull();
  });

  // Test 2: error handling
  it("sets error when fetch fails", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response);

    const { result } = renderHook(() => useFactoryRunMetricsV2("run-1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Failed to fetch metrics");
    expect(result.current.data).toBeNull();
  });

  // Test 3: calls correct API endpoint
  it("calls correct API endpoint with runId", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockMetrics),
    } as Response);

    renderHook(() => useFactoryRunMetricsV2("test-run-123"));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/factory/runs/test-run-123/metrics",
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });
  });

  // Test 4: returns correct structure with finishedAtISO
  it("returns finishedAtISO when run is complete", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockFinishedMetrics),
    } as Response);

    const { result } = renderHook(() => useFactoryRunMetricsV2("run-1"));

    await waitFor(() => {
      expect(result.current.data?.finishedAtISO).toBe("2026-01-21T11:00:00.000Z");
    });
  });

  // Test 5: initial loading state
  it("starts with loading state", () => {
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {})); // Never resolves

    const { result } = renderHook(() => useFactoryRunMetricsV2("run-1"));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });
});
