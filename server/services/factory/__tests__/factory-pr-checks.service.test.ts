/** Factory PR Checks Service Tests (PR-98) - TDD first */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getPrCheckStatus,
  getRunPrChecks,
  type FactoryPrChecksDeps,
  type PrCheckStatus,
  type FactoryPrCheckSnapshot,
} from "../factory-pr-checks.service";

const createMockDeps = (overrides: Partial<FactoryPrChecksDeps> = {}): FactoryPrChecksDeps => ({
  fetchCheckRuns: vi.fn().mockResolvedValue({
    total_count: 2,
    check_runs: [
      { id: 1, name: "build", status: "completed", conclusion: "success" },
      { id: 2, name: "test", status: "completed", conclusion: "success" },
    ],
  }),
  getAttemptsByRunId: vi.fn().mockResolvedValue([
    { id: "a1", taskId: "t1", prUrl: "https://github.com/org/repo/pull/1", headCommit: "abc123" },
    { id: "a2", taskId: "t2", prUrl: "https://github.com/org/repo/pull/2", headCommit: "def456" },
  ]),
  parseRepoFromUrl: vi.fn().mockReturnValue({ owner: "org", repo: "repo" }),
  ...overrides,
});

describe("getPrCheckStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 1: all checks success → "success"
  it("returns success when all checks pass", async () => {
    const deps = createMockDeps();
    const result = await getPrCheckStatus(deps, "https://github.com/org/repo/pull/1", "abc123");

    expect(result).toBe("success");
  });

  // Test 2: any check failed → "failed"
  it("returns failed when any check fails", async () => {
    const deps = createMockDeps({
      fetchCheckRuns: vi.fn().mockResolvedValue({
        total_count: 2,
        check_runs: [
          { id: 1, name: "build", status: "completed", conclusion: "success" },
          { id: 2, name: "test", status: "completed", conclusion: "failure" },
        ],
      }),
    });

    const result = await getPrCheckStatus(deps, "https://github.com/org/repo/pull/1", "abc123");
    expect(result).toBe("failed");
  });

  // Test 3: any check in_progress → "pending"
  it("returns pending when any check is in progress", async () => {
    const deps = createMockDeps({
      fetchCheckRuns: vi.fn().mockResolvedValue({
        total_count: 2,
        check_runs: [
          { id: 1, name: "build", status: "completed", conclusion: "success" },
          { id: 2, name: "test", status: "in_progress", conclusion: null },
        ],
      }),
    });

    const result = await getPrCheckStatus(deps, "https://github.com/org/repo/pull/1", "abc123");
    expect(result).toBe("pending");
  });

  // Test 4: any check queued → "pending"
  it("returns pending when any check is queued", async () => {
    const deps = createMockDeps({
      fetchCheckRuns: vi.fn().mockResolvedValue({
        total_count: 1,
        check_runs: [{ id: 1, name: "build", status: "queued", conclusion: null }],
      }),
    });

    const result = await getPrCheckStatus(deps, "https://github.com/org/repo/pull/1", "abc123");
    expect(result).toBe("pending");
  });

  // Test 5: check cancelled → "cancelled"
  it("returns cancelled when check is cancelled", async () => {
    const deps = createMockDeps({
      fetchCheckRuns: vi.fn().mockResolvedValue({
        total_count: 1,
        check_runs: [{ id: 1, name: "build", status: "completed", conclusion: "cancelled" }],
      }),
    });

    const result = await getPrCheckStatus(deps, "https://github.com/org/repo/pull/1", "abc123");
    expect(result).toBe("cancelled");
  });

  // Test 6: no checks → "pending" (waiting for CI to start)
  it("returns pending when no checks exist yet", async () => {
    const deps = createMockDeps({
      fetchCheckRuns: vi.fn().mockResolvedValue({ total_count: 0, check_runs: [] }),
    });

    const result = await getPrCheckStatus(deps, "https://github.com/org/repo/pull/1", "abc123");
    expect(result).toBe("pending");
  });

  // Test 7: gh error → "failed"
  it("returns failed when gh API throws error", async () => {
    const deps = createMockDeps({
      fetchCheckRuns: vi.fn().mockRejectedValue(new Error("gh: command not found")),
    });

    const result = await getPrCheckStatus(deps, "https://github.com/org/repo/pull/1", "abc123");
    expect(result).toBe("failed");
  });

  // Test 8: skipped conclusion → treat as success
  it("returns success when check is skipped", async () => {
    const deps = createMockDeps({
      fetchCheckRuns: vi.fn().mockResolvedValue({
        total_count: 1,
        check_runs: [{ id: 1, name: "optional", status: "completed", conclusion: "skipped" }],
      }),
    });

    const result = await getPrCheckStatus(deps, "https://github.com/org/repo/pull/1", "abc123");
    expect(result).toBe("success");
  });
});

describe("getRunPrChecks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 9: returns checks for all attempts with PRs
  it("returns check snapshots for all attempts with PRs", async () => {
    const deps = createMockDeps();
    const result = await getRunPrChecks(deps, "run-1");

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      taskId: "t1",
      prUrl: "https://github.com/org/repo/pull/1",
      status: "success",
    });
    expect(result[1]).toMatchObject({
      taskId: "t2",
      prUrl: "https://github.com/org/repo/pull/2",
      status: "success",
    });
  });

  // Test 10: skips attempts without prUrl
  it("skips attempts without prUrl", async () => {
    const deps = createMockDeps({
      getAttemptsByRunId: vi.fn().mockResolvedValue([
        { id: "a1", taskId: "t1", prUrl: "https://github.com/org/repo/pull/1", headCommit: "abc123" },
        { id: "a2", taskId: "t2", prUrl: null, headCommit: "def456" },
      ]),
    });

    const result = await getRunPrChecks(deps, "run-1");
    expect(result).toHaveLength(1);
  });

  // Test 11: handles empty attempts list
  it("returns empty array when no attempts", async () => {
    const deps = createMockDeps({
      getAttemptsByRunId: vi.fn().mockResolvedValue([]),
    });

    const result = await getRunPrChecks(deps, "run-1");
    expect(result).toEqual([]);
  });

  // Test 12: includes updatedAt timestamp
  it("includes updatedAt timestamp in snapshots", async () => {
    const deps = createMockDeps();
    const before = new Date();
    const result = await getRunPrChecks(deps, "run-1");
    const after = new Date();

    expect(result[0].updatedAt).toBeInstanceOf(Date);
    expect(result[0].updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(result[0].updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });
});
