/** Factory Status Service Tests (PR-83) - TDD */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getFactoryStatus, FactoryStatusDeps, FactoryStatus } from "../factory-status.service";

function createMockDeps(overrides: Partial<FactoryStatusDeps> = {}): FactoryStatusDeps {
  return {
    getLatestRun: vi.fn().mockResolvedValue(null),
    countAttemptsByStatus: vi.fn().mockResolvedValue({
      total: 0, completed: 0, failed: 0, cancelled: 0, running: 0, queued: 0,
    }),
    ...overrides,
  };
}

describe("getFactoryStatus", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns idle status when no run exists", async () => {
    const deps = createMockDeps();
    const result = await getFactoryStatus("project-1", deps);
    expect(result.hasRun).toBe(false);
    expect(result.status).toBe("idle");
    expect(result.runId).toBeNull();
  });

  it("returns running status with counts when run is running", async () => {
    const deps = createMockDeps({
      getLatestRun: vi.fn().mockResolvedValue({ id: "run-1", status: "running" }),
      countAttemptsByStatus: vi.fn().mockResolvedValue({
        total: 5, completed: 2, failed: 0, cancelled: 0, running: 2, queued: 1,
      }),
    });
    const result = await getFactoryStatus("project-1", deps);
    expect(result.hasRun).toBe(true);
    expect(result.runId).toBe("run-1");
    expect(result.status).toBe("running");
    expect(result.total).toBe(5);
    expect(result.completed).toBe(2);
    expect(result.running).toBe(2);
    expect(result.queued).toBe(1);
  });

  it("returns completed status when run is completed", async () => {
    const deps = createMockDeps({
      getLatestRun: vi.fn().mockResolvedValue({ id: "run-2", status: "completed" }),
      countAttemptsByStatus: vi.fn().mockResolvedValue({
        total: 10, completed: 10, failed: 0, cancelled: 0, running: 0, queued: 0,
      }),
    });
    const result = await getFactoryStatus("project-1", deps);
    expect(result.status).toBe("completed");
    expect(result.completed).toBe(10);
  });

  it("returns failed status when run has failures", async () => {
    const deps = createMockDeps({
      getLatestRun: vi.fn().mockResolvedValue({ id: "run-3", status: "failed" }),
      countAttemptsByStatus: vi.fn().mockResolvedValue({
        total: 8, completed: 5, failed: 2, cancelled: 1, running: 0, queued: 0,
      }),
    });
    const result = await getFactoryStatus("project-1", deps);
    expect(result.status).toBe("failed");
    expect(result.failed).toBe(2);
    expect(result.cancelled).toBe(1);
  });

  it("returns cancelled status when run is cancelled", async () => {
    const deps = createMockDeps({
      getLatestRun: vi.fn().mockResolvedValue({ id: "run-4", status: "cancelled" }),
      countAttemptsByStatus: vi.fn().mockResolvedValue({
        total: 6, completed: 3, failed: 0, cancelled: 3, running: 0, queued: 0,
      }),
    });
    const result = await getFactoryStatus("project-1", deps);
    expect(result.status).toBe("cancelled");
    expect(result.cancelled).toBe(3);
  });

  it("counts attempts correctly with mixed statuses", async () => {
    const deps = createMockDeps({
      getLatestRun: vi.fn().mockResolvedValue({ id: "run-5", status: "running" }),
      countAttemptsByStatus: vi.fn().mockResolvedValue({
        total: 12, completed: 4, failed: 1, cancelled: 2, running: 3, queued: 2,
      }),
    });
    const result = await getFactoryStatus("project-1", deps);
    expect(result.total).toBe(12);
    expect(result.completed).toBe(4);
    expect(result.failed).toBe(1);
    expect(result.cancelled).toBe(2);
    expect(result.running).toBe(3);
    expect(result.queued).toBe(2);
  });
});
