/** Factory Results Service Tests (PR-89) - TDD */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getFactoryResults,
  type FactoryResultsDeps,
} from "../factory-results.service";

function createMockDeps(overrides: Partial<FactoryResultsDeps> = {}): FactoryResultsDeps {
  return {
    getLatestRun: vi.fn().mockResolvedValue(null),
    getAttemptsByRunId: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

describe("getFactoryResults", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns idle when no factory run found", async () => {
    const deps = createMockDeps({ getLatestRun: vi.fn().mockResolvedValue(null) });
    const result = await getFactoryResults("p1", deps);

    expect(result.runId).toBeNull();
    expect(result.status).toBe("idle");
    expect(result.attempts).toHaveLength(0);
  });

  it("returns attempts sorted desc by updatedAt", async () => {
    const deps = createMockDeps({
      getLatestRun: vi.fn().mockResolvedValue({ id: "run-1", status: "completed" }),
      getAttemptsByRunId: vi.fn().mockResolvedValue([
        { id: "a1", taskId: "1", status: "completed", prUrl: null, updatedAt: new Date("2026-01-20T10:00:00Z") },
        { id: "a3", taskId: "3", status: "completed", prUrl: null, updatedAt: new Date("2026-01-20T12:00:00Z") },
        { id: "a2", taskId: "2", status: "completed", prUrl: null, updatedAt: new Date("2026-01-20T11:00:00Z") },
      ]),
    });
    const result = await getFactoryResults("p1", deps);

    expect(result.attempts[0].attemptId).toBe("a3"); // newest first
    expect(result.attempts[1].attemptId).toBe("a2");
    expect(result.attempts[2].attemptId).toBe("a1");
  });

  it("prUrl null when absent", async () => {
    const deps = createMockDeps({
      getLatestRun: vi.fn().mockResolvedValue({ id: "run-1", status: "completed" }),
      getAttemptsByRunId: vi.fn().mockResolvedValue([
        { id: "a1", taskId: "1", status: "completed", prUrl: null, updatedAt: new Date() },
      ]),
    });
    const result = await getFactoryResults("p1", deps);

    expect(result.attempts[0].prUrl).toBeNull();
  });

  it("includes prUrl when present", async () => {
    const deps = createMockDeps({
      getLatestRun: vi.fn().mockResolvedValue({ id: "run-1", status: "completed" }),
      getAttemptsByRunId: vi.fn().mockResolvedValue([
        { id: "a1", taskId: "1", status: "completed", prUrl: "https://github.com/pr/123", updatedAt: new Date() },
      ]),
    });
    const result = await getFactoryResults("p1", deps);

    expect(result.attempts[0].prUrl).toBe("https://github.com/pr/123");
  });

  it("totals computed correctly by status buckets", async () => {
    const deps = createMockDeps({
      getLatestRun: vi.fn().mockResolvedValue({ id: "run-1", status: "running" }),
      getAttemptsByRunId: vi.fn().mockResolvedValue([
        { id: "a1", taskId: "1", status: "queued", prUrl: null, updatedAt: new Date() },
        { id: "a2", taskId: "2", status: "queued", prUrl: null, updatedAt: new Date() },
        { id: "a3", taskId: "3", status: "running", prUrl: null, updatedAt: new Date() },
        { id: "a4", taskId: "4", status: "completed", prUrl: null, updatedAt: new Date() },
        { id: "a5", taskId: "5", status: "completed", prUrl: null, updatedAt: new Date() },
        { id: "a6", taskId: "6", status: "completed", prUrl: null, updatedAt: new Date() },
        { id: "a7", taskId: "7", status: "failed", prUrl: null, updatedAt: new Date() },
      ]),
    });
    const result = await getFactoryResults("p1", deps);

    expect(result.totals.queued).toBe(2);
    expect(result.totals.running).toBe(1);
    expect(result.totals.completed).toBe(3);
    expect(result.totals.failed).toBe(1);
  });

  it("status is running when run.status is running", async () => {
    const deps = createMockDeps({
      getLatestRun: vi.fn().mockResolvedValue({ id: "run-1", status: "running" }),
      getAttemptsByRunId: vi.fn().mockResolvedValue([]),
    });
    const result = await getFactoryResults("p1", deps);

    expect(result.status).toBe("running");
  });

  it("status is completed when run.status is completed", async () => {
    const deps = createMockDeps({
      getLatestRun: vi.fn().mockResolvedValue({ id: "run-1", status: "completed" }),
      getAttemptsByRunId: vi.fn().mockResolvedValue([]),
    });
    const result = await getFactoryResults("p1", deps);

    expect(result.status).toBe("completed");
  });

  it("status is failed when run.status is failed", async () => {
    const deps = createMockDeps({
      getLatestRun: vi.fn().mockResolvedValue({ id: "run-1", status: "failed" }),
      getAttemptsByRunId: vi.fn().mockResolvedValue([]),
    });
    const result = await getFactoryResults("p1", deps);

    expect(result.status).toBe("failed");
  });
});
