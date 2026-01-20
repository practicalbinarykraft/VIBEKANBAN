/** Factory Resume Service Tests (PR-85) - TDD */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getResumeState, type FactoryResumeDeps } from "../factory-resume.service";

function createMockDeps(overrides: Partial<FactoryResumeDeps> = {}): FactoryResumeDeps {
  return {
    getLatestRun: vi.fn().mockResolvedValue(null),
    getAttemptsByRun: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

describe("getResumeState", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns idle when no run exists", async () => {
    const deps = createMockDeps({ getLatestRun: vi.fn().mockResolvedValue(null) });
    const state = await getResumeState("project-1", deps);
    expect(state.status).toBe("idle");
    expect(state.runId).toBeNull();
    expect(state.queuedTaskIds).toHaveLength(0);
    expect(state.runningTaskIds).toHaveLength(0);
  });

  it("detects running attempts", async () => {
    const deps = createMockDeps({
      getLatestRun: vi.fn().mockResolvedValue({ id: "run-1", status: "running" }),
      getAttemptsByRun: vi.fn().mockResolvedValue([
        { id: "att-1", taskId: "t1", status: "running" },
        { id: "att-2", taskId: "t2", status: "running" },
        { id: "att-3", taskId: "t3", status: "completed" },
      ]),
    });
    const state = await getResumeState("project-1", deps);
    expect(state.status).toBe("running");
    expect(state.runningTaskIds).toEqual(["t1", "t2"]);
    expect(state.runningTaskIds).not.toContain("t3");
  });

  it("detects queued attempts", async () => {
    const deps = createMockDeps({
      getLatestRun: vi.fn().mockResolvedValue({ id: "run-1", status: "running" }),
      getAttemptsByRun: vi.fn().mockResolvedValue([
        { id: "att-1", taskId: "t1", status: "queued" },
        { id: "att-2", taskId: "t2", status: "pending" },
        { id: "att-3", taskId: "t3", status: "running" },
      ]),
    });
    const state = await getResumeState("project-1", deps);
    expect(state.queuedTaskIds).toContain("t1");
    expect(state.queuedTaskIds).toContain("t2");
    expect(state.queuedTaskIds).not.toContain("t3");
  });

  it("returns stable maxParallel default", async () => {
    const deps = createMockDeps({
      getLatestRun: vi.fn().mockResolvedValue({ id: "run-1", status: "running" }),
    });
    const state = await getResumeState("project-1", deps);
    expect(state.maxParallel).toBeGreaterThan(0);
  });

  it("returns runId from latest run", async () => {
    const deps = createMockDeps({
      getLatestRun: vi.fn().mockResolvedValue({ id: "run-xyz", status: "running" }),
    });
    const state = await getResumeState("project-1", deps);
    expect(state.runId).toBe("run-xyz");
  });

  it("returns completed status from DB", async () => {
    const deps = createMockDeps({
      getLatestRun: vi.fn().mockResolvedValue({ id: "run-1", status: "completed" }),
    });
    const state = await getResumeState("project-1", deps);
    expect(state.status).toBe("completed");
  });

  it("returns cancelled status from DB", async () => {
    const deps = createMockDeps({
      getLatestRun: vi.fn().mockResolvedValue({ id: "run-1", status: "cancelled" }),
    });
    const state = await getResumeState("project-1", deps);
    expect(state.status).toBe("cancelled");
  });

  it("returns failed status from DB", async () => {
    const deps = createMockDeps({
      getLatestRun: vi.fn().mockResolvedValue({ id: "run-1", status: "failed" }),
    });
    const state = await getResumeState("project-1", deps);
    expect(state.status).toBe("failed");
  });
});
