/** FactoryRunMetricsPanelV2 Tests (PR-95) - TDD first */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { FactoryRunMetricsPanelV2 } from "../factory-run-metrics-panel-v2";
import type { FactoryRunMetricsV2 } from "@/server/services/factory/factory-run-metrics-v2.service";

const mockMetrics: FactoryRunMetricsV2 = {
  runId: "run-1",
  windowMinutes: 5,
  startedAtISO: "2026-01-21T10:00:00.000Z",
  finishedAtISO: null,
  totals: { started: 5, completed: 3, failed: 1, cancelled: 1 },
  timing: { avgDurationSec: 90, p95DurationSec: 150, throughputPerMin: 2.5, peakRunning: 3 },
  timeline: [
    { t: "2026-01-21T10:00:00.000Z", started: 3, completed: 1, failed: 0 },
    { t: "2026-01-21T10:05:00.000Z", started: 2, completed: 2, failed: 1 },
  ],
};

const mockMetricsNullTiming: FactoryRunMetricsV2 = {
  ...mockMetrics,
  timing: { avgDurationSec: null, p95DurationSec: null, throughputPerMin: null, peakRunning: 0 },
};

// Mock the hook
vi.mock("@/hooks/useFactoryRunMetricsV2", () => ({
  useFactoryRunMetricsV2: vi.fn(),
}));

import { useFactoryRunMetricsV2 } from "@/hooks/useFactoryRunMetricsV2";

describe("FactoryRunMetricsPanelV2", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 1: loading state
  it("renders loading state", () => {
    vi.mocked(useFactoryRunMetricsV2).mockReturnValue({
      data: null,
      loading: true,
      error: null,
    });

    render(<FactoryRunMetricsPanelV2 runId="run-1" />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  // Test 2: error state
  it("renders error state", () => {
    vi.mocked(useFactoryRunMetricsV2).mockReturnValue({
      data: null,
      loading: false,
      error: "Failed to fetch metrics",
    });

    render(<FactoryRunMetricsPanelV2 runId="run-1" />);
    expect(screen.getByText(/Failed to load metrics/i)).toBeInTheDocument();
  });

  // Test 3: empty state (no attempts)
  it("renders empty state when no data", () => {
    vi.mocked(useFactoryRunMetricsV2).mockReturnValue({
      data: { ...mockMetrics, totals: { started: 0, completed: 0, failed: 0, cancelled: 0 }, timeline: [] },
      loading: false,
      error: null,
    });

    render(<FactoryRunMetricsPanelV2 runId="run-1" />);
    expect(screen.getByText(/No attempts yet/i)).toBeInTheDocument();
  });

  // Test 4: renders numbers with "—" when null
  it("renders dash when timing values are null", () => {
    vi.mocked(useFactoryRunMetricsV2).mockReturnValue({
      data: mockMetricsNullTiming,
      loading: false,
      error: null,
    });

    render(<FactoryRunMetricsPanelV2 runId="run-1" />);
    // Should show "—" for null values
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });

  // Test 5: renders throughput value
  it("renders throughput value correctly", () => {
    vi.mocked(useFactoryRunMetricsV2).mockReturnValue({
      data: mockMetrics,
      loading: false,
      error: null,
    });

    render(<FactoryRunMetricsPanelV2 runId="run-1" />);
    expect(screen.getByTestId("throughput-value")).toHaveTextContent("2.5");
  });

  // Test 6: renders avg duration
  it("renders avg duration correctly", () => {
    vi.mocked(useFactoryRunMetricsV2).mockReturnValue({
      data: mockMetrics,
      loading: false,
      error: null,
    });

    render(<FactoryRunMetricsPanelV2 runId="run-1" />);
    // 90 seconds = 1m 30s
    expect(screen.getByTestId("avg-duration-value")).toHaveTextContent("1m 30s");
  });

  // Test 7: renders peak running
  it("renders peak running correctly", () => {
    vi.mocked(useFactoryRunMetricsV2).mockReturnValue({
      data: mockMetrics,
      loading: false,
      error: null,
    });

    render(<FactoryRunMetricsPanelV2 runId="run-1" />);
    expect(screen.getByTestId("peak-running-value")).toHaveTextContent("3");
  });

  // Test 8: renders timeline rows
  it("renders timeline rows", () => {
    vi.mocked(useFactoryRunMetricsV2).mockReturnValue({
      data: mockMetrics,
      loading: false,
      error: null,
    });

    render(<FactoryRunMetricsPanelV2 runId="run-1" />);
    // Should have 2 timeline rows (last 12 buckets, we have 2)
    const timelineRows = screen.getAllByTestId(/^timeline-row-/);
    expect(timelineRows).toHaveLength(2);
  });
});
