/** Factory Run Metrics Service Tests (PR-94) - TDD */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getFactoryRunMetrics,
  type FactoryRunMetricsDeps,
  type AttemptRecord,
  type FactoryRunMetricsResult,
} from "../factory-run-metrics.service";

const createMockDeps = (
  attempts: AttemptRecord[],
  runExists = true,
  runStartedAt: Date | null = new Date("2026-01-21T10:00:00.000Z")
): FactoryRunMetricsDeps => ({
  getAttemptsByRunId: vi.fn().mockResolvedValue(attempts),
  getFactoryRun: vi.fn().mockResolvedValue(runExists ? { id: "run-1", startedAt: runStartedAt } : null),
});

describe("getFactoryRunMetrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns RUN_NOT_FOUND when run does not exist", async () => {
    const deps = createMockDeps([], false);
    const result = await getFactoryRunMetrics({ projectId: "p1", runId: "run-1" }, deps);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("RUN_NOT_FOUND");
    }
  });

  it("computes counts correctly", async () => {
    const attempts: AttemptRecord[] = [
      { id: "a1", status: "completed", startedAt: new Date("2026-01-21T10:00:00Z"), finishedAt: new Date("2026-01-21T10:01:00Z") },
      { id: "a2", status: "completed", startedAt: new Date("2026-01-21T10:00:30Z"), finishedAt: new Date("2026-01-21T10:02:00Z") },
      { id: "a3", status: "failed", startedAt: new Date("2026-01-21T10:01:00Z"), finishedAt: new Date("2026-01-21T10:01:30Z") },
      { id: "a4", status: "running", startedAt: new Date("2026-01-21T10:02:00Z"), finishedAt: null },
      { id: "a5", status: "queued", startedAt: null, finishedAt: null },
    ];
    const deps = createMockDeps(attempts);
    const result = await getFactoryRunMetrics({ projectId: "p1", runId: "run-1" }, deps);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.counts).toEqual({
        total: 5,
        completed: 2,
        failed: 1,
        running: 1,
        queued: 1,
      });
    }
  });

  it("computes duration avg/p50/p90 correctly on known sample", async () => {
    // Durations in seconds: 10, 20, 30, 40, 50, 60, 70, 80, 90, 100
    // avg = 55, p50 = 50 (index 4), p90 = 90 (index 8)
    const attempts: AttemptRecord[] = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((sec, i) => ({
      id: `a${i}`,
      status: "completed",
      startedAt: new Date("2026-01-21T10:00:00Z"),
      finishedAt: new Date(new Date("2026-01-21T10:00:00Z").getTime() + sec * 1000),
    }));
    const deps = createMockDeps(attempts);
    const result = await getFactoryRunMetrics({ projectId: "p1", runId: "run-1" }, deps);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.durationsSec.avg).toBe(55);
      expect(result.data.durationsSec.p50).toBe(50);
      expect(result.data.durationsSec.p90).toBe(90);
    }
  });

  it("ignores attempts with missing timestamps for duration calc", async () => {
    const attempts: AttemptRecord[] = [
      { id: "a1", status: "completed", startedAt: new Date("2026-01-21T10:00:00Z"), finishedAt: new Date("2026-01-21T10:01:00Z") }, // 60s
      { id: "a2", status: "completed", startedAt: null, finishedAt: new Date("2026-01-21T10:02:00Z") }, // no start
      { id: "a3", status: "running", startedAt: new Date("2026-01-21T10:02:00Z"), finishedAt: null }, // no finish
    ];
    const deps = createMockDeps(attempts);
    const result = await getFactoryRunMetrics({ projectId: "p1", runId: "run-1" }, deps);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.durationsSec.avg).toBe(60);
      expect(result.data.durationsSec.p50).toBe(60);
      expect(result.data.durationsSec.p90).toBe(60);
    }
  });

  it("returns null durations when no completed attempts with valid timestamps", async () => {
    const attempts: AttemptRecord[] = [
      { id: "a1", status: "running", startedAt: new Date("2026-01-21T10:00:00Z"), finishedAt: null },
      { id: "a2", status: "queued", startedAt: null, finishedAt: null },
    ];
    const deps = createMockDeps(attempts);
    const result = await getFactoryRunMetrics({ projectId: "p1", runId: "run-1" }, deps);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.durationsSec.avg).toBeNull();
      expect(result.data.durationsSec.p50).toBeNull();
      expect(result.data.durationsSec.p90).toBeNull();
    }
  });

  it("computes timeline bucket aggregation correctly", async () => {
    const attempts: AttemptRecord[] = [
      { id: "a1", status: "completed", startedAt: new Date("2026-01-21T10:00:10Z"), finishedAt: new Date("2026-01-21T10:01:10Z") },
      { id: "a2", status: "completed", startedAt: new Date("2026-01-21T10:00:30Z"), finishedAt: new Date("2026-01-21T10:01:30Z") },
      { id: "a3", status: "failed", startedAt: new Date("2026-01-21T10:01:05Z"), finishedAt: new Date("2026-01-21T10:01:45Z") },
    ];
    const deps = createMockDeps(attempts);
    const result = await getFactoryRunMetrics({ projectId: "p1", runId: "run-1", bucketSeconds: 60 }, deps);
    expect(result.ok).toBe(true);
    if (result.ok) {
      // Bucket 10:00: started=2, completed=0, failed=0
      // Bucket 10:01: started=1, completed=2, failed=1
      const timeline = result.data.timeline;
      expect(timeline.length).toBeGreaterThanOrEqual(2);
      const bucket0 = timeline.find((b) => b.t === "2026-01-21T10:00:00.000Z");
      const bucket1 = timeline.find((b) => b.t === "2026-01-21T10:01:00.000Z");
      expect(bucket0).toEqual({ t: "2026-01-21T10:00:00.000Z", started: 2, completed: 0, failed: 0 });
      expect(bucket1).toEqual({ t: "2026-01-21T10:01:00.000Z", started: 1, completed: 2, failed: 1 });
    }
  });

  it("computes throughput with windowMinutes >= 1 clamp", async () => {
    // 2 completed in 30 seconds = 4 per minute (but window clamped to 1 min)
    const attempts: AttemptRecord[] = [
      { id: "a1", status: "completed", startedAt: new Date("2026-01-21T10:00:00Z"), finishedAt: new Date("2026-01-21T10:00:15Z") },
      { id: "a2", status: "completed", startedAt: new Date("2026-01-21T10:00:10Z"), finishedAt: new Date("2026-01-21T10:00:30Z") },
    ];
    const deps = createMockDeps(attempts);
    const result = await getFactoryRunMetrics({ projectId: "p1", runId: "run-1" }, deps);
    expect(result.ok).toBe(true);
    if (result.ok) {
      // Window is 30 seconds, clamped to 1 minute, so 2 completed / 1 min = 2
      expect(result.data.throughput.completedPerMinute).toBe(2);
    }
  });

  it("handles empty attempts array gracefully", async () => {
    const deps = createMockDeps([]);
    const result = await getFactoryRunMetrics({ projectId: "p1", runId: "run-1" }, deps);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.counts.total).toBe(0);
      expect(result.data.durationsSec.avg).toBeNull();
      expect(result.data.timeline).toEqual([]);
      expect(result.data.throughput.completedPerMinute).toBe(0);
    }
  });

  it("uses run.startedAt as windowStart fallback when no attempt startedAt", async () => {
    const runStartedAt = new Date("2026-01-21T09:55:00.000Z");
    const attempts: AttemptRecord[] = [
      { id: "a1", status: "completed", startedAt: null, finishedAt: new Date("2026-01-21T10:00:00Z") },
    ];
    const deps = createMockDeps(attempts, true, runStartedAt);
    const result = await getFactoryRunMetrics({ projectId: "p1", runId: "run-1" }, deps);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.throughput.windowStart).toBe("2026-01-21T09:55:00.000Z");
    }
  });
});
