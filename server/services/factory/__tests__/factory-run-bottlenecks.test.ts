/** Factory Run Bottlenecks Tests (PR-96) - TDD first */
import { describe, it, expect } from "vitest";
import { getFactoryRunBottlenecks, type BottleneckHint } from "../factory-run-bottlenecks";
import type { FactoryRunMetricsV2 } from "../factory-run-metrics-v2.service";

const createMetrics = (overrides: Partial<FactoryRunMetricsV2> = {}): FactoryRunMetricsV2 => ({
  runId: "run-1",
  windowMinutes: 5,
  startedAtISO: "2026-01-21T10:00:00.000Z",
  finishedAtISO: null,
  totals: { started: 0, completed: 0, failed: 0, cancelled: 0 },
  timing: { avgDurationSec: null, p95DurationSec: null, throughputPerMin: null, peakRunning: 0 },
  timeline: [],
  ...overrides,
});

describe("getFactoryRunBottlenecks", () => {
  // Test 1: empty attempts → []
  it("returns empty array when no attempts", () => {
    const metrics = createMetrics({ totals: { started: 0, completed: 0, failed: 0, cancelled: 0 } });
    const hints = getFactoryRunBottlenecks(metrics);
    expect(hints).toEqual([]);
  });

  // Test 2: NO_PROGRESS when started>0 and no completed/failed and enough buckets
  it("returns NO_PROGRESS when started but no progress after 3+ buckets", () => {
    const metrics = createMetrics({
      totals: { started: 5, completed: 0, failed: 0, cancelled: 0 },
      timeline: [
        { t: "2026-01-21T10:00:00.000Z", started: 2, completed: 0, failed: 0 },
        { t: "2026-01-21T10:05:00.000Z", started: 2, completed: 0, failed: 0 },
        { t: "2026-01-21T10:10:00.000Z", started: 1, completed: 0, failed: 0 },
        { t: "2026-01-21T10:15:00.000Z", started: 0, completed: 0, failed: 0 },
      ],
    });
    const hints = getFactoryRunBottlenecks(metrics);
    const noProgress = hints.find((h) => h.code === "NO_PROGRESS");
    expect(noProgress).toBeDefined();
    expect(noProgress?.severity).toBe("critical");
  });

  // Test 3: HIGH_FAILURE_RATE warning at 0.3
  it("returns HIGH_FAILURE_RATE warning at 30% failure rate", () => {
    const metrics = createMetrics({
      totals: { started: 10, completed: 7, failed: 3, cancelled: 0 }, // 3/10 = 30%
      timing: { avgDurationSec: 60, p95DurationSec: 90, throughputPerMin: 1, peakRunning: 2 },
    });
    const hints = getFactoryRunBottlenecks(metrics);
    const highFailure = hints.find((h) => h.code === "HIGH_FAILURE_RATE");
    expect(highFailure).toBeDefined();
    expect(highFailure?.severity).toBe("warning");
  });

  // Test 4: HIGH_FAILURE_RATE critical at 0.5
  it("returns HIGH_FAILURE_RATE critical at 50% failure rate", () => {
    const metrics = createMetrics({
      totals: { started: 10, completed: 5, failed: 5, cancelled: 0 }, // 5/10 = 50%
      timing: { avgDurationSec: 60, p95DurationSec: 90, throughputPerMin: 1, peakRunning: 2 },
    });
    const hints = getFactoryRunBottlenecks(metrics);
    const highFailure = hints.find((h) => h.code === "HIGH_FAILURE_RATE");
    expect(highFailure).toBeDefined();
    expect(highFailure?.severity).toBe("critical");
  });

  // Test 5: LOW_THROUGHPUT warning at 0.19
  it("returns LOW_THROUGHPUT warning when throughput < 0.2", () => {
    const metrics = createMetrics({
      totals: { started: 5, completed: 3, failed: 0, cancelled: 0 },
      timing: { avgDurationSec: 300, p95DurationSec: 400, throughputPerMin: 0.19, peakRunning: 2 },
    });
    const hints = getFactoryRunBottlenecks(metrics);
    const lowThroughput = hints.find((h) => h.code === "LOW_THROUGHPUT");
    expect(lowThroughput).toBeDefined();
    expect(lowThroughput?.severity).toBe("warning");
  });

  // Test 5b: LOW_THROUGHPUT critical at < 0.1
  it("returns LOW_THROUGHPUT critical when throughput < 0.1", () => {
    const metrics = createMetrics({
      totals: { started: 5, completed: 2, failed: 0, cancelled: 0 },
      timing: { avgDurationSec: 600, p95DurationSec: 700, throughputPerMin: 0.05, peakRunning: 2 },
    });
    const hints = getFactoryRunBottlenecks(metrics);
    const lowThroughput = hints.find((h) => h.code === "LOW_THROUGHPUT");
    expect(lowThroughput).toBeDefined();
    expect(lowThroughput?.severity).toBe("critical");
  });

  // Test 6: LOW_PARALLELISM info when peakRunning=1 and started>=3
  it("returns LOW_PARALLELISM info when peakRunning=1 and started>=3", () => {
    const metrics = createMetrics({
      totals: { started: 5, completed: 4, failed: 0, cancelled: 0 },
      timing: { avgDurationSec: 60, p95DurationSec: 90, throughputPerMin: 1, peakRunning: 1 },
    });
    const hints = getFactoryRunBottlenecks(metrics);
    const lowParallel = hints.find((h) => h.code === "LOW_PARALLELISM");
    expect(lowParallel).toBeDefined();
    expect(lowParallel?.severity).toBe("info");
  });

  // Test 7: multiple hints returned (stable order by severity desc then code)
  it("returns multiple hints sorted by severity desc then code", () => {
    const metrics = createMetrics({
      totals: { started: 10, completed: 3, failed: 5, cancelled: 0 }, // 62.5% failure
      timing: { avgDurationSec: 600, p95DurationSec: 700, throughputPerMin: 0.05, peakRunning: 1 },
    });
    const hints = getFactoryRunBottlenecks(metrics);
    expect(hints.length).toBeGreaterThanOrEqual(2);
    // Check severity order: critical first, then warning, then info
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    for (let i = 1; i < hints.length; i++) {
      const prevSev = severityOrder[hints[i - 1].severity];
      const currSev = severityOrder[hints[i].severity];
      expect(currSev).toBeGreaterThanOrEqual(prevSev);
    }
  });

  // Test 8: no false positives on healthy metrics
  it("returns empty array for healthy metrics", () => {
    const metrics = createMetrics({
      totals: { started: 20, completed: 18, failed: 1, cancelled: 1 }, // 5% failure
      timing: { avgDurationSec: 60, p95DurationSec: 90, throughputPerMin: 2.5, peakRunning: 4 },
      timeline: [
        { t: "2026-01-21T10:00:00.000Z", started: 10, completed: 9, failed: 1 },
        { t: "2026-01-21T10:05:00.000Z", started: 10, completed: 9, failed: 0 },
      ],
    });
    const hints = getFactoryRunBottlenecks(metrics);
    expect(hints).toEqual([]);
  });
});
