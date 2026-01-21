/** Derived Factory Status Service Tests (PR-109) - TDD */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getDerivedFactoryStatus,
  type DerivedStatusDeps,
} from "../derived-factory-status.service";

function createMockDeps(overrides: Partial<DerivedStatusDeps> = {}): DerivedStatusDeps {
  return {
    getLatestRun: vi.fn().mockResolvedValue(null),
    hasFailedAttempts: vi.fn().mockResolvedValue(false),
    ...overrides,
  };
}

describe("derived-factory-status.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getDerivedFactoryStatus", () => {
    it("returns IDLE when no runs exist", async () => {
      const deps = createMockDeps({
        getLatestRun: vi.fn().mockResolvedValue(null),
      });

      const result = await getDerivedFactoryStatus("proj-1", deps);

      expect(result.status).toBe("idle");
      expect(result.runId).toBeNull();
      expect(result.hasFailedAttempts).toBe(false);
    });

    it("returns RUNNING when run.status is running", async () => {
      const deps = createMockDeps({
        getLatestRun: vi.fn().mockResolvedValue({ id: "run-1", status: "running" }),
      });

      const result = await getDerivedFactoryStatus("proj-1", deps);

      expect(result.status).toBe("running");
      expect(result.runId).toBe("run-1");
    });

    it("returns CANCELLED when run.status is cancelled", async () => {
      const deps = createMockDeps({
        getLatestRun: vi.fn().mockResolvedValue({ id: "run-1", status: "cancelled" }),
      });

      const result = await getDerivedFactoryStatus("proj-1", deps);

      expect(result.status).toBe("cancelled");
      expect(result.runId).toBe("run-1");
    });

    it("returns FAILED when run.status is failed", async () => {
      const deps = createMockDeps({
        getLatestRun: vi.fn().mockResolvedValue({ id: "run-1", status: "failed" }),
      });

      const result = await getDerivedFactoryStatus("proj-1", deps);

      expect(result.status).toBe("failed");
      expect(result.runId).toBe("run-1");
      expect(result.hasFailedAttempts).toBe(true);
    });

    it("returns FAILED when run.status is completed but has failed attempts", async () => {
      const deps = createMockDeps({
        getLatestRun: vi.fn().mockResolvedValue({ id: "run-1", status: "completed" }),
        hasFailedAttempts: vi.fn().mockResolvedValue(true),
      });

      const result = await getDerivedFactoryStatus("proj-1", deps);

      expect(result.status).toBe("failed");
      expect(result.runId).toBe("run-1");
      expect(result.hasFailedAttempts).toBe(true);
    });

    it("returns COMPLETED when run.status is completed with no failed attempts", async () => {
      const deps = createMockDeps({
        getLatestRun: vi.fn().mockResolvedValue({ id: "run-1", status: "completed" }),
        hasFailedAttempts: vi.fn().mockResolvedValue(false),
      });

      const result = await getDerivedFactoryStatus("proj-1", deps);

      expect(result.status).toBe("completed");
      expect(result.runId).toBe("run-1");
      expect(result.hasFailedAttempts).toBe(false);
    });

    it("returns IDLE for unknown status", async () => {
      const deps = createMockDeps({
        getLatestRun: vi.fn().mockResolvedValue({ id: "run-1", status: "unknown" }),
      });

      const result = await getDerivedFactoryStatus("proj-1", deps);

      expect(result.status).toBe("idle");
    });

    it("does NOT call hasFailedAttempts when status is running", async () => {
      const hasFailedAttempts = vi.fn();
      const deps = createMockDeps({
        getLatestRun: vi.fn().mockResolvedValue({ id: "run-1", status: "running" }),
        hasFailedAttempts,
      });

      await getDerivedFactoryStatus("proj-1", deps);

      expect(hasFailedAttempts).not.toHaveBeenCalled();
    });

    it("only calls hasFailedAttempts when status is completed", async () => {
      const hasFailedAttempts = vi.fn().mockResolvedValue(false);
      const deps = createMockDeps({
        getLatestRun: vi.fn().mockResolvedValue({ id: "run-1", status: "completed" }),
        hasFailedAttempts,
      });

      await getDerivedFactoryStatus("proj-1", deps);

      expect(hasFailedAttempts).toHaveBeenCalledWith("run-1");
    });
  });
});
