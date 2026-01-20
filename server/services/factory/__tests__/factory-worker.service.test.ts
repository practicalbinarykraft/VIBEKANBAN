/** Factory Worker Service Tests (PR-86) - TDD */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { FactoryWorkerService, type FactoryWorkerDeps } from "../factory-worker.service";
import { FactoryWorkerRegistry } from "../factory-worker-registry";

function createMockDeps(overrides: Partial<FactoryWorkerDeps> = {}): FactoryWorkerDeps {
  return {
    registry: new FactoryWorkerRegistry(),
    getResumeState: vi.fn().mockResolvedValue({
      runId: "run-1",
      status: "completed", // Default to completed to prevent infinite loop
      maxParallel: 3,
      queuedTaskIds: [],
      runningTaskIds: [],
    }),
    tickOnce: vi.fn().mockResolvedValue(undefined),
    markRunFailed: vi.fn().mockResolvedValue(undefined),
    sleepMs: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("FactoryWorkerService", () => {
  let deps: FactoryWorkerDeps;
  let worker: FactoryWorkerService;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Wait a tick to let any pending promises settle
    await new Promise((r) => setTimeout(r, 10));
  });

  describe("startOrAttach", () => {
    it("returns started=true", async () => {
      deps = createMockDeps();
      worker = new FactoryWorkerService(deps);
      const result = await worker.startOrAttach({
        projectId: "p1",
        runId: "r1",
        maxParallel: 3,
      });
      expect(result.started).toBe(true);
    });

    it("returns started=false if already running", async () => {
      deps = createMockDeps({
        getResumeState: vi.fn().mockResolvedValue({
          runId: "r1", status: "running", maxParallel: 3, queuedTaskIds: [], runningTaskIds: [],
        }),
      });
      worker = new FactoryWorkerService(deps);
      await worker.startOrAttach({ projectId: "p1", runId: "r1", maxParallel: 3 });
      // Second start should fail (dedupe)
      const result = await worker.startOrAttach({ projectId: "p1", runId: "r2", maxParallel: 3 });
      expect(result.started).toBe(false);
      // Stop the loop
      await worker.requestStop("p1");
    });

    it("stores correct runId in handle", async () => {
      deps = createMockDeps({
        getResumeState: vi.fn().mockResolvedValue({
          runId: "run-abc", status: "running", maxParallel: 3, queuedTaskIds: [], runningTaskIds: [],
        }),
      });
      worker = new FactoryWorkerService(deps);
      await worker.startOrAttach({ projectId: "p1", runId: "run-abc", maxParallel: 3 });
      const handle = deps.registry.get("p1");
      expect(handle?.runId).toBe("run-abc");
      // Clean up
      await worker.requestStop("p1");
    });
  });

  describe("requestStop", () => {
    it("sets stopRequested flag on handle", async () => {
      deps = createMockDeps({
        getResumeState: vi.fn().mockResolvedValue({
          runId: "r1", status: "running", maxParallel: 3, queuedTaskIds: [], runningTaskIds: [],
        }),
      });
      worker = new FactoryWorkerService(deps);
      await worker.startOrAttach({ projectId: "p1", runId: "r1", maxParallel: 3 });
      const result = await worker.requestStop("p1");
      expect(result.ok).toBe(true);
      expect(deps.registry.get("p1")?.stopRequested).toBe(true);
    });

    it("returns ok=false for unknown project", async () => {
      deps = createMockDeps();
      worker = new FactoryWorkerService(deps);
      const result = await worker.requestStop("unknown");
      expect(result.ok).toBe(false);
    });
  });

  describe("loop behavior", () => {
    it("calls tickOnce while running", async () => {
      let tickCount = 0;
      const tickOnce = vi.fn().mockImplementation(async () => { tickCount++; });
      let callCount = 0;
      const getResumeState = vi.fn().mockImplementation(async () => {
        callCount++;
        // Run for 2 ticks then complete
        return {
          runId: "r1",
          status: callCount <= 2 ? "running" : "completed",
          maxParallel: 3,
          queuedTaskIds: [],
          runningTaskIds: [],
        };
      });
      deps = createMockDeps({ tickOnce, getResumeState });
      worker = new FactoryWorkerService(deps);

      await worker.startOrAttach({ projectId: "p1", runId: "r1", maxParallel: 3 });
      // Wait for loop to complete
      await new Promise((r) => setTimeout(r, 50));
      expect(tickOnce).toHaveBeenCalled();
      expect(tickCount).toBeGreaterThanOrEqual(1);
    });

    it("stops when resume returns status != running", async () => {
      const getResumeState = vi.fn().mockResolvedValue({
        runId: "r1",
        status: "completed",
        maxParallel: 3,
        queuedTaskIds: [],
        runningTaskIds: [],
      });
      deps = createMockDeps({ getResumeState });
      worker = new FactoryWorkerService(deps);

      await worker.startOrAttach({ projectId: "p1", runId: "r1", maxParallel: 3 });
      // Wait for loop to exit
      await new Promise((r) => setTimeout(r, 50));
      expect(deps.registry.has("p1")).toBe(false);
    });

    it("removes handle from registry when loop exits", async () => {
      deps = createMockDeps();
      worker = new FactoryWorkerService(deps);

      await worker.startOrAttach({ projectId: "p1", runId: "r1", maxParallel: 3 });
      await new Promise((r) => setTimeout(r, 50));
      expect(deps.registry.has("p1")).toBe(false);
    });

    it("marks run failed on error", async () => {
      const tickOnce = vi.fn().mockRejectedValue(new Error("tick failed"));
      const markRunFailed = vi.fn().mockResolvedValue(undefined);
      const getResumeState = vi.fn().mockResolvedValue({
        runId: "r1", status: "running", maxParallel: 3, queuedTaskIds: [], runningTaskIds: [],
      });
      deps = createMockDeps({ tickOnce, markRunFailed, getResumeState });
      worker = new FactoryWorkerService(deps);

      await worker.startOrAttach({ projectId: "p1", runId: "r1", maxParallel: 3 });
      await new Promise((r) => setTimeout(r, 50));
      expect(markRunFailed).toHaveBeenCalledWith("r1", "tick failed");
    });
  });
});
