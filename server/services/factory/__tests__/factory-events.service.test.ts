/** Factory Events Service Tests (PR-84) - TDD */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getFactorySnapshot,
  diffSnapshots,
  FactoryEventsDeps,
  FactorySnapshot,
} from "../factory-events.service";

function createMockDeps(overrides: Partial<FactoryEventsDeps> = {}): FactoryEventsDeps {
  return {
    getLatestRun: vi.fn().mockResolvedValue(null),
    getAttemptsByRunId: vi.fn().mockResolvedValue([]),
    getLastLogLine: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

describe("getFactorySnapshot", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns null snapshot when no run exists", async () => {
    const deps = createMockDeps();
    const snapshot = await getFactorySnapshot("project-1", deps);
    expect(snapshot).toBeNull();
  });

  it("returns snapshot with run and attempts", async () => {
    const deps = createMockDeps({
      getLatestRun: vi.fn().mockResolvedValue({ id: "run-1", status: "running" }),
      getAttemptsByRunId: vi.fn().mockResolvedValue([
        { id: "att-1", taskId: "task-1", status: "running" },
        { id: "att-2", taskId: "task-2", status: "completed" },
      ]),
      getLastLogLine: vi.fn().mockImplementation(async (id) =>
        id === "att-1" ? "Processing..." : "Done"
      ),
    });
    const snapshot = await getFactorySnapshot("project-1", deps);
    expect(snapshot).not.toBeNull();
    expect(snapshot!.runId).toBe("run-1");
    expect(snapshot!.runStatus).toBe("running");
    expect(snapshot!.attempts).toHaveLength(2);
    expect(snapshot!.attempts[0].lastLogLine).toBe("Processing...");
  });

  it("handles empty last log line", async () => {
    const deps = createMockDeps({
      getLatestRun: vi.fn().mockResolvedValue({ id: "run-1", status: "running" }),
      getAttemptsByRunId: vi.fn().mockResolvedValue([
        { id: "att-1", taskId: "task-1", status: "queued" },
      ]),
      getLastLogLine: vi.fn().mockResolvedValue(null),
    });
    const snapshot = await getFactorySnapshot("project-1", deps);
    expect(snapshot!.attempts[0].lastLogLine).toBeNull();
  });

  it("counts attempts correctly", async () => {
    const deps = createMockDeps({
      getLatestRun: vi.fn().mockResolvedValue({ id: "run-1", status: "running" }),
      getAttemptsByRunId: vi.fn().mockResolvedValue([
        { id: "a1", taskId: "t1", status: "completed" },
        { id: "a2", taskId: "t2", status: "running" },
        { id: "a3", taskId: "t3", status: "failed" },
        { id: "a4", taskId: "t4", status: "queued" },
      ]),
      getLastLogLine: vi.fn().mockResolvedValue(null),
    });
    const snapshot = await getFactorySnapshot("project-1", deps);
    expect(snapshot!.counts.total).toBe(4);
    expect(snapshot!.counts.completed).toBe(1);
    expect(snapshot!.counts.running).toBe(1);
    expect(snapshot!.counts.failed).toBe(1);
    expect(snapshot!.counts.queued).toBe(1);
  });
});

describe("diffSnapshots", () => {
  it("generates run event when status changes", () => {
    const prev: FactorySnapshot = {
      runId: "r1", runStatus: "running",
      attempts: [], counts: { total: 0, completed: 0, failed: 0, cancelled: 0, running: 0, queued: 0 },
    };
    const next: FactorySnapshot = {
      runId: "r1", runStatus: "completed",
      attempts: [], counts: { total: 0, completed: 0, failed: 0, cancelled: 0, running: 0, queued: 0 },
    };
    const events = diffSnapshots(prev, next);
    expect(events).toContainEqual({ type: "run", runId: "r1", status: "completed" });
  });

  it("generates attempt event when attempt status changes", () => {
    const prev: FactorySnapshot = {
      runId: "r1", runStatus: "running",
      attempts: [{ id: "a1", taskId: "t1", status: "running", lastLogLine: null }],
      counts: { total: 1, completed: 0, failed: 0, cancelled: 0, running: 1, queued: 0 },
    };
    const next: FactorySnapshot = {
      runId: "r1", runStatus: "running",
      attempts: [{ id: "a1", taskId: "t1", status: "completed", lastLogLine: "Done" }],
      counts: { total: 1, completed: 1, failed: 0, cancelled: 0, running: 0, queued: 0 },
    };
    const events = diffSnapshots(prev, next);
    expect(events).toContainEqual({ type: "attempt", attemptId: "a1", taskId: "t1", status: "completed" });
  });

  it("generates log event when lastLogLine changes", () => {
    const prev: FactorySnapshot = {
      runId: "r1", runStatus: "running",
      attempts: [{ id: "a1", taskId: "t1", status: "running", lastLogLine: "Line 1" }],
      counts: { total: 1, completed: 0, failed: 0, cancelled: 0, running: 1, queued: 0 },
    };
    const next: FactorySnapshot = {
      runId: "r1", runStatus: "running",
      attempts: [{ id: "a1", taskId: "t1", status: "running", lastLogLine: "Line 2" }],
      counts: { total: 1, completed: 0, failed: 0, cancelled: 0, running: 1, queued: 0 },
    };
    const events = diffSnapshots(prev, next);
    expect(events).toContainEqual({ type: "log", attemptId: "a1", line: "Line 2" });
  });

  it("generates no events when nothing changes", () => {
    const snapshot: FactorySnapshot = {
      runId: "r1", runStatus: "running",
      attempts: [{ id: "a1", taskId: "t1", status: "running", lastLogLine: "Same" }],
      counts: { total: 1, completed: 0, failed: 0, cancelled: 0, running: 1, queued: 0 },
    };
    const events = diffSnapshots(snapshot, snapshot);
    expect(events).toHaveLength(0);
  });

  it("generates summary event when counts change", () => {
    const prev: FactorySnapshot = {
      runId: "r1", runStatus: "running",
      attempts: [], counts: { total: 2, completed: 1, failed: 0, cancelled: 0, running: 1, queued: 0 },
    };
    const next: FactorySnapshot = {
      runId: "r1", runStatus: "running",
      attempts: [], counts: { total: 2, completed: 2, failed: 0, cancelled: 0, running: 0, queued: 0 },
    };
    const events = diffSnapshots(prev, next);
    expect(events).toContainEqual({ type: "summary", counts: next.counts });
  });
});
