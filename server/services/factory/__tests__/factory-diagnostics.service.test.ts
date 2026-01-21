/** Factory Diagnostics Service Tests (PR-109) - TDD */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getFactoryDiagnostics,
  type DiagnosticsDeps,
} from "../factory-diagnostics.service";

function createMockDeps(overrides: Partial<DiagnosticsDeps> = {}): DiagnosticsDeps {
  return {
    getLatestRun: vi.fn().mockResolvedValue(null),
    getAttemptCounts: vi.fn().mockResolvedValue({ queued: 0, running: 0, total: 0 }),
    getLastLogTime: vi.fn().mockResolvedValue(null),
    isWorkerActive: vi.fn().mockReturnValue(false),
    ...overrides,
  };
}

describe("factory-diagnostics.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getFactoryDiagnostics", () => {
    it("returns null stuckReason when no run exists", async () => {
      const deps = createMockDeps({
        getLatestRun: vi.fn().mockResolvedValue(null),
      });

      const result = await getFactoryDiagnostics("proj-1", deps);

      expect(result.stuckReason).toBeNull();
      expect(result.workerActive).toBe(false);
    });

    it("returns null stuckReason when run is not running", async () => {
      const deps = createMockDeps({
        getLatestRun: vi.fn().mockResolvedValue({ id: "run-1", status: "completed", error: null }),
      });

      const result = await getFactoryDiagnostics("proj-1", deps);

      expect(result.stuckReason).toBeNull();
    });

    it("returns WORKER_NOT_ACTIVE when run is running but worker is not active", async () => {
      const deps = createMockDeps({
        getLatestRun: vi.fn().mockResolvedValue({ id: "run-1", status: "running", error: null }),
        isWorkerActive: vi.fn().mockReturnValue(false),
        getAttemptCounts: vi.fn().mockResolvedValue({ queued: 1, running: 0, total: 1 }),
      });

      const result = await getFactoryDiagnostics("proj-1", deps);

      expect(result.stuckReason).toBe("WORKER_NOT_ACTIVE");
      expect(result.workerActive).toBe(false);
    });

    it("returns PREFLIGHT_FAILED when run error contains preflight", async () => {
      const deps = createMockDeps({
        getLatestRun: vi.fn().mockResolvedValue({ id: "run-1", status: "running", error: "preflight check failed" }),
        isWorkerActive: vi.fn().mockReturnValue(true),
        getAttemptCounts: vi.fn().mockResolvedValue({ queued: 0, running: 0, total: 0 }),
      });

      const result = await getFactoryDiagnostics("proj-1", deps);

      expect(result.stuckReason).toBe("PREFLIGHT_FAILED");
    });

    it("returns NO_RUNNABLE_TASKS when total attempts is 0", async () => {
      const deps = createMockDeps({
        getLatestRun: vi.fn().mockResolvedValue({ id: "run-1", status: "running", error: null }),
        isWorkerActive: vi.fn().mockReturnValue(true),
        getAttemptCounts: vi.fn().mockResolvedValue({ queued: 0, running: 0, total: 0 }),
      });

      const result = await getFactoryDiagnostics("proj-1", deps);

      expect(result.stuckReason).toBe("NO_RUNNABLE_TASKS");
    });

    it("returns NO_LOGS_RECENTLY when last log is older than threshold", async () => {
      const fiveMinutesAgo = new Date(Date.now() - 6 * 60 * 1000); // 6 minutes ago
      const deps = createMockDeps({
        getLatestRun: vi.fn().mockResolvedValue({ id: "run-1", status: "running", error: null }),
        isWorkerActive: vi.fn().mockReturnValue(true),
        getAttemptCounts: vi.fn().mockResolvedValue({ queued: 1, running: 1, total: 2 }),
        getLastLogTime: vi.fn().mockResolvedValue(fiveMinutesAgo),
      });

      const result = await getFactoryDiagnostics("proj-1", deps);

      expect(result.stuckReason).toBe("NO_LOGS_RECENTLY");
    });

    it("returns null stuckReason when everything is normal", async () => {
      const recentLog = new Date(Date.now() - 30 * 1000); // 30 seconds ago
      const deps = createMockDeps({
        getLatestRun: vi.fn().mockResolvedValue({ id: "run-1", status: "running", error: null }),
        isWorkerActive: vi.fn().mockReturnValue(true),
        getAttemptCounts: vi.fn().mockResolvedValue({ queued: 2, running: 1, total: 5 }),
        getLastLogTime: vi.fn().mockResolvedValue(recentLog),
      });

      const result = await getFactoryDiagnostics("proj-1", deps);

      expect(result.stuckReason).toBeNull();
      expect(result.workerActive).toBe(true);
      expect(result.queuedCount).toBe(2);
      expect(result.runningCount).toBe(1);
      expect(result.lastEventAt).toEqual(recentLog);
    });

    it("returns correct counts", async () => {
      const deps = createMockDeps({
        getLatestRun: vi.fn().mockResolvedValue({ id: "run-1", status: "running", error: null }),
        isWorkerActive: vi.fn().mockReturnValue(true),
        getAttemptCounts: vi.fn().mockResolvedValue({ queued: 5, running: 3, total: 10 }),
        getLastLogTime: vi.fn().mockResolvedValue(new Date()),
      });

      const result = await getFactoryDiagnostics("proj-1", deps);

      expect(result.queuedCount).toBe(5);
      expect(result.runningCount).toBe(3);
    });
  });
});
