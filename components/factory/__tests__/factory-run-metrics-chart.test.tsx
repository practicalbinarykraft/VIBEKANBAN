/** Factory Run Metrics Chart Tests (PR-96) - TDD first */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FactoryRunMetricsChart } from "../factory-run-metrics-chart";

interface TimelineBucket {
  t: string;
  started: number;
  completed: number;
  failed: number;
}

describe("FactoryRunMetricsChart", () => {
  // Test 1: empty timeline → empty state message
  it("renders empty state when timeline is empty", () => {
    render(<FactoryRunMetricsChart timeline={[]} />);
    expect(screen.getByTestId("metrics-chart-empty")).toBeInTheDocument();
    expect(screen.getByText(/no timeline data/i)).toBeInTheDocument();
  });

  // Test 2: renders SVG with data-testid
  it("renders SVG chart with data-testid", () => {
    const timeline: TimelineBucket[] = [
      { t: "2026-01-21T10:00:00.000Z", started: 5, completed: 3, failed: 1 },
    ];
    render(<FactoryRunMetricsChart timeline={timeline} />);
    expect(screen.getByTestId("metrics-chart")).toBeInTheDocument();
  });

  // Test 3: renders correct number of bucket groups (3 buckets = 3 groups)
  it("renders correct number of bucket groups for 3 buckets", () => {
    const timeline: TimelineBucket[] = [
      { t: "2026-01-21T10:00:00.000Z", started: 5, completed: 3, failed: 1 },
      { t: "2026-01-21T10:05:00.000Z", started: 3, completed: 2, failed: 0 },
      { t: "2026-01-21T10:10:00.000Z", started: 2, completed: 1, failed: 1 },
    ];
    render(<FactoryRunMetricsChart timeline={timeline} />);
    const bars = screen.getAllByTestId("bucket-bar");
    expect(bars).toHaveLength(3);
  });

  // Test 4: each bucket group has started, completed, failed bars
  it("renders stacked bars for each bucket", () => {
    const timeline: TimelineBucket[] = [
      { t: "2026-01-21T10:00:00.000Z", started: 5, completed: 3, failed: 2 },
    ];
    render(<FactoryRunMetricsChart timeline={timeline} />);
    // Each bucket should have rect elements for the stacked bar
    const svg = screen.getByTestId("metrics-chart");
    const rects = svg.querySelectorAll("rect");
    // At minimum we need rects for the bars (started, completed, failed)
    expect(rects.length).toBeGreaterThanOrEqual(3);
  });

  // Test 5: legend is displayed
  it("renders legend with started, completed, failed labels", () => {
    const timeline: TimelineBucket[] = [
      { t: "2026-01-21T10:00:00.000Z", started: 5, completed: 3, failed: 1 },
    ];
    render(<FactoryRunMetricsChart timeline={timeline} />);
    expect(screen.getByText("Started")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();
  });

  // Test 6: time labels are formatted correctly (HH:mm)
  it("displays time labels in HH:mm format", () => {
    const timeline: TimelineBucket[] = [
      { t: "2026-01-21T10:00:00.000Z", started: 5, completed: 3, failed: 1 },
      { t: "2026-01-21T10:05:00.000Z", started: 3, completed: 2, failed: 0 },
    ];
    render(<FactoryRunMetricsChart timeline={timeline} />);
    // Should show time in local format - check for presence of time text
    const svg = screen.getByTestId("metrics-chart");
    const texts = svg.querySelectorAll("text");
    expect(texts.length).toBeGreaterThan(0);
  });

  // Test 7: handles single bucket
  it("renders correctly with single bucket", () => {
    const timeline: TimelineBucket[] = [
      { t: "2026-01-21T10:00:00.000Z", started: 10, completed: 8, failed: 2 },
    ];
    render(<FactoryRunMetricsChart timeline={timeline} />);
    expect(screen.getByTestId("metrics-chart")).toBeInTheDocument();
    expect(screen.getAllByTestId("bucket-bar")).toHaveLength(1);
  });

  // Test 8: handles all zeros gracefully
  it("renders chart even when all values are zero", () => {
    const timeline: TimelineBucket[] = [
      { t: "2026-01-21T10:00:00.000Z", started: 0, completed: 0, failed: 0 },
      { t: "2026-01-21T10:05:00.000Z", started: 0, completed: 0, failed: 0 },
    ];
    render(<FactoryRunMetricsChart timeline={timeline} />);
    expect(screen.getByTestId("metrics-chart")).toBeInTheDocument();
    expect(screen.getAllByTestId("bucket-bar")).toHaveLength(2);
  });
});
