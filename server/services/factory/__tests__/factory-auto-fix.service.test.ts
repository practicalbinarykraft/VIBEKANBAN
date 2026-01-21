/** Factory Auto-Fix Service Tests (PR-99) - TDD */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  runAutoFix,
  type AutoFixResult,
  type AutoFixDeps,
  type PrWithCiStatus,
} from "../factory-auto-fix.service";

function createMockDeps(overrides: Partial<AutoFixDeps> = {}): AutoFixDeps {
  return {
    getPrsWithCiStatus: vi.fn().mockResolvedValue([]),
    hasAutofixAttempt: vi.fn().mockResolvedValue(false),
    recordAutofixAttempt: vi.fn().mockResolvedValue(undefined),
    runAutofixAttempt: vi.fn().mockResolvedValue({ success: false, logs: "" }),
    saveAutofixReport: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

const mockFailedPr: PrWithCiStatus = {
  taskId: "task-1",
  attemptId: "attempt-1",
  prUrl: "https://github.com/org/repo/pull/1",
  commitSha: "abc123",
  ciStatus: "failed",
  branchName: "fix/task-1",
};

const mockSuccessPr: PrWithCiStatus = {
  ...mockFailedPr,
  taskId: "task-2",
  prUrl: "https://github.com/org/repo/pull/2",
  ciStatus: "success",
};

const mockPendingPr: PrWithCiStatus = {
  ...mockFailedPr,
  taskId: "task-3",
  prUrl: "https://github.com/org/repo/pull/3",
  ciStatus: "pending",
};

describe("factory-auto-fix.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips PR if CI status is not failed", async () => {
    const deps = createMockDeps({
      getPrsWithCiStatus: vi.fn().mockResolvedValue([mockSuccessPr]),
    });

    const results = await runAutoFix("run-1", deps);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      prUrl: mockSuccessPr.prUrl,
      action: "skipped",
      reason: "not_failed",
    });
    expect(deps.runAutofixAttempt).not.toHaveBeenCalled();
  });

  it("skips PR if already has autofix attempt (anti-loop)", async () => {
    const deps = createMockDeps({
      getPrsWithCiStatus: vi.fn().mockResolvedValue([mockFailedPr]),
      hasAutofixAttempt: vi.fn().mockResolvedValue(true),
    });

    const results = await runAutoFix("run-1", deps);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      prUrl: mockFailedPr.prUrl,
      action: "skipped",
      reason: "already_fixed",
    });
    expect(deps.runAutofixAttempt).not.toHaveBeenCalled();
  });

  it("runs autofix for failed PR without previous attempt", async () => {
    const deps = createMockDeps({
      getPrsWithCiStatus: vi.fn().mockResolvedValue([mockFailedPr]),
      hasAutofixAttempt: vi.fn().mockResolvedValue(false),
      runAutofixAttempt: vi.fn().mockResolvedValue({ success: true, logs: "Tests passed" }),
    });

    const results = await runAutoFix("run-1", deps);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      prUrl: mockFailedPr.prUrl,
      action: "fixed",
    });
    expect(deps.runAutofixAttempt).toHaveBeenCalledWith(mockFailedPr);
  });

  it("records autofix attempt after running", async () => {
    const deps = createMockDeps({
      getPrsWithCiStatus: vi.fn().mockResolvedValue([mockFailedPr]),
      runAutofixAttempt: vi.fn().mockResolvedValue({ success: false, logs: "Build failed" }),
    });

    await runAutoFix("run-1", deps);

    expect(deps.recordAutofixAttempt).toHaveBeenCalledWith(
      "run-1",
      mockFailedPr.prUrl,
      "failed",
      expect.any(String)
    );
  });

  it("saves autofix report artifact", async () => {
    const deps = createMockDeps({
      getPrsWithCiStatus: vi.fn().mockResolvedValue([mockFailedPr]),
      runAutofixAttempt: vi.fn().mockResolvedValue({ success: false, logs: "npm test failed\nError at line 42" }),
    });

    await runAutoFix("run-1", deps);

    expect(deps.saveAutofixReport).toHaveBeenCalledWith(
      mockFailedPr.attemptId,
      expect.objectContaining({
        prUrl: mockFailedPr.prUrl,
        runId: "run-1",
        logs: expect.stringContaining("npm test failed"),
      })
    );
  });

  it("returns failed action when runner fails", async () => {
    const deps = createMockDeps({
      getPrsWithCiStatus: vi.fn().mockResolvedValue([mockFailedPr]),
      runAutofixAttempt: vi.fn().mockResolvedValue({ success: false, logs: "Error" }),
    });

    const results = await runAutoFix("run-1", deps);

    expect(results[0]).toEqual({
      prUrl: mockFailedPr.prUrl,
      action: "failed",
      reason: "error",
    });
  });

  it("handles runner exception gracefully", async () => {
    const deps = createMockDeps({
      getPrsWithCiStatus: vi.fn().mockResolvedValue([mockFailedPr]),
      runAutofixAttempt: vi.fn().mockRejectedValue(new Error("Network error")),
    });

    const results = await runAutoFix("run-1", deps);

    expect(results[0]).toEqual({
      prUrl: mockFailedPr.prUrl,
      action: "failed",
      reason: "error",
    });
    expect(deps.recordAutofixAttempt).toHaveBeenCalledWith(
      "run-1",
      mockFailedPr.prUrl,
      "failed",
      "Network error"
    );
  });

  it("processes multiple PRs in a run", async () => {
    const deps = createMockDeps({
      getPrsWithCiStatus: vi.fn().mockResolvedValue([mockFailedPr, mockSuccessPr, mockPendingPr]),
      runAutofixAttempt: vi.fn().mockResolvedValue({ success: false, logs: "" }),
    });

    const results = await runAutoFix("run-1", deps);

    expect(results).toHaveLength(3);
    expect(results.find((r) => r.prUrl === mockFailedPr.prUrl)?.action).toBe("failed");
    expect(results.find((r) => r.prUrl === mockSuccessPr.prUrl)?.action).toBe("skipped");
    expect(results.find((r) => r.prUrl === mockPendingPr.prUrl)?.action).toBe("skipped");
  });

  it("returns empty array when no PRs in run", async () => {
    const deps = createMockDeps({
      getPrsWithCiStatus: vi.fn().mockResolvedValue([]),
    });

    const results = await runAutoFix("run-1", deps);

    expect(results).toEqual([]);
  });

  it("skips PR without prUrl", async () => {
    const prWithoutUrl: PrWithCiStatus = {
      ...mockFailedPr,
      prUrl: null as any,
    };
    const deps = createMockDeps({
      getPrsWithCiStatus: vi.fn().mockResolvedValue([prWithoutUrl]),
    });

    const results = await runAutoFix("run-1", deps);

    expect(results[0]).toEqual({
      prUrl: null,
      action: "skipped",
      reason: "no_pr",
    });
  });
});
