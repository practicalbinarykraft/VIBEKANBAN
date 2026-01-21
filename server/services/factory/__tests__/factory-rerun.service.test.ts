/** Factory Rerun Service Tests (PR-93) - TDD */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildRerunTaskIdsFromRun,
  startFactoryRerun,
  type FactoryRerunDeps,
  type RerunMode,
} from "../factory-rerun.service";

describe("buildRerunTaskIdsFromRun", () => {
  const createMockDeps = (attempts: Array<{ taskId: string; status: string; updatedAt: Date }>): FactoryRerunDeps => ({
    getAttemptsByRunId: vi.fn().mockResolvedValue(attempts),
    startBatch: vi.fn().mockResolvedValue({ ok: true, runId: "new-run-1" }),
  });

  it("returns failed tasks only when mode=failed", async () => {
    const deps = createMockDeps([
      { taskId: "task-1", status: "completed", updatedAt: new Date("2024-01-01T10:00:00Z") },
      { taskId: "task-2", status: "failed", updatedAt: new Date("2024-01-01T10:01:00Z") },
      { taskId: "task-3", status: "failed", updatedAt: new Date("2024-01-01T10:02:00Z") },
    ]);
    const result = await buildRerunTaskIdsFromRun({ runId: "run-1", mode: "failed" }, deps);
    expect(result).toEqual(["task-2", "task-3"]);
  });

  it("returns only selected taskIds when mode=selected", async () => {
    const deps = createMockDeps([
      { taskId: "task-1", status: "completed", updatedAt: new Date("2024-01-01T10:00:00Z") },
      { taskId: "task-2", status: "failed", updatedAt: new Date("2024-01-01T10:01:00Z") },
      { taskId: "task-3", status: "completed", updatedAt: new Date("2024-01-01T10:02:00Z") },
    ]);
    const result = await buildRerunTaskIdsFromRun(
      { runId: "run-1", mode: "selected", selectedTaskIds: ["task-1", "task-3"] },
      deps
    );
    expect(result).toEqual(["task-1", "task-3"]);
  });

  it("dedupes by taskId and uses latest attempt status", async () => {
    const deps = createMockDeps([
      { taskId: "task-1", status: "failed", updatedAt: new Date("2024-01-01T10:00:00Z") },
      { taskId: "task-1", status: "completed", updatedAt: new Date("2024-01-01T11:00:00Z") }, // later, completed
      { taskId: "task-2", status: "completed", updatedAt: new Date("2024-01-01T10:00:00Z") },
      { taskId: "task-2", status: "failed", updatedAt: new Date("2024-01-01T11:00:00Z") }, // later, failed
    ]);
    const result = await buildRerunTaskIdsFromRun({ runId: "run-1", mode: "failed" }, deps);
    // task-1 latest is completed, task-2 latest is failed
    expect(result).toEqual(["task-2"]);
  });

  it("does NOT include cancelled attempts in failed mode", async () => {
    const deps = createMockDeps([
      { taskId: "task-1", status: "cancelled", updatedAt: new Date("2024-01-01T10:00:00Z") },
      { taskId: "task-2", status: "stopped", updatedAt: new Date("2024-01-01T10:01:00Z") },
      { taskId: "task-3", status: "failed", updatedAt: new Date("2024-01-01T10:02:00Z") },
    ]);
    const result = await buildRerunTaskIdsFromRun({ runId: "run-1", mode: "failed" }, deps);
    expect(result).toEqual(["task-3"]);
  });

  it("returns empty array if no matching tasks", async () => {
    const deps = createMockDeps([
      { taskId: "task-1", status: "completed", updatedAt: new Date("2024-01-01T10:00:00Z") },
    ]);
    const result = await buildRerunTaskIdsFromRun({ runId: "run-1", mode: "failed" }, deps);
    expect(result).toEqual([]);
  });

  it("filters selected taskIds to only those in run", async () => {
    const deps = createMockDeps([
      { taskId: "task-1", status: "completed", updatedAt: new Date("2024-01-01T10:00:00Z") },
      { taskId: "task-2", status: "failed", updatedAt: new Date("2024-01-01T10:01:00Z") },
    ]);
    const result = await buildRerunTaskIdsFromRun(
      { runId: "run-1", mode: "selected", selectedTaskIds: ["task-1", "task-99"] },
      deps
    );
    // task-99 not in run, should be filtered out
    expect(result).toEqual(["task-1"]);
  });
});

describe("startFactoryRerun", () => {
  const createMockDeps = (
    attempts: Array<{ taskId: string; status: string; updatedAt: Date }>,
    startResult: { ok: true; runId: string; taskCount: number } | { ok: false; error: string } = { ok: true, runId: "new-run-1", taskCount: 2 }
  ): FactoryRerunDeps => ({
    getAttemptsByRunId: vi.fn().mockResolvedValue(attempts),
    startBatch: vi.fn().mockResolvedValue(startResult),
  });

  it("starts batch with failed taskIds when mode=failed", async () => {
    const deps = createMockDeps([
      { taskId: "task-1", status: "failed", updatedAt: new Date("2024-01-01T10:00:00Z") },
      { taskId: "task-2", status: "failed", updatedAt: new Date("2024-01-01T10:01:00Z") },
    ]);
    const result = await startFactoryRerun(
      { projectId: "proj-1", sourceRunId: "run-1", mode: "failed", maxParallel: 3 },
      deps
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.newRunId).toBe("new-run-1");
      expect(result.taskCount).toBe(2);
    }
    expect(deps.startBatch).toHaveBeenCalledWith({
      projectId: "proj-1",
      taskIds: ["task-1", "task-2"],
      maxParallel: 3,
    });
  });

  it("returns NO_TASKS_TO_RERUN error when no tasks match", async () => {
    const deps = createMockDeps([
      { taskId: "task-1", status: "completed", updatedAt: new Date("2024-01-01T10:00:00Z") },
    ]);
    const result = await startFactoryRerun(
      { projectId: "proj-1", sourceRunId: "run-1", mode: "failed", maxParallel: 3 },
      deps
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("NO_TASKS_TO_RERUN");
    }
  });

  it("clamps maxParallel to 1-20 range", async () => {
    const deps = createMockDeps([
      { taskId: "task-1", status: "failed", updatedAt: new Date("2024-01-01T10:00:00Z") },
    ]);

    // Test max clamp
    await startFactoryRerun(
      { projectId: "proj-1", sourceRunId: "run-1", mode: "failed", maxParallel: 50 },
      deps
    );
    expect(deps.startBatch).toHaveBeenCalledWith(expect.objectContaining({ maxParallel: 20 }));

    vi.clearAllMocks();

    // Test min clamp
    await startFactoryRerun(
      { projectId: "proj-1", sourceRunId: "run-1", mode: "failed", maxParallel: 0 },
      deps
    );
    expect(deps.startBatch).toHaveBeenCalledWith(expect.objectContaining({ maxParallel: 1 }));
  });

  it("passes through startBatch errors", async () => {
    const deps = createMockDeps(
      [{ taskId: "task-1", status: "failed", updatedAt: new Date("2024-01-01T10:00:00Z") }],
      { ok: false as const, error: "BUDGET_EXCEEDED" }
    );
    const result = await startFactoryRerun(
      { projectId: "proj-1", sourceRunId: "run-1", mode: "failed", maxParallel: 3 },
      deps
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("BUDGET_EXCEEDED");
    }
  });

  it("starts batch with selected taskIds when mode=selected", async () => {
    const deps = createMockDeps([
      { taskId: "task-1", status: "completed", updatedAt: new Date("2024-01-01T10:00:00Z") },
      { taskId: "task-2", status: "failed", updatedAt: new Date("2024-01-01T10:01:00Z") },
      { taskId: "task-3", status: "completed", updatedAt: new Date("2024-01-01T10:02:00Z") },
    ]);
    const result = await startFactoryRerun(
      {
        projectId: "proj-1",
        sourceRunId: "run-1",
        mode: "selected",
        selectedTaskIds: ["task-1", "task-3"],
        maxParallel: 2,
      },
      deps
    );
    expect(result.ok).toBe(true);
    expect(deps.startBatch).toHaveBeenCalledWith({
      projectId: "proj-1",
      taskIds: ["task-1", "task-3"],
      maxParallel: 2,
    });
  });
});
