/** FactoryRunMetricsPanel Tests (PR-94) */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FactoryRunMetricsPanel } from "../factory-run-metrics-panel";
import type { FactoryRunMetrics } from "@/hooks/useFactoryRunMetrics";

const mockMetrics: FactoryRunMetrics = {
  runId: "run-123",
  counts: { total: 10, completed: 5, failed: 2, running: 1, queued: 2 },
  durationsSec: { avg: 125, p50: 100, p90: 180 },
  throughput: {
    completedPerMinute: 2.5,
    windowStart: "2026-01-21T10:00:00.000Z",
    windowEnd: "2026-01-21T10:05:00.000Z",
  },
  timeline: [
    { t: "2026-01-21T10:00:00.000Z", started: 3, completed: 0, failed: 0 },
    { t: "2026-01-21T10:01:00.000Z", started: 2, completed: 2, failed: 1 },
    { t: "2026-01-21T10:02:00.000Z", started: 0, completed: 3, failed: 1 },
  ],
};

describe("FactoryRunMetricsPanel", () => {
  it("renders panel with data-testid", () => {
    render(<FactoryRunMetricsPanel metrics={mockMetrics} />);
    expect(screen.getByTestId("factory-run-metrics-panel")).toBeInTheDocument();
  });

  it("shows loading state when loading=true", () => {
    render(<FactoryRunMetricsPanel metrics={null} loading />);
    expect(screen.getByTestId("factory-run-metrics-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("throughput-stat")).not.toBeInTheDocument();
  });

  it("shows empty state when metrics=null and not loading", () => {
    render(<FactoryRunMetricsPanel metrics={null} />);
    expect(screen.getByText(/No metrics available/i)).toBeInTheDocument();
  });

  it("displays throughput value", () => {
    render(<FactoryRunMetricsPanel metrics={mockMetrics} />);
    expect(screen.getByTestId("throughput-stat")).toHaveTextContent("2.5");
    expect(screen.getByTestId("throughput-stat")).toHaveTextContent("tasks/min");
  });

  it("displays average duration formatted as mm:ss", () => {
    render(<FactoryRunMetricsPanel metrics={mockMetrics} />);
    expect(screen.getByTestId("avg-duration-stat")).toHaveTextContent("2m 5s");
  });

  it("displays p90 duration formatted as mm:ss", () => {
    render(<FactoryRunMetricsPanel metrics={mockMetrics} />);
    expect(screen.getByTestId("p90-duration-stat")).toHaveTextContent("3m 0s");
  });

  it("displays progress summary with counts", () => {
    render(<FactoryRunMetricsPanel metrics={mockMetrics} />);
    const summary = screen.getByTestId("progress-summary");
    expect(summary).toHaveTextContent("7 / 10");
    expect(summary).toHaveTextContent("1 running");
    expect(summary).toHaveTextContent("2 queued");
  });

  it("renders timeline section when timeline has buckets", () => {
    render(<FactoryRunMetricsPanel metrics={mockMetrics} />);
    expect(screen.getByTestId("timeline-section")).toBeInTheDocument();
    expect(screen.getByText("Timeline")).toBeInTheDocument();
  });

  it("renders timeline rows for each bucket", () => {
    render(<FactoryRunMetricsPanel metrics={mockMetrics} />);
    expect(screen.getByTestId("timeline-row-2026-01-21T10:00:00.000Z")).toBeInTheDocument();
    expect(screen.getByTestId("timeline-row-2026-01-21T10:01:00.000Z")).toBeInTheDocument();
    expect(screen.getByTestId("timeline-row-2026-01-21T10:02:00.000Z")).toBeInTheDocument();
  });

  it("does not render timeline section when timeline is empty", () => {
    const metricsNoTimeline: FactoryRunMetrics = {
      ...mockMetrics,
      timeline: [],
    };
    render(<FactoryRunMetricsPanel metrics={metricsNoTimeline} />);
    expect(screen.queryByTestId("timeline-section")).not.toBeInTheDocument();
  });

  it("handles null durations gracefully", () => {
    const metricsNullDurations: FactoryRunMetrics = {
      ...mockMetrics,
      durationsSec: { avg: null, p50: null, p90: null },
    };
    render(<FactoryRunMetricsPanel metrics={metricsNullDurations} />);
    expect(screen.getByTestId("avg-duration-stat")).toHaveTextContent("—");
    expect(screen.getByTestId("p90-duration-stat")).toHaveTextContent("—");
  });
});
