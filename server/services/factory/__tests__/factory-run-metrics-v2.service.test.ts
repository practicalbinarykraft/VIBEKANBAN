/** Factory Run Metrics V2 Service Tests (PR-95) - TDD first */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getFactoryRunMetricsV2,
  type FactoryRunMetricsV2Deps,
  type AttemptRecordV2,
} from "../factory-run-metrics-v2.service";

const createMockDeps = (
  attempts: AttemptRecordV2[],
  runExists = true,
  run: { id: string; startedAt: Date | null; finishedAt: Date | null } = {
    id: "run-1",
    startedAt: new Date("2026-01-21T10:00:00.000Z"),
    finishedAt: null,
  }
): FactoryRunMetricsV2Deps => ({
  getAttemptsByRunId: vi.fn().mockResolvedValue(attempts),
  getAutopilotRun: vi.fn().mockResolvedValue(runExists ? run : null),
});

describe("getFactoryRunMetricsV2", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 1: empty attempts → null timing, empty timeline
  it("returns null timing and empty timeline when no attempts", async () => {
    const deps = createMockDeps([]);
    const result = await getFactoryRunMetricsV2("run-1", deps);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.totals).toEqual({ started: 0, completed: 0, failed: 0, cancelled: 0 });
      expect(result.data.timing.avgDurationSec).toBeNull();
      expect(result.data.timing.p95DurationSec).toBeNull();
      expect(result.data.timing.throughputPerMin).toBeNull();
      expect(result.data.timing.peakRunning).toBe(0);
      expect(result.data.timeline).toEqual([]);
    }
  });

  // Test 2: 1 completed attempt duration avg correct
  it("computes avg duration correctly for single completed attempt", async () => {
    const attempts: AttemptRecordV2[] = [
      { id: "a1", status: "completed", startedAt: new Date("2026-01-21T10:00:00Z"), finishedAt: new Date("2026-01-21T10:01:30Z") },
    ];
    const deps = createMockDeps(attempts);
    const result = await getFactoryRunMetricsV2("run-1", deps);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.timing.avgDurationSec).toBe(90); // 1 min 30 sec
    }
  });

  // Test 3: throughput computed with min 1 minute guard
  it("computes throughput with minimum 1 minute window", async () => {
    const attempts: AttemptRecordV2[] = [
      { id: "a1", status: "completed", startedAt: new Date("2026-01-21T10:00:00Z"), finishedAt: new Date("2026-01-21T10:00:20Z") },
      { id: "a2", status: "completed", startedAt: new Date("2026-01-21T10:00:10Z"), finishedAt: new Date("2026-01-21T10:00:30Z") },
    ];
    const deps = createMockDeps(attempts);
    const result = await getFactoryRunMetricsV2("run-1", deps);

    expect(result.ok).toBe(true);
    if (result.ok) {
      // 2 completed in 30 sec window, but min is 1 min → 2 per min
      expect(result.data.timing.throughputPerMin).toBe(2);
    }
  });

  // Test 4: 5-min buckets grouping correct
  it("groups timeline into 5-minute buckets", async () => {
    const attempts: AttemptRecordV2[] = [
      { id: "a1", status: "completed", startedAt: new Date("2026-01-21T10:01:00Z"), finishedAt: new Date("2026-01-21T10:06:00Z") },
      { id: "a2", status: "completed", startedAt: new Date("2026-01-21T10:03:00Z"), finishedAt: new Date("2026-01-21T10:08:00Z") },
      { id: "a3", status: "failed", startedAt: new Date("2026-01-21T10:07:00Z"), finishedAt: new Date("2026-01-21T10:12:00Z") },
    ];
    const deps = createMockDeps(attempts);
    const result = await getFactoryRunMetricsV2("run-1", deps);

    expect(result.ok).toBe(true);
    if (result.ok) {
      // Bucket 10:00-10:05: started=2 (a1, a2), completed=0, failed=0
      // Bucket 10:05-10:10: started=1 (a3), completed=2 (a1, a2), failed=0
      // Bucket 10:10-10:15: started=0, completed=0, failed=1 (a3)
      const bucket0 = result.data.timeline.find((b) => b.t === "2026-01-21T10:00:00.000Z");
      const bucket1 = result.data.timeline.find((b) => b.t === "2026-01-21T10:05:00.000Z");
      const bucket2 = result.data.timeline.find((b) => b.t === "2026-01-21T10:10:00.000Z");

      expect(bucket0).toEqual({ t: "2026-01-21T10:00:00.000Z", started: 2, completed: 0, failed: 0 });
      expect(bucket1).toEqual({ t: "2026-01-21T10:05:00.000Z", started: 1, completed: 2, failed: 0 });
      expect(bucket2).toEqual({ t: "2026-01-21T10:10:00.000Z", started: 0, completed: 0, failed: 1 });
    }
  });

  // Test 5: failed counted in totals and timeline
  it("counts failed attempts in totals and timeline", async () => {
    const attempts: AttemptRecordV2[] = [
      { id: "a1", status: "failed", startedAt: new Date("2026-01-21T10:00:00Z"), finishedAt: new Date("2026-01-21T10:02:00Z") },
      { id: "a2", status: "failed", startedAt: new Date("2026-01-21T10:01:00Z"), finishedAt: new Date("2026-01-21T10:03:00Z") },
    ];
    const deps = createMockDeps(attempts);
    const result = await getFactoryRunMetricsV2("run-1", deps);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.totals.failed).toBe(2);
      expect(result.data.totals.started).toBe(2);
    }
  });

  // Test 6: cancelled counted and impacts peakRunning
  it("counts cancelled and decrements peakRunning correctly", async () => {
    const attempts: AttemptRecordV2[] = [
      { id: "a1", status: "cancelled", startedAt: new Date("2026-01-21T10:00:00Z"), finishedAt: new Date("2026-01-21T10:05:00Z") },
      { id: "a2", status: "completed", startedAt: new Date("2026-01-21T10:02:00Z"), finishedAt: new Date("2026-01-21T10:04:00Z") },
    ];
    const deps = createMockDeps(attempts);
    const result = await getFactoryRunMetricsV2("run-1", deps);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.totals.cancelled).toBe(1);
      // Peak: 10:00 +1 (a1), 10:02 +1 (a2) = 2, 10:04 -1 (a2), 10:05 -1 (a1)
      expect(result.data.timing.peakRunning).toBe(2);
    }
  });

  // Test 7: peakRunning correct with overlaps
  it("computes peakRunning correctly with overlapping attempts", async () => {
    const attempts: AttemptRecordV2[] = [
      { id: "a1", status: "completed", startedAt: new Date("2026-01-21T10:00:00Z"), finishedAt: new Date("2026-01-21T10:10:00Z") },
      { id: "a2", status: "completed", startedAt: new Date("2026-01-21T10:02:00Z"), finishedAt: new Date("2026-01-21T10:08:00Z") },
      { id: "a3", status: "completed", startedAt: new Date("2026-01-21T10:04:00Z"), finishedAt: new Date("2026-01-21T10:06:00Z") },
    ];
    const deps = createMockDeps(attempts);
    const result = await getFactoryRunMetricsV2("run-1", deps);

    expect(result.ok).toBe(true);
    if (result.ok) {
      // Timeline: 10:00 +1, 10:02 +1 (=2), 10:04 +1 (=3 peak), 10:06 -1 (=2), 10:08 -1 (=1), 10:10 -1 (=0)
      expect(result.data.timing.peakRunning).toBe(3);
    }
  });

  // Test 8: p95 null when < 5 durations, computed when >= 5
  it("returns null p95 when fewer than 5 durations", async () => {
    const attempts: AttemptRecordV2[] = [
      { id: "a1", status: "completed", startedAt: new Date("2026-01-21T10:00:00Z"), finishedAt: new Date("2026-01-21T10:01:00Z") },
      { id: "a2", status: "completed", startedAt: new Date("2026-01-21T10:00:00Z"), finishedAt: new Date("2026-01-21T10:02:00Z") },
    ];
    const deps = createMockDeps(attempts);
    const result = await getFactoryRunMetricsV2("run-1", deps);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.timing.p95DurationSec).toBeNull();
    }
  });

  it("computes p95 when 5 or more durations", async () => {
    // Durations: 10, 20, 30, 40, 50 seconds (sorted)
    // p95 index = floor(0.95 * 4) = 3 → value = 40
    const attempts: AttemptRecordV2[] = [10, 20, 30, 40, 50].map((sec, i) => ({
      id: `a${i}`,
      status: "completed" as const,
      startedAt: new Date("2026-01-21T10:00:00Z"),
      finishedAt: new Date(new Date("2026-01-21T10:00:00Z").getTime() + sec * 1000),
    }));
    const deps = createMockDeps(attempts);
    const result = await getFactoryRunMetricsV2("run-1", deps);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.timing.p95DurationSec).toBe(40);
    }
  });

  // Additional: RUN_NOT_FOUND
  it("returns RUN_NOT_FOUND when run does not exist", async () => {
    const deps = createMockDeps([], false);
    const result = await getFactoryRunMetricsV2("run-1", deps);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("RUN_NOT_FOUND");
    }
  });

  // Additional: windowMinutes is 5
  it("returns windowMinutes as 5", async () => {
    const deps = createMockDeps([]);
    const result = await getFactoryRunMetricsV2("run-1", deps);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.windowMinutes).toBe(5);
    }
  });

  // Additional: startedAtISO and finishedAtISO from run
  it("includes run timestamps in response", async () => {
    const run = {
      id: "run-1",
      startedAt: new Date("2026-01-21T10:00:00.000Z"),
      finishedAt: new Date("2026-01-21T11:00:00.000Z"),
    };
    const deps = createMockDeps([], true, run);
    const result = await getFactoryRunMetricsV2("run-1", deps);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.startedAtISO).toBe("2026-01-21T10:00:00.000Z");
      expect(result.data.finishedAtISO).toBe("2026-01-21T11:00:00.000Z");
    }
  });
});
