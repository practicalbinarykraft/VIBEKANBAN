/** Factory Run Details Service Tests (PR-102) - TDD */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getRunDetails,
  type RunDetailsDeps,
  type RunDetailsResult,
  type RunItemStatus,
} from "../factory-run-details.service";

function createMockDeps(overrides: Partial<RunDetailsDeps> = {}): RunDetailsDeps {
  return {
    getRun: vi.fn().mockResolvedValue(null),
    getRunItems: vi.fn().mockResolvedValue([]),
    getPrCiStatus: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

const mockRun = {
  id: "run-1",
  projectId: "proj-1",
  status: "running" as const,
  maxParallel: 5,
  startedAt: new Date("2024-01-01T10:00:00Z"),
  finishedAt: null,
};

const mockItems = [
  {
    taskId: "task-1",
    taskTitle: "PR-101: Add feature",
    attemptId: "attempt-1",
    attemptStatus: "running" as RunItemStatus,
    branchName: "feat/pr-101",
    prUrl: "https://github.com/org/repo/pull/101",
    headCommit: "abc123",
  },
  {
    taskId: "task-2",
    taskTitle: "PR-102: Fix bug",
    attemptId: "attempt-2",
    attemptStatus: "completed" as RunItemStatus,
    branchName: "fix/pr-102",
    prUrl: "https://github.com/org/repo/pull/102",
    headCommit: "def456",
  },
  {
    taskId: "task-3",
    taskTitle: "PR-103: Refactor",
    attemptId: "attempt-3",
    attemptStatus: "queued" as RunItemStatus,
    branchName: null,
    prUrl: null,
    headCommit: null,
  },
];

describe("factory-run-details.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when run not found", async () => {
    const deps = createMockDeps({ getRun: vi.fn().mockResolvedValue(null) });
    const result = await getRunDetails("run-1", deps);
    expect(result).toBeNull();
  });

  it("returns run info with correct structure", async () => {
    const deps = createMockDeps({
      getRun: vi.fn().mockResolvedValue(mockRun),
      getRunItems: vi.fn().mockResolvedValue([]),
    });

    const result = await getRunDetails("run-1", deps);

    expect(result).not.toBeNull();
    expect(result!.run.id).toBe("run-1");
    expect(result!.run.status).toBe("running");
    expect(result!.run.maxParallel).toBe(5);
  });

  it("calculates counts correctly", async () => {
    const deps = createMockDeps({
      getRun: vi.fn().mockResolvedValue(mockRun),
      getRunItems: vi.fn().mockResolvedValue(mockItems),
    });

    const result = await getRunDetails("run-1", deps);

    expect(result!.counts.total).toBe(3);
    expect(result!.counts.running).toBe(1);
    expect(result!.counts.completed).toBe(1);
    expect(result!.counts.queued).toBe(1);
    expect(result!.counts.failed).toBe(0);
  });

  it("includes items with task info", async () => {
    const deps = createMockDeps({
      getRun: vi.fn().mockResolvedValue(mockRun),
      getRunItems: vi.fn().mockResolvedValue(mockItems),
    });

    const result = await getRunDetails("run-1", deps);

    expect(result!.items).toHaveLength(3);
    expect(result!.items[0].taskTitle).toBe("PR-101: Add feature");
    expect(result!.items[0].branchName).toBe("feat/pr-101");
  });

  it("includes prUrl when present", async () => {
    const deps = createMockDeps({
      getRun: vi.fn().mockResolvedValue(mockRun),
      getRunItems: vi.fn().mockResolvedValue(mockItems),
    });

    const result = await getRunDetails("run-1", deps);

    const withPr = result!.items.find((i) => i.taskId === "task-1");
    const withoutPr = result!.items.find((i) => i.taskId === "task-3");
    expect(withPr?.prUrl).toBe("https://github.com/org/repo/pull/101");
    expect(withoutPr?.prUrl).toBeNull();
  });

  it("fetches CI status for items with PR", async () => {
    const getPrCiStatus = vi.fn().mockResolvedValue({ status: "success", summary: "4/4 checks" });
    const deps = createMockDeps({
      getRun: vi.fn().mockResolvedValue(mockRun),
      getRunItems: vi.fn().mockResolvedValue(mockItems),
      getPrCiStatus,
    });

    const result = await getRunDetails("run-1", deps);

    expect(getPrCiStatus).toHaveBeenCalledTimes(2); // Only 2 items have PR
    expect(result!.items[0].ci).toEqual({ status: "success", summary: "4/4 checks" });
  });

  it("returns null ci for items without PR", async () => {
    const deps = createMockDeps({
      getRun: vi.fn().mockResolvedValue(mockRun),
      getRunItems: vi.fn().mockResolvedValue(mockItems),
      getPrCiStatus: vi.fn().mockResolvedValue({ status: "pending", summary: "0/4" }),
    });

    const result = await getRunDetails("run-1", deps);

    const withoutPr = result!.items.find((i) => i.taskId === "task-3");
    expect(withoutPr?.ci).toBeNull(); // No PR, no CI
  });

  it("sorts items by status priority (running > queued > completed > failed)", async () => {
    const mixedItems = [
      { ...mockItems[1], attemptStatus: "completed" as RunItemStatus },
      { ...mockItems[0], attemptStatus: "running" as RunItemStatus },
      { ...mockItems[2], taskId: "task-4", attemptStatus: "failed" as RunItemStatus },
      { ...mockItems[2], attemptStatus: "queued" as RunItemStatus },
    ];
    const deps = createMockDeps({
      getRun: vi.fn().mockResolvedValue(mockRun),
      getRunItems: vi.fn().mockResolvedValue(mixedItems),
    });

    const result = await getRunDetails("run-1", deps);

    expect(result!.items[0].attemptStatus).toBe("running");
    expect(result!.items[1].attemptStatus).toBe("queued");
    expect(result!.items[2].attemptStatus).toBe("completed");
    expect(result!.items[3].attemptStatus).toBe("failed");
  });

  it("handles getPrCiStatus errors gracefully", async () => {
    const deps = createMockDeps({
      getRun: vi.fn().mockResolvedValue(mockRun),
      getRunItems: vi.fn().mockResolvedValue([mockItems[0]]),
      getPrCiStatus: vi.fn().mockRejectedValue(new Error("API error")),
    });

    const result = await getRunDetails("run-1", deps);

    expect(result!.items[0].ci).toBeNull(); // Graceful fallback
  });
});
