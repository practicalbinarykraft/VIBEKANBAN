/** Factory Run Results Service Tests (PR-88) - TDD */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getFactoryRunResults,
  type FactoryRunResultsDeps,
} from "../factory-run-results.service";

function createMockDeps(overrides: Partial<FactoryRunResultsDeps> = {}): FactoryRunResultsDeps {
  return {
    getRun: vi.fn().mockResolvedValue(null),
    getAttemptsByRunId: vi.fn().mockResolvedValue([]),
    getTasksByIds: vi.fn().mockResolvedValue([]),
    getErrorArtifact: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

describe("getFactoryRunResults", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns null when run not found", async () => {
    const deps = createMockDeps({ getRun: vi.fn().mockResolvedValue(null) });
    const result = await getFactoryRunResults("p1", "run-1", deps);
    expect(result).toBeNull();
  });

  it("returns empty items when no attempts", async () => {
    const deps = createMockDeps({
      getRun: vi.fn().mockResolvedValue({ id: "run-1", status: "completed", projectId: "p1" }),
      getAttemptsByRunId: vi.fn().mockResolvedValue([]),
    });
    const result = await getFactoryRunResults("p1", "run-1", deps);
    expect(result).not.toBeNull();
    expect(result!.items).toHaveLength(0);
    expect(result!.counts.total).toBe(0);
  });

  it("includes PR URL when attempt has one", async () => {
    const deps = createMockDeps({
      getRun: vi.fn().mockResolvedValue({ id: "run-1", status: "completed", projectId: "p1" }),
      getAttemptsByRunId: vi.fn().mockResolvedValue([
        { id: "a1", taskId: "t1", status: "completed", prUrl: "https://github.com/pr/1" },
      ]),
      getTasksByIds: vi.fn().mockResolvedValue([{ id: "t1", title: "Task 1" }]),
    });
    const result = await getFactoryRunResults("p1", "run-1", deps);
    expect(result!.items[0].prUrl).toBe("https://github.com/pr/1");
  });

  it("maps error code and message for failed attempts", async () => {
    const deps = createMockDeps({
      getRun: vi.fn().mockResolvedValue({ id: "run-1", status: "failed", projectId: "p1" }),
      getAttemptsByRunId: vi.fn().mockResolvedValue([
        { id: "a1", taskId: "t1", status: "failed", applyError: "Git push failed", exitCode: 1 },
      ]),
      getTasksByIds: vi.fn().mockResolvedValue([{ id: "t1", title: "Task 1" }]),
      getErrorArtifact: vi.fn().mockResolvedValue({ code: "GIT_ERROR", message: "Git push failed" }),
    });
    const result = await getFactoryRunResults("p1", "run-1", deps);
    expect(result!.items[0].errorCode).toBe("GIT_ERROR");
    expect(result!.items[0].errorMessage).toBe("Git push failed");
  });

  it("provides guidance for failed attempts", async () => {
    const deps = createMockDeps({
      getRun: vi.fn().mockResolvedValue({ id: "run-1", status: "failed", projectId: "p1" }),
      getAttemptsByRunId: vi.fn().mockResolvedValue([
        { id: "a1", taskId: "t1", status: "failed", applyError: "Budget exceeded" },
      ]),
      getTasksByIds: vi.fn().mockResolvedValue([{ id: "t1", title: "Task 1" }]),
      getErrorArtifact: vi.fn().mockResolvedValue({ code: "BUDGET_EXCEEDED", message: "Budget exceeded" }),
    });
    const result = await getFactoryRunResults("p1", "run-1", deps);
    expect(result!.items[0].guidance).not.toBeNull();
    expect(result!.items[0].guidance!.severity).toBe("warning");
    expect(result!.items[0].guidance!.title).toContain("Budget");
  });

  it("calculates counts correctly", async () => {
    const deps = createMockDeps({
      getRun: vi.fn().mockResolvedValue({ id: "run-1", status: "running", projectId: "p1" }),
      getAttemptsByRunId: vi.fn().mockResolvedValue([
        { id: "a1", taskId: "t1", status: "completed" },
        { id: "a2", taskId: "t2", status: "failed" },
        { id: "a3", taskId: "t3", status: "running" },
        { id: "a4", taskId: "t4", status: "queued" },
      ]),
      getTasksByIds: vi.fn().mockResolvedValue([
        { id: "t1", title: "Task 1" },
        { id: "t2", title: "Task 2" },
        { id: "t3", title: "Task 3" },
        { id: "t4", title: "Task 4" },
      ]),
    });
    const result = await getFactoryRunResults("p1", "run-1", deps);
    expect(result!.counts).toEqual({
      total: 4,
      ok: 1,
      failed: 1,
      running: 1,
      queued: 1,
    });
  });

  it("uses fallback error code when no artifact", async () => {
    const deps = createMockDeps({
      getRun: vi.fn().mockResolvedValue({ id: "run-1", status: "failed", projectId: "p1" }),
      getAttemptsByRunId: vi.fn().mockResolvedValue([
        { id: "a1", taskId: "t1", status: "failed", applyError: "Something went wrong", exitCode: 99 },
      ]),
      getTasksByIds: vi.fn().mockResolvedValue([{ id: "t1", title: "Task 1" }]),
      getErrorArtifact: vi.fn().mockResolvedValue(null),
    });
    const result = await getFactoryRunResults("p1", "run-1", deps);
    expect(result!.items[0].errorCode).toBe("UNKNOWN");
    expect(result!.items[0].errorMessage).toBe("Something went wrong");
  });

  it("includes task title for each item", async () => {
    const deps = createMockDeps({
      getRun: vi.fn().mockResolvedValue({ id: "run-1", status: "completed", projectId: "p1" }),
      getAttemptsByRunId: vi.fn().mockResolvedValue([
        { id: "a1", taskId: "t1", status: "completed" },
      ]),
      getTasksByIds: vi.fn().mockResolvedValue([{ id: "t1", title: "My Important Task" }]),
    });
    const result = await getFactoryRunResults("p1", "run-1", deps);
    expect(result!.items[0].taskTitle).toBe("My Important Task");
  });
});
