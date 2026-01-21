/** factory-runs.service tests (PR-91) - TDD */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createFactoryRun,
  finishFactoryRun,
  getFactoryRun,
  listFactoryRuns,
  countAttemptsByRun,
  type FactoryRunsDeps,
} from "../factory-runs.service";

function createMockDeps(overrides: Partial<FactoryRunsDeps> = {}): FactoryRunsDeps {
  return {
    insertRun: vi.fn().mockResolvedValue("run-1"),
    updateRun: vi.fn().mockResolvedValue(true),
    getRun: vi.fn().mockResolvedValue(null),
    listRuns: vi.fn().mockResolvedValue([]),
    getAttemptsByRunId: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

describe("createFactoryRun", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates run with correct params", async () => {
    const insertRun = vi.fn().mockResolvedValue("run-123");
    const deps = createMockDeps({ insertRun });

    const result = await createFactoryRun({
      projectId: "p1",
      mode: "selection",
      maxParallel: 3,
      selectedTaskIds: ["t1", "t2"],
    }, deps);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.runId).toBe("run-123");
    }
    expect(insertRun).toHaveBeenCalledWith(expect.objectContaining({
      projectId: "p1",
      mode: "selection",
      maxParallel: 3,
      selectedTaskIds: JSON.stringify(["t1", "t2"]),
      status: "running",
    }));
  });

  it("creates column mode run", async () => {
    const insertRun = vi.fn().mockResolvedValue("run-456");
    const deps = createMockDeps({ insertRun });

    const result = await createFactoryRun({
      projectId: "p1",
      mode: "column",
      maxParallel: 2,
      columnId: "todo",
    }, deps);

    expect(result.ok).toBe(true);
    expect(insertRun).toHaveBeenCalledWith(expect.objectContaining({
      mode: "column",
      columnId: "todo",
      selectedTaskIds: null,
    }));
  });
});

describe("finishFactoryRun", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates status and finishedAt", async () => {
    const updateRun = vi.fn().mockResolvedValue(true);
    const deps = createMockDeps({ updateRun });

    const result = await finishFactoryRun("run-1", "completed", undefined, deps);

    expect(result.ok).toBe(true);
    expect(updateRun).toHaveBeenCalledWith("run-1", expect.objectContaining({
      status: "completed",
      finishedAt: expect.any(Date),
    }));
  });

  it("includes error when provided", async () => {
    const updateRun = vi.fn().mockResolvedValue(true);
    const deps = createMockDeps({ updateRun });

    await finishFactoryRun("run-1", "failed", "Worker crashed", deps);

    expect(updateRun).toHaveBeenCalledWith("run-1", expect.objectContaining({
      status: "failed",
      error: "Worker crashed",
    }));
  });
});

describe("getFactoryRun", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns run with counts", async () => {
    const deps = createMockDeps({
      getRun: vi.fn().mockResolvedValue({
        id: "run-1",
        projectId: "p1",
        status: "completed",
        mode: "selection",
        maxParallel: 2,
        selectedTaskIds: '["t1","t2"]',
        columnId: null,
        startedAt: new Date("2026-01-20T10:00:00Z"),
        finishedAt: new Date("2026-01-20T11:00:00Z"),
        error: null,
      }),
      getAttemptsByRunId: vi.fn().mockResolvedValue([
        { id: "a1", status: "completed", taskId: "t1", prUrl: null, updatedAt: new Date() },
        { id: "a2", status: "failed", taskId: "t2", prUrl: "https://pr/1", updatedAt: new Date() },
      ]),
    });

    const result = await getFactoryRun("run-1", deps);

    expect(result.run).not.toBeNull();
    expect(result.run?.id).toBe("run-1");
    expect(result.run?.counts).toEqual({
      total: 2,
      completed: 1,
      failed: 1,
      running: 0,
      queued: 0,
    });
    expect(result.run?.attempts).toHaveLength(2);
  });

  it("returns null when run not found", async () => {
    const deps = createMockDeps({ getRun: vi.fn().mockResolvedValue(null) });
    const result = await getFactoryRun("not-found", deps);
    expect(result.run).toBeNull();
  });
});

describe("listFactoryRuns", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns sorted runs desc by startedAt", async () => {
    const deps = createMockDeps({
      listRuns: vi.fn().mockResolvedValue([
        { id: "run-2", projectId: "p1", status: "completed", startedAt: new Date("2026-01-20T12:00:00Z") },
        { id: "run-1", projectId: "p1", status: "running", startedAt: new Date("2026-01-20T10:00:00Z") },
      ]),
    });

    const result = await listFactoryRuns("p1", 20, deps);

    expect(result.runs).toHaveLength(2);
    expect(result.runs[0].id).toBe("run-2");
  });
});

describe("countAttemptsByRun", () => {
  beforeEach(() => vi.clearAllMocks());

  it("counts attempts by status", async () => {
    const deps = createMockDeps({
      getAttemptsByRunId: vi.fn().mockResolvedValue([
        { status: "completed" },
        { status: "completed" },
        { status: "failed" },
        { status: "running" },
        { status: "queued" },
      ]),
    });

    const result = await countAttemptsByRun("run-1", deps);

    expect(result).toEqual({
      total: 5,
      completed: 2,
      failed: 1,
      running: 1,
      queued: 1,
    });
  });
});
